#!/usr/bin/env node

/**
 * prism Setup Init Hook (SessionStart, matcher: "init")
 * Runs initial setup when a new prism project is initialized.
 * Creates .prism directory structure and default configuration.
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { readStdin } from './lib/stdin.mjs';

async function main() {
  try {
    const input = await readStdin();
    let data = {};
    try { data = JSON.parse(input); } catch {}

    const directory = data.cwd || data.directory || process.cwd();

    // Create .prism directory structure
    const dirs = [
      join(directory, '.prism'),
      join(directory, '.prism', 'state'),
      join(directory, '.prism', 'skills'),
      join(directory, '.prism', 'research'),
      join(directory, '.prism', 'logs'),
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        try { mkdirSync(dir, { recursive: true }); } catch {}
      }
    }

    // Create default notepad if it doesn't exist
    const notepadPath = join(directory, '.prism', 'notepad.md');
    if (!existsSync(notepadPath)) {
      try {
        writeFileSync(notepadPath, `# PRISM Project Notepad

## Priority Context
<!-- High-priority context that survives compaction -->

## Working Memory
<!-- Transient notes from the current work session -->

## SAP Objects
<!-- Track SAP objects being worked on -->

## Transport Requests
<!-- Active transport requests -->
`, { mode: 0o600 });
      } catch {}
    }

    // Create default project memory if it doesn't exist
    const memoryPath = join(directory, '.prism', 'project-memory.json');
    if (!existsSync(memoryPath)) {
      try {
        writeFileSync(memoryPath, JSON.stringify({
          techStack: { languages: ['ABAP'], frameworks: ['SAP'] },
          sapModules: [],
          userDirectives: [],
          customNotes: [],
          scannedAt: new Date().toISOString()
        }, null, 2), { mode: 0o600 });
      } catch {}
    }

    console.log(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: '[PRISM] Project initialized. .prism directory structure created.'
      }
    }));
  } catch (error) {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
