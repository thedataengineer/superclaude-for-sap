#!/usr/bin/env node

/**
 * sc4sap Code Simplifier Stop Hook
 * Intercepts Stop events to suggest code review for recently modified files.
 * Adapted from OMC code-simplifier.mjs.
 *
 * Opt-in via .sc4sap/config.json: { "codeSimplifier": { "enabled": true } }
 * Default: disabled
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { readStdin } from './lib/stdin.mjs';

function readJsonFile(filePath) {
  try {
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function readConfig(directory) {
  // Check project-level config first, then global
  const projectConfig = readJsonFile(join(directory, '.sc4sap', 'config.json'));
  if (projectConfig?.codeSimplifier?.enabled) return projectConfig;

  const globalConfig = readJsonFile(join(homedir(), '.sc4sap', 'config.json'));
  return globalConfig;
}

async function main() {
  try {
    const input = await readStdin();
    let data = {};
    try { data = JSON.parse(input); } catch {}

    const directory = data.cwd || data.directory || process.cwd();
    const config = readConfig(directory);

    if (!config?.codeSimplifier?.enabled) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    // Only suggest simplification, don't auto-execute
    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'Stop',
        additionalContext: '[SC4SAP] Code simplifier is enabled. Consider reviewing recently modified ABAP objects for clean code compliance before releasing transports.'
      }
    }));
  } catch (error) {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
