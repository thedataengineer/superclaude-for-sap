// Tiny TTL cache on disk. Used to avoid re-scanning many JSONL files per keystroke.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export function readCache(path, ttlMs) {
  if (!existsSync(path)) return null;
  try {
    const { t, v } = JSON.parse(readFileSync(path, 'utf8'));
    if (Date.now() - t > ttlMs) return null;
    return v;
  } catch { return null; }
}

export function writeCache(path, value) {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify({ t: Date.now(), v: value }));
  } catch { /* best-effort */ }
}
