#!/usr/bin/env node
/**
 * sc4sap PreToolUse hook — Block Forbidden Tables (profile-aware)
 *
 * Intercepts MCP tool calls that would read row data from SAP and checks the
 * target table(s) against `exceptions/table_exception.md`, filtered by the
 * active profile in `.sc4sap/config.json` (`blocklistProfile`).
 *
 * Profiles (accumulative):
 *   - minimal  — PII + credentials only
 *   - standard — minimal + Protected Business Data
 *   - strict   — everything (default)
 *   - custom   — ignore built-in; use `.sc4sap/blocklist-custom.txt` only
 *
 * Any profile additionally honors `.sc4sap/blocklist-extend.txt` (one
 * table name / pattern per line) if present.
 *
 * Failure mode: fails OPEN (allows) on parse/IO errors so a broken file
 * doesn't block legitimate development. L1 (agents) and L2 (CLAUDE.md) still
 * enforce the policy in that case.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOCKLIST_PATH = resolve(__dirname, '..', '..', 'exceptions', 'table_exception.md');

const TIER_ORDER = { minimal: 1, standard: 2, strict: 3 };
const DEFAULT_PROFILE = 'strict';

function resolveProjectConfig() {
  // Look for .sc4sap/config.json walking up from cwd.
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const candidate = resolve(dir, '.sc4sap', 'config.json');
    if (existsSync(candidate)) return { configPath: candidate, projectDir: dir };
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return { configPath: null, projectDir: process.cwd() };
}

function loadProfile(configPath) {
  if (!configPath) return DEFAULT_PROFILE;
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf8'));
    const p = String(raw.blocklistProfile || '').toLowerCase();
    if (p === 'minimal' || p === 'standard' || p === 'strict' || p === 'custom') return p;
  } catch {
    // fall through
  }
  return DEFAULT_PROFILE;
}

/**
 * Parse markdown blocklist. Each H2 carries a tier (`<!-- tier: X -->`) and
 * optionally an action (`<!-- action: deny | warn -->`, default `deny`).
 */
function loadBuiltinBlocklist() {
  const text = readFileSync(BLOCKLIST_PATH, 'utf8');
  const exact = new Map(); // name -> meta { category, tier, action, why }
  const patterns = [];     // { re, category, tier, action, why }

  let currentCategory = 'Protected';
  let currentTier = 'strict';
  let currentAction = 'deny';
  const lines = text.split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trim();

    // H2 heading resets per-section state.
    if (line.startsWith('## ')) {
      currentCategory = line.replace(/^##\s+/, '').trim();
      currentTier = 'strict';
      currentAction = 'deny';
      continue;
    }

    const tierMatch = line.match(/<!--\s*tier:\s*(minimal|standard|strict)\s*-->/i);
    if (tierMatch) {
      currentTier = tierMatch[1].toLowerCase();
      continue;
    }

    const actionMatch = line.match(/<!--\s*action:\s*(deny|warn)\s*-->/i);
    if (actionMatch) {
      currentAction = actionMatch[1].toLowerCase();
      continue;
    }

    if (!line.startsWith('|')) continue;
    if (/^\|\s*-+/.test(line)) continue;
    if (/^\|\s*(Table|Pattern)\s*\|/i.test(line)) continue;

    const cells = line.split('|').map((c) => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
    if (cells.length < 1) continue;

    const rawName = cells[0].replace(/`/g, '').replace(/\*\*/g, '').trim();
    if (!rawName) continue;
    const description = cells[1] || '';
    const why = cells[2] || '';
    const meta = { category: currentCategory, tier: currentTier, action: currentAction, why, description };

    if (rawName.includes('*') || rawName.includes('xxx')) {
      const family = rawName
        .split(/[\s,(]/)[0]
        .replace(/xxx/gi, '[A-Z0-9_]*')
        .replace(/\*/g, '[A-Z0-9_]*');
      try {
        const re = new RegExp(`^${family}$`, 'i');
        patterns.push({ re, ...meta });
      } catch { /* skip */ }
      continue;
    }

    for (const token of rawName.split(/[\/,]/).map((t) => t.trim()).filter(Boolean)) {
      const name = token.toUpperCase();
      if (/^[A-Z0-9_\/]+$/.test(name)) exact.set(name, meta);
    }
  }

  return { exact, patterns };
}

/** Load a plain-text override file (one table/pattern per line). User
 *  entries default to action=deny. */
function loadTextList(path, { category, tier, action = 'deny' }) {
  if (!existsSync(path)) return { exact: new Map(), patterns: [] };
  const exact = new Map();
  const patterns = [];
  try {
    const lines = readFileSync(path, 'utf8').split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.replace(/#.*$/, '').trim();
      if (!line) continue;
      const meta = { category, tier, action, why: 'User-extended blocklist', description: '' };
      if (line.includes('*')) {
        const family = line.replace(/\*/g, '[A-Z0-9_]*');
        try {
          patterns.push({ re: new RegExp(`^${family}$`, 'i'), ...meta });
        } catch { /* skip */ }
      } else {
        exact.set(line.toUpperCase(), meta);
      }
    }
  } catch { /* fail-open */ }
  return { exact, patterns };
}

function filterByProfile(builtin, profile) {
  if (profile === 'custom') return { exact: new Map(), patterns: [] };
  const maxTier = TIER_ORDER[profile] || TIER_ORDER[DEFAULT_PROFILE];
  const exact = new Map();
  const patterns = [];
  for (const [k, meta] of builtin.exact) {
    if ((TIER_ORDER[meta.tier] || 3) <= maxTier) exact.set(k, meta);
  }
  for (const p of builtin.patterns) {
    if ((TIER_ORDER[p.tier] || 3) <= maxTier) patterns.push(p);
  }
  return { exact, patterns };
}

function mergeLists(...lists) {
  const exact = new Map();
  const patterns = [];
  for (const l of lists) {
    for (const [k, v] of l.exact) exact.set(k, v);
    patterns.push(...l.patterns);
  }
  return { exact, patterns };
}

function extractTables(toolName, toolInput) {
  const tables = new Set();
  if (!toolInput || typeof toolInput !== 'object') return tables;
  for (const key of ['table', 'table_name', 'tableName', 'tabname', 'target_table']) {
    if (typeof toolInput[key] === 'string') tables.add(toolInput[key].toUpperCase());
  }
  for (const key of ['sql', 'query', 'sql_query', 'statement']) {
    const sql = toolInput[key];
    if (typeof sql !== 'string') continue;
    const re = /\b(?:FROM|JOIN)\s+([A-Z0-9_\/]+)/gi;
    let m;
    while ((m = re.exec(sql)) !== null) tables.add(m[1].toUpperCase());
  }
  return tables;
}

function matchBlocklist(name, { exact, patterns }) {
  const upper = name.toUpperCase();
  if (exact.has(upper)) return exact.get(upper);
  for (const p of patterns) if (p.re.test(upper)) return p;
  return null;
}

function readStdin() {
  return new Promise((done) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => done(data));
    process.stdin.on('error', () => done(data));
    setTimeout(() => done(data), 1500).unref?.();
  });
}

async function main() {
  const raw = await readStdin();
  if (!raw) process.exit(0);

  let payload;
  try { payload = JSON.parse(raw); } catch { process.exit(0); }

  const toolName = payload.tool_name || payload.toolName || '';
  const toolInput = payload.tool_input || payload.toolInput || payload.arguments || {};
  if (!/GetTableContents|GetSqlQuery/i.test(toolName)) process.exit(0);

  const { configPath, projectDir } = resolveProjectConfig();
  const profile = loadProfile(configPath);

  let builtin;
  try { builtin = loadBuiltinBlocklist(); }
  catch (err) {
    process.stderr.write(`[sc4sap hook] Unable to load blocklist: ${err.message}\n`);
    process.exit(0);
  }

  const filtered = filterByProfile(builtin, profile);
  const extendPath = resolve(projectDir, '.sc4sap', 'blocklist-extend.txt');
  const customPath = resolve(projectDir, '.sc4sap', 'blocklist-custom.txt');
  const extend = loadTextList(extendPath, { category: 'User Extended', tier: 'minimal' });
  const custom = profile === 'custom' ? loadTextList(customPath, { category: 'User Custom', tier: 'minimal' }) : { exact: new Map(), patterns: [] };

  const blocklist = mergeLists(filtered, extend, custom);

  const tables = extractTables(toolName, toolInput);
  const hits = [];
  for (const t of tables) {
    const m = matchBlocklist(t, blocklist);
    if (m) hits.push({ table: t, ...m });
  }
  if (hits.length === 0) process.exit(0);

  const denyHits = hits.filter((h) => (h.action || 'deny') === 'deny');
  const warnHits = hits.filter((h) => h.action === 'warn');

  // deny takes precedence over warn.
  if (denyHits.length > 0) {
    const lines = denyHits.map((h) => `  - ${h.table} — ${h.category}: ${h.why || 'protected'}`).join('\n');
    const reason =
      `sc4sap blocklist (profile: ${profile}) — row extraction denied:\n${lines}\n\n` +
      `See exceptions/table_exception.md and common/data-extraction-policy.md for allowed alternatives ` +
      `(released CDS views, anonymized test data, COUNT/SUM aggregates, or documented one-off approval).\n` +
      `To change scope, run \`/sc4sap:setup\` and reselect the blocklist profile.`;
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }));
    process.exit(0);
  }

  // warn-only: allow but surface to Claude (stderr is relayed to the model).
  const lines = warnHits.map((h) => `  - ${h.table} — ${h.category}: ${h.why || 'sensitive'}`).join('\n');
  const warning =
    `⚠️  sc4sap blocklist WARNING (profile: ${profile}) — sensitive tables accessed:\n${lines}\n` +
    `This category is set to "warn" rather than "deny". Before sharing results, recommend safer alternatives ` +
    `(released CDS view, anonymized test data, COUNT/SUM aggregates) and confirm the user's intent.`;
  process.stderr.write(warning + '\n');
  process.exit(0);
}

main();
