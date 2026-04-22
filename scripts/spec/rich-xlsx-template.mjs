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
//   2. REPLACE the three // TODO blocks:
//        - SHEETS_DATA    (text sheets — Overview, Data Model, Logic, ...)
//        - SCREEN_PARAMS  (Parameters table rendered under the wireframes)
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
//     4 (RETIRED v8 — was light green; styles now point at fill 2 instead)
//     5 light sky blue (input widget — replaces grey for selection-screen params)
//
//   v8 palette rule (MANDATORY — propagated from SKILL.md):
//     · Headers / title bars / table captions → light grey (fill 2)
//     · Warnings / must-not-miss constraints → soft yellow (fill 3)
//     · Input widgets (selection-screen params) → light sky blue (fill 5)
//     · Do NOT reintroduce green. Grey + yellow is the whole palette.
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
  { font: 2, fill: 2, halign: 'center' },                                   // 2 sheet title — light grey (v7: was green) + bold 14
  { font: 3, fill: 2, border: 1, halign: 'center', valign: 'center' },      // 3 block title — light grey + bold (v8)
  { font: 1, fill: 2, border: 1, halign: 'center', valign: 'center' },      // 4 header row — light grey + bold (v8)
  { border: 1, halign: 'center', valign: 'center' },                        // 5
  { fill: 5, border: 1, halign: 'center' },                                 // 6 input widget — light sky blue + all borders
  { halign: 'right' },                                                      // 7
  { font: 1 },                                                              // 8
  { border: 4 },                                                            // 9  col-A left-only (v7: no fill, moved grey to style 2)
  { border: 5 },                                                            // 10 col-Q right-only
  { border: 2 },                                                            // 11
  { border: 3 },                                                            // 12
  { border: 6 },                                                            // 13 col-A TL (v7: no fill)
  { border: 7 },                                                            // 14
  { border: 8 },                                                            // 15 col-A BL (v7: no fill)
  { border: 9 },                                                            // 16 col-Q BR
  { border: 1, fill: 2, font: 1, halign: 'center' },                        // 17 frame-top — grey + bold + ALL borders (v8)
  { border: 1, halign: 'left', valign: 'center' },                          // 18
  { border: 1, halign: 'center', valign: 'center', font: 1, fill: 2 },      // 19 grey header (v8)
  { border: 1, fill: 3, halign: 'center', valign: 'center' },               // 20 yellow highlight
  { border: 1, font: 1, halign: 'center', valign: 'center' },               // 21 bold bordered (flow / toolbar boxes)
  { wrap: true, valign: 'top' },                                             // 22 wrap (no border)
  { border: 1, wrap: true, valign: 'top', halign: 'left' },                  // 23 wrap + border (long values)
  { border: 1, fill: 2, font: 1, wrap: true, halign: 'center', valign: 'center' }, // 24 wrap header — light grey (v8)
];

function stylesXml() {
  const fonts = `<fonts count="4">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="14"/><name val="Calibri"/></font>
<font><b/><sz val="12"/><name val="Calibri"/></font>
</fonts>`;
  const fills = `<fills count="6">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE7E6E6"/><bgColor rgb="FFE7E6E6"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor rgb="FFFFF2CC"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE2EFDA"/><bgColor rgb="FFE2EFDA"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/><bgColor rgb="FFDDEBF7"/></patternFill></fill>
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
      // Emit s="0" explicitly — style 0 (default) must not be dropped, else
      // a cell with style 0 and no value becomes a naked <c r="X"/> which
      // Excel flags as recoverable corruption.
      const hasStyle = (c.s !== undefined && c.s !== null);
      const styleAttr = hasStyle ? ` s="${c.s}"` : '';
      const isEmpty = (c.v === undefined || c.v === null || c.v === '');
      if (isEmpty) {
        // Skip entirely when neither style nor value — avoids <c r="X"/>.
        if (!hasStyle) return '';
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
function contentTypes(nSheets, { hasPng = false, drawingIds = [] } = {}) {
  const overrides = [];
  overrides.push('<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>');
  overrides.push('<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>');
  for (let i = 1; i <= nSheets; i++) {
    overrides.push(`<Override PartName="/xl/worksheets/sheet${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
  }
  for (const id of drawingIds) {
    overrides.push(`<Override PartName="/xl/drawings/drawing${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
  }
  const pngDefault = hasPng ? '<Default Extension="png" ContentType="image/png"/>' : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
${pngDefault}${overrides.join('')}
</Types>`;
}

// =============================================================
// Image support (v8) — embed PNG mockups produced by
// screen-image-renderer.mjs over the Inputs & Screens sheet.
//
// images shape (passed to build()):
//   [{ sheetName, pngBuffer, anchorCell: 'B3', width, height }, ...]
// Multiple images per sheet are grouped into ONE drawing.xml; distinct
// sheets get distinct drawing parts.
// =============================================================
const EMU_PER_PX = 9525; // 96 DPI

function cellRefToColRow(ref) {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  let col = 0;
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64);
  return { col: col - 1, row: parseInt(m[2], 10) - 1 };
}

function drawingXml(imgs) {
  // imgs: [{ pngBuffer, anchorCell, width, height, rid: 'rId1' }]
  const anchors = imgs.map((img, i) => {
    const { col, row } = cellRefToColRow(img.anchorCell);
    const cx = img.width * EMU_PER_PX, cy = img.height * EMU_PER_PX;
    return `<xdr:oneCellAnchor editAs="oneCell">
<xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
<xdr:ext cx="${cx}" cy="${cy}"/>
<xdr:pic>
<xdr:nvPicPr><xdr:cNvPr id="${i + 2}" name="Image${i + 1}"/><xdr:cNvPicPr/></xdr:nvPicPr>
<xdr:blipFill><a:blip r:embed="${img.rid}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>
</xdr:pic>
<xdr:clientData/>
</xdr:oneCellAnchor>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
${anchors}
</xdr:wsDr>`;
}

function drawingRelsXml(imgs) {
  const rs = imgs.map((img, i) => `<Relationship Id="${img.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${img.mediaName}"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rs}</Relationships>`;
}

function sheetDrawingRel(drawingId) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawingId}.xml"/>
</Relationships>`;
}

function injectDrawingRef(sheetXmlStr) {
  // Worksheet already written by sheetXml(); inject <drawing> + xmlns:r.
  let s = sheetXmlStr;
  if (!/xmlns:r=/.test(s)) {
    s = s.replace('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">');
  }
  return s.replace('</worksheet>', '<drawing r:id="rId1"/></worksheet>');
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
// Visual width for column sizing — CJK / emoji / fullwidth count as 2
// because Calibri 11pt renders them ~2x the width of ASCII. Without this,
// Korean/Chinese/Japanese labels get truncated in auto-sized columns.
function visualWidth(s) {
  let w = 0;
  for (const ch of String(s ?? '')) {
    const cp = ch.codePointAt(0);
    if ((cp >= 0x1100 && cp <= 0x11FF) ||   // Hangul Jamo
        (cp >= 0x2E80 && cp <= 0x303F) ||   // CJK Radicals / Kangxi / Symbols
        (cp >= 0x3040 && cp <= 0x30FF) ||   // Hiragana + Katakana
        (cp >= 0x3400 && cp <= 0x9FFF) ||   // CJK Unified + Ext A
        (cp >= 0xAC00 && cp <= 0xD7AF) ||   // Hangul Syllables
        (cp >= 0xF900 && cp <= 0xFAFF) ||   // CJK Compat Ideographs
        (cp >= 0xFF00 && cp <= 0xFFEF) ||   // Fullwidth / Halfwidth
        cp >= 0x1F000) {                    // emoji + supplementary planes
      w += 2;
    } else {
      w += 1;
    }
  }
  return w;
}

// ─── Auto-fit defaults (MUST NOT BE TIGHTENED) ────────────────────
// The program-to-spec skill requires that NO cell content is truncated
// in the rendered xlsx. These values are calibrated for Korean/CJK text
// in Calibri 11pt, with extra headroom for bold headers and merged
// labels. If a reviewer ever reports truncation, RAISE these — never
// lower them.
//
//   WIDTH_PADDING   = 6  breathing room beyond measured visual width
//                        (bold headers + CJK glyph drift need ≥ 4; use 6)
//   WIDTH_MIN       = 12 smallest usable col (single emoji + 1 char)
//   WIDTH_MAX       = 100 upper cap — beyond this, wrap saves horizontal
//                        screen real estate without clipping
//   WRAP_THRESHOLD  = 55 cells wider than this switch to wrapText +
//                        multi-line row height (≈ 2 Korean sentences)
const WIDTH_PADDING  = 6;
const WIDTH_MIN      = 12;
const WIDTH_MAX      = 100;
const WRAP_THRESHOLD = 55;
const LINE_HEIGHT_PT = 17;   // per wrapped line (was 15 — Calibri 11pt needs ≥16 for CJK)
const MAX_ROW_HEIGHT = 300;  // row-height cap (was 180 — some rules/long narratives need 5+ lines)

function textSheet(rows) {
  const cells = {};
  const rowHeights = {};
  const maxCols = Math.max(...rows.map(r => r.length));

  // Pass 1 — measure column widths using CJK-aware metric.
  // Cap per-cell contribution at WRAP_THRESHOLD so a single giant
  // description doesn't blow up the column; it'll wrap instead.
  const cols = [];
  for (let c = 0; c < maxCols; c++) {
    let maxVw = 0;
    for (const row of rows) {
      const vw = visualWidth(row[c] ?? '');
      maxVw = Math.max(maxVw, Math.min(vw, WRAP_THRESHOLD));
    }
    const width = Math.min(Math.max(maxVw + WIDTH_PADDING, WIDTH_MIN), WIDTH_MAX);
    cols.push({ min: c + 1, max: c + 1, width });
  }

  // Pass 2 — emit cells, apply wrap style for long values, compute row heights.
  rows.forEach((row, rIdx) => {
    let maxLines = 1;
    row.forEach((val, cIdx) => {
      const ref = R(rIdx, cIdx);
      const vw = visualWidth(val);
      const colW = cols[cIdx]?.width ?? WIDTH_MIN;
      const usable = Math.max(1, colW - WIDTH_PADDING);
      const isLong = vw > WRAP_THRESHOLD;
      // Header row 0 → style 4 (bold grey border, non-wrap) for short headers,
      //                style 24 (wrap header) when long.
      // Data rows    → style 23 (wrap + border) when long, else style 18
      //                (all-border + left align). Every data cell gets a
      //                border so the spec reads as a uniform grid — mixed
      //                border / no-border looks broken at any zoom level.
      const style = rIdx === 0
        ? (isLong ? 24 : 4)
        : (isLong ? 23 : 18);
      cells[ref] = { v: val, s: style };
      if (isLong) {
        const lines = Math.ceil(vw / usable);
        if (lines > maxLines) maxLines = lines;
      }
    });
    if (maxLines > 1) {
      rowHeights[rIdx + 1] = Math.min(maxLines * LINE_HEIGHT_PT, MAX_ROW_HEIGHT);
    }
  });

  return { cells, merges: [], cols, rowHeights };
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
// TODO (per-spec): SCREEN_PARAMS — parameters of the object.
//   Rendered as a bordered table BELOW the wireframes on the
//   `Inputs & Screens` sheet via paramsBlock(). Always emitted,
//   even when the object has no screens (for pure FM / Class / CDS /
//   RAP inputs, this is the only input documentation on the sheet).
//
//   Shape: [{ field, type, required, defaultVal, description }, ...]
//   Source per archetype:
//     Report      → PARAMETERS / SELECT-OPTIONS
//     FM / Class  → IMPORTING parameters
//     CDS         → view parameters (@parameters)
//     RAP         → action input structure fields
// =============================================================
const SCREEN_PARAMS = [
  // Example — REPLACE:
  // { field: 'P_BUKRS', type: 'BUKRS', required: 'X', defaultVal: '1000', description: 'Company code' },
  // { field: 'S_BUDAT', type: 'BUDAT', required: 'X', defaultVal: '',     description: 'Posting date range' },
];

// =============================================================
// paramsBlock — append a "Parameters" table below existing sheet
//   content (e.g. under the wireframes drawn in screensSheet).
//
// Uses the same 17-col grid (A..Q) shared with screensSheet:
//   A        = left frame (style 9)
//   B:D      = Field       (header style 4 → data style 5)
//   E:F      = Type        (")
//   G:H      = Required    (")
//   I:K      = Default     (")
//   L:P      = Description (")
//   Q        = right frame (style 10)
//
// Rows:
//   row startRow      → merged A:Q title bar 'Parameters' (style 17)
//   row startRow+1    → header row (Field / Type / Required / Default / Description)
//   row startRow+2..  → one row per parameter
//
// Call AFTER drawing wireframes, ~1–2 rows below the last closing frame
// row, so the params table reads as a caption of the screen above.
//
// Returns the next free row number (1-based).
// =============================================================
function paramsBlock(cells, merges, rowHeights, startRow, params = []) {
  const COLS = [[1, 3], [4, 5], [6, 7], [8, 10], [11, 15]]; // B:D E:F G:H I:K L:P
  const HEADERS = ['Field', 'Type', 'Required', 'Default', 'Description'];
  let r = startRow;

  // Title bar — merged A:Q, grey + bold.
  cells[R(r - 1, 0)] = { v: 'Parameters', s: 17 };
  for (let c = 1; c <= 16; c++) cells[R(r - 1, c)] = { s: 17 };
  merges.push(`A${r}:Q${r}`);
  rowHeights[r] = 20;
  r++;

  // Header row — left/right frame + merged column groups.
  cells[R(r - 1, 0)] = { s: 9 };
  HEADERS.forEach((h, i) => {
    const [c0, c1] = COLS[i];
    cells[R(r - 1, c0)] = { v: h, s: 4 };
    for (let c = c0 + 1; c <= c1; c++) cells[R(r - 1, c)] = { s: 4 };
    merges.push(`${colLetter(c0)}${r}:${colLetter(c1)}${r}`);
  });
  cells[R(r - 1, 16)] = { s: 10 };
  r++;

  // Data rows — empty array still leaves the header visible as a stub.
  for (const p of params) {
    cells[R(r - 1, 0)] = { s: 9 };
    const vals = [p.field, p.type, p.required, p.defaultVal, p.description];
    vals.forEach((v, i) => {
      const [c0, c1] = COLS[i];
      cells[R(r - 1, c0)] = { v: v ?? '', s: 5 };
      for (let c = c0 + 1; c <= c1; c++) cells[R(r - 1, c)] = { s: 5 };
      merges.push(`${colLetter(c0)}${r}:${colLetter(c1)}${r}`);
    });
    cells[R(r - 1, 16)] = { s: 10 };
    r++;
  }

  return r;
}

// =============================================================
// Screen-sheet render helpers — kept for FALLBACK cell-border wireframes
// when no headless browser is available for image rasterization (v8).
//
// v8 note: the PRIMARY path for Selection + ALV is now embedded PNG
// images produced by scripts/spec/screen-image-renderer.mjs. These
// helpers are still used for:
//   · Flow diagram rows (grey styled)
//   · BAPI mapping rows (grey styled)
//   · Yellow warning rows at the BOTTOM of the sheet (style 20)
//   · Full fallback wireframe when rasterizer returns null
// =============================================================
function screenFrameRow(cells, row) {
  cells[R(row - 1, 0)]  = { s: 9 };   // col A — left border
  cells[R(row - 1, 16)] = { s: 10 };  // col Q — right border
}
function screenCloseFrame(cells, row) {
  cells[R(row - 1, 0)] = { s: 15 };                              // BL
  for (let c = 1; c <= 15; c++) cells[R(row - 1, c)] = { s: 12 }; // bottom only
  cells[R(row - 1, 16)] = { s: 16 };                              // BR
}
// Full-width row (A:Q merged) — use for sheet titles, section titles,
// standalone banners. Style applied to ALL cells so outer borders render.
function screenFullRow(cells, merges, row, val, s) {
  cells[R(row - 1, 0)] = { v: val, s };
  for (let c = 1; c <= 16; c++) cells[R(row - 1, c)] = { s };
  merges.push(`A${row}:Q${row}`);
}
// Sub-title INSIDE a frame section. Keeps col A/Q frame borders intact
// (A=9, Q=10) and merges B:P for the label. Style applied to every cell
// in the B:P merge so borders render if the style carries any.
function screenSubtitleRow(cells, merges, row, val, s = 1) {
  cells[R(row - 1, 0)]  = { s: 9 };
  cells[R(row - 1, 1)]  = { v: val, s };
  for (let c = 2; c <= 15; c++) cells[R(row - 1, c)] = { s };
  cells[R(row - 1, 16)] = { s: 10 };
  merges.push(`B${row}:P${row}`);
}
// Merged cell whose outer rectangle renders — style set on every cell in
// the merge range so Excel draws the full perimeter (critical for input
// boxes F:H / K:M which otherwise lose their right+bottom edges).
function screenMerge(cells, merges, row, c0, c1, style, value) {
  cells[R(row - 1, c0)] = { v: value ?? '', s: style };
  for (let c = c0 + 1; c <= c1; c++) cells[R(row - 1, c)] = { s: style };
  if (c1 > c0) merges.push(`${colLetter(c0)}${row}:${colLetter(c1)}${row}`);
}

// =============================================================
// screensSheet — Inputs & Screens sheet body (v8).
//
// V8 SHEET ORDER (TOP → BOTTOM)
//   1. Sheet title                         style 2  (light grey, merged A:Q)
//   2. Image anchor rows                   blank rows where PNGs overlay
//        · Selection-screen image at B3   (spans ~14 rows)
//        · ALV layout image at B19        (spans ~13 rows)
//      Reserve those rows EMPTY in cells{}. buildImages() in build() lays
//      the PNG on top via oneCellAnchor.
//   3. Flow diagram (informational)        style 21 boxes, style 0 arrows
//   4. BAPI / Action mapping (informational) style 18 cells, no heavy fill
//   5. Parameters table                    paramsBlock() — header style 4,
//                                          data style 5 (grey header only)
//   6. Yellow warnings                     MUST be at the BOTTOM of the sheet
//        · Authority / Auth-check caveats  style 20, merged A:Q
//        · Data-volume / runtime caveats   style 20, merged A:Q
//      Rationale: readers scan top→bottom; constraints sit last so the
//      positive content (screens + parameters) isn't drowned in warnings.
//
// V8 COLOR RULES
//   · Headers / title bars / table captions → GREY (fill 2) — NEVER green.
//   · Warnings (must-not-miss) → YELLOW (fill 3), style 20.
//   · Input widgets on wireframe → SKY BLUE (fill 5), style 6.
//   · Informational rows (flow, BAPI) → NO FILL beyond optional grey header.
//     Keep them uncluttered — the images carry the visual weight.
//
// V8 IMAGE PIPELINE (see scripts/spec/screen-image-renderer.mjs)
//   const { renderScreenImages } = await import('./screen-image-renderer.mjs');
//   const imgs = await renderScreenImages({
//     selection: { fields: [...], optionFields: [...] },
//     alv:       { columns: [...], sampleRows: [...], maxRows: 3 },
//   });
//   // Pass to build():
//   const images = [];
//   if (imgs.selection) images.push({ sheetName: INPUTS_SHEET_NAME, anchorCell: 'B3',
//                                     pngBuffer: imgs.selection.pngBuffer,
//                                     width: imgs.selection.width, height: imgs.selection.height });
//   if (imgs.alv)       images.push({ sheetName: INPUTS_SHEET_NAME, anchorCell: 'B19',
//                                     pngBuffer: imgs.alv.pngBuffer,
//                                     width: imgs.alv.width, height: imgs.alv.height });
//   build(OUT_PATH, { images });
//
//   ALV sample rows MUST be capped at 3 (up to 5 when showing lock/edit/mixed-
//   status variants). Never emit >5 — a mockup, not a data dump.
//
//   If imgs.selection / imgs.alv is null (no headless browser), fall back
//   to the legacy cell-border wireframe via screenFullRow / screenMerge
//   helpers — DO NOT silently omit the screens.
//
// LAYOUT GRID (17-col)
//   A=3, B..P=14 each, Q=3. Max full-width merge = A:Q.
//
// RETURN SHAPE
//   { cells, merges, cols, rowHeights }
// =============================================================
function screensSheet() {
  const cells = {};
  const merges = [];
  const cols = [
    { min: 1, max: 1, width: 3 },
    { min: 2, max: 16, width: 14 },
    { min: 17, max: 17, width: 3 },
  ];
  const rowHeights = { 1: 24 };

  // Row 1 — sheet title (grey).
  // screenFullRow(cells, merges, 1, '입력 및 화면 · {OBJECT}', 2);

  // Rows 3–16 — reserved for Selection image (anchor B3).
  // Rows 19–31 — reserved for ALV image (anchor B19).
  // Leave those rows EMPTY. The build({ images }) call overlays PNGs.

  // Rows 34+ — Flow diagram (optional, style 21 boxes / style 0 arrows).
  // Rows 39+ — BAPI / Action mapping table (style 18 data, no fill).

  // Parameters table — grey header, full-bordered data rows.
  let r = 49;
  r = paramsBlock(cells, merges, rowHeights, r, SCREEN_PARAMS);

  // WARNINGS — MUST be the last content on the sheet (v8 rule).
  // Emit yellow style-20 rows A:Q merged. Example:
  //   screenFullRow(cells, merges, r + 1, '⚠ 보안 주의: …', 20);
  //   screenFullRow(cells, merges, r + 2, '⚠ 데이터 범위: …', 20);

  return { cells, merges, cols, rowHeights };
}

// =============================================================
// TODO (per-spec): set output path
// =============================================================
const OUT_PATH = 'CHANGE_ME.xlsx';

// =============================================================
// Sheet name for the screens/inputs sheet. Override per-spec for
// localised specs (e.g. '입력 및 화면' for KO, '入力と画面' for JA).
// Default is English so ASCII-only tooling reads cleanly.
// =============================================================
const INPUTS_SHEET_NAME = 'Inputs & Screens';

// =============================================================
// Build + auto-open
// =============================================================
// Excel sheet name rules (enforced here so a typo in SHEETS_DATA doesn't
// produce a file that opens with a "recovered contents" dialog):
//   · Forbidden characters: \ / ? * [ ]
//   · Max length: 31 characters
//   · Must not be blank; must not start/end with apostrophe
//   · Must be unique within the workbook
function sanitizeSheetName(name, seenNames) {
  let n = String(name ?? '').replace(/[\\/?*\[\]]/g, '-');
  n = n.replace(/^'+|'+$/g, '');
  if (n.length > 31) n = n.slice(0, 31);
  if (!n) n = 'Sheet';
  let candidate = n, i = 2;
  while (seenNames.has(candidate)) {
    const suffix = ` (${i})`;
    candidate = n.slice(0, 31 - suffix.length) + suffix;
    i++;
  }
  seenNames.add(candidate);
  return candidate;
}

// build({ outPath, images })
//   images — optional array from screen-image-renderer.renderScreenImages():
//     [{ sheetName, pngBuffer, anchorCell:'B3', width, height }, ...]
//   Anchor cell is on the target sheet (usually INPUTS_SHEET_NAME).
//   Omit or pass [] → v8 degrades gracefully to cell-border wireframes.
function build(outPath, { images = [] } = {}) {
  const seen = new Set();
  const dataSheets = SHEETS_DATA.map(s => ({ name: sanitizeSheetName(s.name, seen), payload: textSheet(s.rows) }));
  const inputsSheet = { name: sanitizeSheetName(INPUTS_SHEET_NAME, seen), payload: screensSheet() };
  const insertAt = Math.min(2, dataSheets.length);
  const sheets = [
    ...dataSheets.slice(0, insertAt),
    inputsSheet,
    ...dataSheets.slice(insertAt),
  ];

  // Group images by sheet → one drawing part per sheet with images.
  const imagesBySheet = new Map();
  for (const img of images) {
    const key = img.sheetName || INPUTS_SHEET_NAME;
    if (!imagesBySheet.has(key)) imagesBySheet.set(key, []);
    imagesBySheet.get(key).push(img);
  }

  // Assign drawing/media IDs deterministically.
  const drawings = [];      // [{ drawingId, sheetIdx, imgs:[{ rid, mediaName, ... }] }]
  const mediaEntries = [];  // [{ name, data }]
  let drawingCounter = 0, mediaCounter = 0;
  sheets.forEach((s, idx) => {
    const imgs = imagesBySheet.get(s.name);
    if (!imgs || !imgs.length) return;
    drawingCounter++;
    const wired = imgs.map((img, i) => {
      mediaCounter++;
      const mediaName = `image${mediaCounter}.png`;
      mediaEntries.push({ name: `xl/media/${mediaName}`, data: img.pngBuffer });
      return { ...img, rid: `rId${i + 1}`, mediaName };
    });
    drawings.push({ drawingId: drawingCounter, sheetIdx: idx, imgs: wired });
  });

  const drawingIds = drawings.map(d => d.drawingId);
  const hasPng = mediaEntries.length > 0;

  // Build worksheet XMLs — inject <drawing> ref on sheets that have one.
  const sheetXmls = sheets.map((s, idx) => {
    let xmlStr = sheetXml(s.payload);
    const d = drawings.find(x => x.sheetIdx === idx);
    if (d) xmlStr = injectDrawingRef(xmlStr);
    return { name: `xl/worksheets/sheet${idx + 1}.xml`, data: Buffer.from(xmlStr, 'utf8') };
  });

  // Per-sheet rels (only for sheets with drawings).
  const sheetRelEntries = drawings.map(d => ({
    name: `xl/worksheets/_rels/sheet${d.sheetIdx + 1}.xml.rels`,
    data: Buffer.from(sheetDrawingRel(d.drawingId), 'utf8'),
  }));

  // Drawing parts + their rels.
  const drawingEntries = drawings.flatMap(d => [
    { name: `xl/drawings/drawing${d.drawingId}.xml`, data: Buffer.from(drawingXml(d.imgs), 'utf8') },
    { name: `xl/drawings/_rels/drawing${d.drawingId}.xml.rels`, data: Buffer.from(drawingRelsXml(d.imgs), 'utf8') },
  ]);

  const entries = [
    { name: '[Content_Types].xml', data: Buffer.from(contentTypes(sheets.length, { hasPng, drawingIds }), 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(rootRels(), 'utf8') },
    { name: 'xl/workbook.xml', data: Buffer.from(workbookXml(sheets.map(s => s.name)), 'utf8') },
    { name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(workbookRels(sheets.length), 'utf8') },
    { name: 'xl/styles.xml', data: Buffer.from(stylesXml(), 'utf8') },
    ...sheetXmls,
    ...sheetRelEntries,
    ...drawingEntries,
    ...mediaEntries,
  ];
  writeFileSync(outPath, zipFiles(entries));
  console.log(`Wrote ${outPath} (${sheets.length} sheets${hasPng ? `, ${mediaEntries.length} images` : ''})`);
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
