#!/usr/bin/env node
/**
 * Bundle keyring script.
 *
 * Copies @napi-rs/keyring and its platform-specific native binaries from the
 * development node_modules into runtime-deps/keyring/node_modules/ so that
 * end users receive a working keychain integration via plain `git clone`
 * (Claude Code's plugin installer does not run `npm install`).
 *
 * Usage:
 *   node scripts/bundle-keyring.mjs          # refresh from current node_modules
 *   node scripts/bundle-keyring.mjs --check  # verify bundle completeness, exit 0/1
 *
 * Platforms the bundle should cover (full list):
 *   - @napi-rs/keyring-win32-x64-msvc
 *   - @napi-rs/keyring-darwin-x64
 *   - @napi-rs/keyring-darwin-arm64
 *   - @napi-rs/keyring-linux-x64-gnu
 *
 * Each platform binary must be installed locally BEFORE running this script.
 * On Windows, only keyring-win32-x64-msvc is installed by a plain
 * `npm install`. To fetch the others:
 *
 *   npm install --no-save @napi-rs/keyring-darwin-x64 \
 *     @napi-rs/keyring-darwin-arm64 @napi-rs/keyring-linux-x64-gnu --force
 *
 * (The --force is required because each sub-package declares a specific
 * os/cpu combination and npm would otherwise skip non-matching ones.)
 */

import { existsSync, rmSync, cpSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC_NAPI = join(ROOT, 'node_modules', '@napi-rs');
const DST_NAPI = join(ROOT, 'runtime-deps', 'keyring', 'node_modules', '@napi-rs');

const REQUIRED_CORE = 'keyring';
const PLATFORMS = [
  'keyring-win32-x64-msvc',
  'keyring-darwin-x64',
  'keyring-darwin-arm64',
  'keyring-linux-x64-gnu',
];

const mode = process.argv.includes('--check') ? 'check' : 'bundle';

function has(pkg) {
  return existsSync(join(SRC_NAPI, pkg));
}
function hasBundled(pkg) {
  return existsSync(join(DST_NAPI, pkg));
}

if (mode === 'check') {
  const missing = [];
  if (!hasBundled(REQUIRED_CORE)) missing.push(REQUIRED_CORE);
  for (const p of PLATFORMS) {
    if (!hasBundled(p)) missing.push(p);
  }
  if (missing.length === 0) {
    console.log('[bundle-keyring] Bundle OK — all packages present.');
    process.exit(0);
  }
  console.error(`[bundle-keyring] Bundle INCOMPLETE — missing: ${missing.join(', ')}`);
  console.error('[bundle-keyring] Fix: npm install --no-save --force <missing> && node scripts/bundle-keyring.mjs');
  process.exit(1);
}

if (!existsSync(SRC_NAPI)) {
  console.error(`[bundle-keyring] Source not found: ${SRC_NAPI}`);
  console.error('[bundle-keyring] Run `npm install` in the plugin root first.');
  process.exit(1);
}

mkdirSync(DST_NAPI, { recursive: true });

function copyPackage(pkg, { required }) {
  const src = join(SRC_NAPI, pkg);
  const dst = join(DST_NAPI, pkg);
  if (!has(pkg)) {
    if (required) {
      console.error(`[bundle-keyring] MISSING required package: ${pkg}`);
      process.exit(2);
    }
    console.warn(`[bundle-keyring] skip (not installed): ${pkg}`);
    return false;
  }
  if (existsSync(dst)) rmSync(dst, { recursive: true, force: true });
  cpSync(src, dst, { recursive: true, dereference: true });
  console.log(`[bundle-keyring] copied: ${pkg}`);
  return true;
}

copyPackage(REQUIRED_CORE, { required: true });
let platformsCopied = 0;
for (const p of PLATFORMS) {
  if (copyPackage(p, { required: false })) platformsCopied += 1;
}

if (platformsCopied === 0) {
  console.error('[bundle-keyring] ERROR: no platform binaries copied — bundle would be useless');
  process.exit(3);
}

if (platformsCopied < PLATFORMS.length) {
  console.warn(
    `[bundle-keyring] WARNING: ${platformsCopied}/${PLATFORMS.length} platforms bundled. ` +
      `Missing platforms will fall back to plaintext at runtime.`,
  );
}

console.log('[bundle-keyring] Done.');
