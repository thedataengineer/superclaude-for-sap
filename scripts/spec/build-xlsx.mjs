// Pure-Node XLSX writer for sc4sap:program-to-spec.
// No external npm dependencies — uses only node:zlib + node:fs.
// XLSX = ZIP(DEFLATE) container of OOXML SpreadsheetML parts.
//
// Public API:
//   buildXlsx({ sheets, outPath, images })
//     sheets: [{ name: string, rows: (string|number|null)[][] }, ...]
//     outPath: absolute path to write .xlsx
//     images: [{ sheet: string, pngBuffer: Buffer, anchor: {col,row} }]  (optional)
//
// CLI:
//   node build-xlsx.mjs <spec.json> <out.xlsx>
//   where spec.json = { sheets: [...], images: [...] }

import { deflateRawSync } from 'node:zlib';
import { writeFileSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';

// ---------- CRC32 (IEEE 802.3) ----------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---------- ZIP writer (local + central dir, no zip64, store or deflate) ----------
function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n, 0); return b; }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0, 0); return b; }

function zipFiles(entries) {
  // entries: [{ name: string, data: Buffer }]
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8');
    const raw = e.data;
    const compressed = deflateRawSync(raw, { level: 9 });
    const useDeflate = compressed.length < raw.length;
    const body = useDeflate ? compressed : raw;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(raw);

    const localHeader = Buffer.concat([
      u32(0x04034b50),          // local file header sig
      u16(20),                  // version needed
      u16(0x0800),              // flags (UTF-8 name)
      u16(method),
      u16(0), u16(0),           // time, date
      u32(crc),
      u32(body.length),
      u32(raw.length),
      u16(nameBuf.length),
      u16(0),                   // extra len
      nameBuf,
    ]);
    localParts.push(localHeader, body);

    const centralHeader = Buffer.concat([
      u32(0x02014b50),          // central dir sig
      u16(20), u16(20),         // version made-by, needed
      u16(0x0800),              // flags
      u16(method),
      u16(0), u16(0),           // time, date
      u32(crc),
      u32(body.length),
      u32(raw.length),
      u16(nameBuf.length),
      u16(0), u16(0),           // extra, comment
      u16(0), u16(0),           // disk, internal attrs
      u32(0),                   // external attrs
      u32(offset),              // local header offset
      nameBuf,
    ]);
    centralParts.push(centralHeader);

    offset += localHeader.length + body.length;
  }
  const centralDir = Buffer.concat(centralParts);
  const endOfDir = Buffer.concat([
    u32(0x06054b50),
    u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);
  return Buffer.concat([...localParts, centralDir, endOfDir]);
}

// ---------- XML helpers ----------
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/\r/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

function colLetter(n) { // 1-based → A, B, ..., Z, AA...
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// ---------- Sheet XML (inlineStr for simplicity — no sharedStrings) ----------
function sheetXml(rows) {
  const out = [];
  out.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
  out.push('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">');
  out.push('<sheetData>');
  rows.forEach((row, rIdx) => {
    const r = rIdx + 1;
    out.push(`<row r="${r}">`);
    row.forEach((cell, cIdx) => {
      if (cell === null || cell === undefined || cell === '') return;
      const ref = `${colLetter(cIdx + 1)}${r}`;
      if (typeof cell === 'number' && Number.isFinite(cell)) {
        out.push(`<c r="${ref}"><v>${cell}</v></c>`);
      } else {
        out.push(`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(cell)}</t></is></c>`);
      }
    });
    out.push('</row>');
  });
  out.push('</sheetData></worksheet>');
  return Buffer.from(out.join(''), 'utf8');
}

// ---------- Workbook parts ----------
function workbookXml(sheetNames) {
  const sheets = sheetNames.map((n, i) =>
    `<sheet name="${esc(n).slice(0,31)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('');
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>${sheets}</sheets></workbook>`, 'utf8');
}
function workbookRels(n) {
  const rels = Array.from({ length: n }, (_, i) =>
    `<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('');
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`, 'utf8');
}
function rootRels() {
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`, 'utf8');
}
function contentTypes(n) {
  const overrides = Array.from({ length: n }, (_, i) =>
    `<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('');
  return Buffer.from(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `${overrides}</Types>`, 'utf8');
}

// ---------- OS-level "open in default app" ----------
export function openInDefaultApp(filePath) {
  const p = platform();
  let cmd, args;
  if (p === 'win32') {
    // `start` is a cmd.exe builtin, not a standalone .exe — must go through cmd.exe.
    // The empty "" is the window title argument that `start` consumes first.
    cmd = process.env.ComSpec || 'cmd.exe';
    args = ['/c', 'start', '""', filePath];
  } else if (p === 'darwin') {
    cmd = 'open';
    args = [filePath];
  } else {
    cmd = 'xdg-open';
    args = [filePath];
  }
  const child = spawn(cmd, args, { detached: true, stdio: 'ignore', shell: false });
  child.unref();
}

// ---------- Main API ----------
export function buildXlsx({ sheets, outPath, open = false }) {
  if (!Array.isArray(sheets) || sheets.length === 0) {
    throw new Error('buildXlsx: sheets array is required');
  }
  const entries = [
    { name: '[Content_Types].xml', data: contentTypes(sheets.length) },
    { name: '_rels/.rels', data: rootRels() },
    { name: 'xl/workbook.xml', data: workbookXml(sheets.map(s => s.name)) },
    { name: 'xl/_rels/workbook.xml.rels', data: workbookRels(sheets.length) },
    ...sheets.map((s, i) => ({
      name: `xl/worksheets/sheet${i+1}.xml`,
      data: sheetXml(s.rows || []),
    })),
  ];
  const zip = zipFiles(entries);
  writeFileSync(outPath, zip);
  if (open) openInDefaultApp(outPath);
  return outPath;
}

// ---------- CLI ----------
if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const args = process.argv.slice(2);
  const noOpen = args.includes('--no-open');
  const [specPath, outPath] = args.filter(a => !a.startsWith('--'));
  if (!specPath || !outPath) {
    console.error('Usage: node build-xlsx.mjs <spec.json> <out.xlsx> [--no-open]');
    process.exit(2);
  }
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));
  buildXlsx({ sheets: spec.sheets, outPath, open: !noOpen });
  console.log(`Wrote ${outPath} (${spec.sheets.length} sheets)${noOpen ? '' : ' — opening in default app'}`);
}
