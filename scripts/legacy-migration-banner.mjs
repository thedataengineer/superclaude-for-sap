#!/usr/bin/env node
/**
 * prism SessionStart hook — Legacy migration banner.
 *
 * Detects the transitional state where a project still uses
 * `<cwd>/.prism/sap.env` as its single-profile config, but multi-profile
 * support is now available. Emits a one-line notice into the session so the
 * user knows migration is available.
 *
 * Detection rule:
 *   needsMigration =
 *     EXISTS <cwd>/.prism/sap.env
 *     AND NOT EXISTS <cwd>/.prism/active-profile.txt
 *     AND (no profiles in $PRISM_HOME_DIR/profiles/)
 *
 * Non-blocking. Silent on any other state (fresh install, already migrated,
 * error reading files). Fires once per session via SessionStart.
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function prismHome() {
  return process.env.PRISM_HOME_DIR || join(homedir(), '.prism');
}

function hasAnyProfile() {
  const dir = join(prismHome(), 'profiles');
  if (!existsSync(dir)) return false;
  try {
    return readdirSync(dir).some((f) => {
      if (f === '.trash') return false;
      try {
        return statSync(join(dir, f)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

function main() {
  const cwd = process.cwd();
  const legacy = join(cwd, '.prism', 'sap.env');
  const pointer = join(cwd, '.prism', 'active-profile.txt');

  const legacyExists = existsSync(legacy);
  const pointerExists = existsSync(pointer);
  const profilesExist = hasAnyProfile();

  const needsMigration = legacyExists && !pointerExists && !profilesExist;
  if (!needsMigration) process.exit(0);

  const message =
    '[prism] 🆕 Multi-environment profiles are now available (Dev / QA / Prod).\n' +
    '         Your project still uses the legacy single-profile .prism/sap.env.\n' +
    '         Run /prism:sap-option to migrate — you choose the alias and tier.\n' +
    '         The original file is kept as sap.env.legacy for rollback.';

  // Claude Code SessionStart hook schema: write a plain message to stdout.
  // Non-fatal — the hook exits 0 regardless.
  process.stdout.write(message);
  process.exit(0);
}

main();
