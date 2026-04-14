// sc4sap:program-to-spec — Rich XLSX standalone driver TEMPLATE.
//
// Purpose:
//   Generate a human-readable multi-sheet .xlsx specification artifact
//   using REAL Excel cell geometry (styles.xml + borders + merged cells +
//   fixed column widths) — NOT ASCII box-drawing. ASCII art breaks when
//   Excel column widths don't match character widths; borders + merges
//   render cleanly at any zoom level.
//
// How the skill uses this file:
//   1. COPY this template to .sc4sap/specs/_drivers/{OBJECT}-{YYYYMMDD}.mjs
//      (or C:/Users/<user>/Desktop/... when the user specifies an absolute
//      directory).
//   2. REPLACE the two // TODO blocks:
//        - SHEETS_DATA  (text sheets — Overview, Data Model, Logic, ...)
//        - screensSheet() body (Dynpro + ALV wireframe using borders)
//      with the spec-specific content produced by sap-analyst + sap-writer.
//   3. SET OUT_PATH to the user's target file.
//   4. RUN `node <driver>.mjs`  → writes xlsx, auto-opens in default app.
//   5. DELETE the driver file on success. The xlsx is the artifact, the
//      driver is scaffolding.
//
// Zero npm dependencies — uses only node:zlib / node:fs / node:child_process.

import { deflateRawSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';

// =============================================================
// ZIP + CRC32 (no external deps — XLSX is a zip of OOXML parts)
// =============================================================
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
function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n, 0); return b; }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n >>> 0, 0); return b; }

function zipFiles(entries) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, 'utf8');
    const raw = e.data;
    const compressed = deflateRawSync(raw, { level: 9 });
    const useDeflate = compressed.length < raw.length;
    const body = useDeflate ? compressed : raw;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(raw);
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(method),
      u16(0), u16(0), u32(crc), u32(body.length), u32(raw.length),
      u16(nameBuf.length), u16(0), nameBuf,
    ]);
    locals.push(local, body);
    const central = Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(method),
      u16(0), u16(0), u32(crc), u32(body.length), u32(raw.length),
      u16(nameBuf.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(offset), nameBuf,
    ]);
    centrals.push(central);
    offset += local.length + body.length;
  }
  const centralSize = centrals.reduce((s, p) => s + p.length, 0);
  const centralOffset = offset;
  const eocd = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(centralSize), u32(centralOffset), u16(0),
  ]);
  return Buffer.concat([...locals, ...centrals, eocd]);
}

// =============================================================
// XML helpers
// =============================================================
function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function colLetter(c0) {
  let n = c0 + 1, s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
const R = (r, c) => colLetter(c) + (r + 1);

// =============================================================
// Styles catalog
//   Border slots (indices into BORDER_DEFS):
//     0 none | 1 all | 2 top | 3 bottom | 4 left | 5 right
//     6 TL  | 7 TR  | 8 BL  | 9 BR
//    10 TLR (top+left+right) | 11 LR | 12 BLR (bottom+left+right)
//
//   Fill slots:
//     0 none | 1 gray125 (OOXML default) | 2 light grey | 3 soft yellow
//
//   Font slots:
//     0 default 11 Calibri | 1 bold 11 | 2 bold 14 | 3 bold 12
//
//   cellXfs (used via `s="N"` on each cell):
//     0 default          | 1 bold             | 2 report title (bold 14 center)
//     3 block title      | 4 ALV header       | 5 ALV data cell
//     6 input widget     | 7 label right      | 8 toolbar bold
//     9 left only        | 10 right only      | 11 top only
//    12 bottom only      | 13 TL              | 14 TR
//    15 BL               | 16 BR              | 17 frame-top TLR bold grey
//    18 all-border left  | 19 grey header     | 20 yellow highlight
//    21 bold bordered cell (for flow diagram nodes)
// =============================================================
const BORDER_DEFS = [
  '<border><left/><right/><top/><bottom/><diagonal/></border>',
  '<border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>',
  '<border><left/><right/><top style="thin"><color rgb="FF000000"/></top><bottom/><diagonal/></border>',
  '<border><left/><right/><top/><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>',
  '<border><left style="thin"><color rgb="FF000000"/></left><right/><top/><bottom/><diagonal/></border>',
  '<border><left/><right style="thin"><color rgb="FF000000"/></right><top/><bottom/><diagonal/></border>',
  '<border><left style="thin"><color rgb="FF000000"/></left><right/><top style="thin"><color rgb="FF000000"/></top><bottom/><diagonal/></border>',
  '<border><left/><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom/><diagonal/></border>',
  '<border><left style="thin"><color rgb="FF000000"/></left><right/><top/><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>',
  '<border><left/><right style="thin"><color rgb="FF000000"/></right><top/><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>',
  '<border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top style="thin"><color rgb="FF000000"/></top><bottom/><diagonal/></border>',
  '<border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top/><bottom/><diagonal/></border>',
  '<border><left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right><top/><bottom style="thin"><color rgb="FF000000"/></bottom><diagonal/></border>',
];
const CELL_XFS = [
  { },                                                                      // 0
  { font: 1 },                                                              // 1
  { font: 2, halign: 'center' },                                            // 2
  { font: 3, fill: 2, border: 1, halign: 'center', valign: 'center' },      // 3
  { font: 1, fill: 2, border: 1, halign: 'center', valign: 'center' },      // 4
  { border: 1, halign: 'center', valign: 'center' },                        // 5
  { fill: 2, border: 1, halign: 'center' },                                 // 6
  { halign: 'right' },                                                      // 7
  { font: 1 },                                                              // 8
  { border: 4 },                                                            // 9
  { border: 5 },                                                            // 10
  { border: 2 },                                                            // 11
  { border: 3 },                                                            // 12
  { border: 6 },                                                            // 13
  { border: 7 },                                                            // 14
  { border: 8 },                                                            // 15
  { border: 9 },                                                            // 16
  { border: 10, fill: 2, font: 1, halign: 'center' },                       // 17
  { border: 1, halign: 'left', valign: 'center' },                          // 18
  { border: 1, halign: 'center', valign: 'center', font: 1, fill: 2 },      // 19
  { border: 1, fill: 3, halign: 'center', valign: 'center' },               // 20
  { border: 1, font: 1, halign: 'center', valign: 'center' },               // 21
];

function stylesXml() {
  const fonts = `<fonts count="4">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="14"/><name val="Calibri"/></font>
<font><b/><sz val="12"/><name val="Calibri"/></font>
</fonts>`;
  const fills = `<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE7E6E6"/><bgColor rgb="FFE7E6E6"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor rgb="FFFFF2CC"/></patternFill></fill>
</fills>`;
  const borders = `<borders count="${BORDER_DEFS.length}">${BORDER_DEFS.join('')}</borders>`;
  const xfs = CELL_XFS.map(x => {
    const attrs = [
      'numFmtId="0"',
      `fontId="${x.font || 0}"`,
      `fillId="${x.fill || 0}"`,
      `borderId="${x.border || 0}"`,
      'xfId="0"',
    ];
    if (x.font) attrs.push('applyFont="1"');
    if (x.fill) attrs.push('applyFill="1"');
    if (x.border) attrs.push('applyBorder="1"');
    if (x.halign || x.valign || x.wrap) attrs.push('applyAlignment="1"');
    const align = (x.halign || x.valign || x.wrap)
      ? `<alignment${x.halign ? ` horizontal="${x.halign}"` : ''}${x.valign ? ` vertical="${x.valign}"` : ''}${x.wrap ? ' wrapText="1"' : ''}/>`
      : '';
    return `<xf ${attrs.join(' ')}>${align}</xf>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
${fonts}
${fills}
${borders}
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${CELL_XFS.length}">${xfs}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

// =============================================================
// Sheet rendering:
//   Input shape:  { cells: {A1:{v,s}, ...}, merges:["A1:C1",...], cols:[{min,max,width}], rowHeights:{1:24} }
// =============================================================
function sheetXml({ cells, merges = [], cols = [], rowHeights = {} }) {
  const grouped = new Map();
  for (const [ref, c] of Object.entries(cells)) {
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    const rowIdx = +m[2];
    if (!grouped.has(rowIdx)) grouped.set(rowIdx, []);
    grouped.get(rowIdx).push({ ref, ...c });
  }
  const rowXmls = [];
  for (const rowIdx of [...grouped.keys()].sort((a, b) => a - b)) {
    const cs = grouped.get(rowIdx).sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
    const ht = rowHeights[rowIdx] ? ` ht="${rowHeights[rowIdx]}" customHeight="1"` : '';
    const cellXmls = cs.map(c => {
      const styleAttr = c.s ? ` s="${c.s}"` : '';
      if (c.v === undefined || c.v === null || c.v === '') {
        return `<c r="${c.ref}"${styleAttr}/>`;
      }
      if (typeof c.v === 'number') {
        return `<c r="${c.ref}"${styleAttr}><v>${c.v}</v></c>`;
      }
      return `<c r="${c.ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`;
    }).join('');
    rowXmls.push(`<row r="${rowIdx}"${ht}>${cellXmls}</row>`);
  }
  const colsXml = cols.length
    ? `<cols>${cols.map(c => `<col min="${c.min}" max="${c.max}" width="${c.width}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const mergeXml = merges.length
    ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
${colsXml}
<sheetData>${rowXmls.join('')}</sheetData>
${mergeXml}
</worksheet>`;
}

// =============================================================
// OOXML wrappers
// =============================================================
function contentTypes(nSheets) {
  const overrides = [];
  overrides.push('<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>');
  overrides.push('<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>');
  for (let i = 1; i <= nSheets; i++) {
    overrides.push(`<Override PartName="/xl/worksheets/sheet${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
${overrides.join('')}
</Types>`;
}
function rootRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}
function workbookXml(names) {
  const sheets = names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheets}</sheets>
</workbook>`;
}
function workbookRels(n) {
  const rs = [];
  for (let i = 1; i <= n; i++) {
    rs.push(`<Relationship Id="rId${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i}.xml"/>`);
  }
  rs.push(`<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${rs.join('')}
</Relationships>`;
}

// =============================================================
// textSheet — auto-styles a 2D array of strings as a tabular sheet
//   (header row: bold + grey + all-borders; auto column widths)
//
// Use this for the DATA sheets (Overview, Data Model, Logic, Outputs,
// Authorization, Exceptions, Enhancements, Where-Used, etc.).
// =============================================================
function textSheet(rows) {
  const cells = {};
  rows.forEach((row, rIdx) => {
    row.forEach((val, cIdx) => {
      const ref = R(rIdx, cIdx);
      const style = rIdx === 0 ? 4 : 0;
      cells[ref] = { v: val, s: style };
    });
  });
  const maxCols = Math.max(...rows.map(r => r.length));
  const cols = [];
  for (let c = 0; c < maxCols; c++) {
    let maxLen = 0;
    for (const row of rows) {
      const v = row[c] ?? '';
      maxLen = Math.max(maxLen, String(v).length);
    }
    const width = Math.min(Math.max(maxLen + 2, 10), 60);
    cols.push({ min: c + 1, max: c + 1, width });
  }
  return { cells, merges: [], cols };
}

// =============================================================
// TODO (per-spec): SHEETS_DATA — fill with text sheets.
//   Shape: [{ name: 'Overview', rows: [[header...], [row...], ...] }, ...]
// =============================================================
const SHEETS_DATA = [
  // Example — REPLACE:
  // {
  //   name: 'Overview',
  //   rows: [
  //     ['Field', 'Value'],
  //     ['Object Name', '{OBJECT}'],
  //     ['Object Type', '{TYPE}'],
  //     // ...
  //   ],
  // },
];

// =============================================================
// TODO (per-spec): screensSheet — build Selection Screen + ALV
//   using real Excel geometry (borders + merges + fixed col widths).
//
// Rendering tips (based on sc4sap:program-to-spec reference build):
//   - Pick ~18 columns A..R with explicit widths tuned to the widest
//     element (ALV header row is usually the driver).
//   - Selection-screen frame: merged block-title row with style 17
//     (frame-top TLR bold grey); interior rows set A=style 9 (left only)
//     and R=style 10 (right only); closing row uses style 15/12/16 for
//     the BL / bottom / BR cells.
//   - Each selection parameter = label cell (merged, style 7 right) +
//     input widget (merged, style 6 grey fill + all borders) + "to" +
//     second input + "[▼]" dropdown marker.
//   - ALV header row = style 4 per cell (bold + grey + borders + center).
//   - ALV data rows = style 5 (center + all borders). Use style 20
//     (yellow) on status cells that deserve highlighting (e.g. In Transit).
//   - Screen-flow diagram = style 21 boxes connected by plain text arrows
//     in merged cells.
//
// Return shape: { cells, merges, cols, rowHeights }
// =============================================================
function screensSheet() {
  const cells = {};
  const merges = [];
  const cols = [
    // { min: 1, max: 1, width: 12 }, ...
  ];
  const rowHeights = {};
  // ...populate cells/merges as described above...
  return { cells, merges, cols, rowHeights };
}

// =============================================================
// TODO (per-spec): set output path
// =============================================================
const OUT_PATH = 'CHANGE_ME.xlsx';

// =============================================================
// Build + auto-open
// =============================================================
function build(outPath) {
  const sheets = [
    ...SHEETS_DATA.map(s => ({ name: s.name, payload: textSheet(s.rows) })),
    { name: 'Screens', payload: screensSheet() },
  ];
  const entries = [
    { name: '[Content_Types].xml', data: Buffer.from(contentTypes(sheets.length), 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(rootRels(), 'utf8') },
    { name: 'xl/workbook.xml', data: Buffer.from(workbookXml(sheets.map(s => s.name)), 'utf8') },
    { name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(workbookRels(sheets.length), 'utf8') },
    { name: 'xl/styles.xml', data: Buffer.from(stylesXml(), 'utf8') },
    ...sheets.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: Buffer.from(sheetXml(s.payload), 'utf8'),
    })),
  ];
  writeFileSync(outPath, zipFiles(entries));
  console.log(`Wrote ${outPath} (${sheets.length} sheets)`);
}
function openInDefault(p) {
  let cmd, args;
  if (platform() === 'win32') { cmd = 'cmd.exe'; args = ['/c', 'start', '""', p]; }
  else if (platform() === 'darwin') { cmd = 'open'; args = [p]; }
  else { cmd = 'xdg-open'; args = [p]; }
  const child = spawn(cmd, args, { detached: true, stdio: 'ignore', shell: false });
  child.unref();
}

build(OUT_PATH);
openInDefault(OUT_PATH);
