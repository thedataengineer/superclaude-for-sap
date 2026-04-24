// sc4sap:program-to-spec — Screen mockup renderer (SVG → PNG)
//
// PURPOSE
//   Produce PNG images of Selection Screen and ALV layout for the
//   "Inputs & Screens" sheet of a generated spec xlsx. Replaces the older
//   cell-border wireframe approach (v5..v7) with embedded images.
//
// PUBLIC API
//   renderSelectionScreenSVG({ fields, blockLabels? })       → svg string
//   renderAlvLayoutSVG({ columns, sampleRows, maxRows=3 })   → svg string
//   rasterizeSvgToPng(svg, { width, height })                → Promise<Buffer|null>
//   renderScreenImages(spec)                                 → Promise<{selection,alv}|null>
//
// TOKEN ECONOMY (MANDATORY — propagated from SKILL.md)
//   · ALV sample rows capped at 3 (configurable up to 5).
//   · Minimal SVG: no gradients, no shadows, no emoji glyph payloads.
//   · Drop SVG/PNG temp files after rasterization (tmp folder auto-cleaned).
//
// FALLBACK POLICY
//   rasterizeSvgToPng returns null when no headless browser is available
//   (Edge/Chrome/Chromium not on PATH, or spawn error). Callers must
//   degrade to the legacy cell-border wireframe helpers in
//   rich-xlsx-template.mjs (screenFrameRow/screenSubtitleRow/screenMerge)
//   so spec generation never crashes on CI without Chrome.

import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir, platform } from 'node:os';
import { join } from 'node:path';
import { inflateSync, deflateSync } from 'node:zlib';

// ──────────────────────────────────────────────────────────────
// SVG templates — minimal, no gradients
// ──────────────────────────────────────────────────────────────

function xml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ──────────────────────────────────────────────────────────────
// Localized legend strings (auto-derived per spec).
// Extended by adding a new `lang` key; missing keys fall back to 'ko'.
// ──────────────────────────────────────────────────────────────
const LEGEND = {
  ko: {
    required:       '필수 입력',
    dropdown:       '▼ 복수 선택',
    range:          '~ 범위(LOW~HIGH)',
    status_done:    '완료',
    status_partial: '부분입고',
    status_open:    '미입고',
    hotspot_text:   '밑줄 파랑',
    hotspot_label:  'Hotspot (더블클릭 이동)',
    editable_cell:  '노랑 셀',
    editable_label: '편집 가능',
  },
  en: {
    required:       'Required',
    dropdown:       '▼ Multi-select',
    range:          '~ Range (LOW~HIGH)',
    status_done:    'Done',
    status_partial: 'Partial',
    status_open:    'Open',
    hotspot_text:   'Blue underline',
    hotspot_label:  '= Hotspot (click to navigate)',
    editable_cell:  'Yellow cell',
    editable_label: '= Editable',
  },
  ja: {
    required:       '必須入力',
    dropdown:       '▼ 複数選択',
    range:          '~ 範囲(LOW~HIGH)',
    status_done:    '完了',
    status_partial: '一部入荷',
    status_open:    '未入荷',
    hotspot_text:   '青下線',
    hotspot_label:  '= Hotspot (ダブルクリックで遷移)',
    editable_cell:  '黄色セル',
    editable_label: '= 編集可能',
  },
};
function legendFor(lang) { return LEGEND[lang] || LEGEND.ko; }

// Approximate pixel width of a text string at 12 px font.
// Conservative estimate: ASCII ≈ 7 px, CJK/full-width ≈ 13 px.
// Used to lay out the selection-screen label column dynamically so that
// long English labels (e.g. "Distribution Channel (S_VTWEG)") don't run
// underneath the input boxes — the previous fixed inputX=200 truncated
// anything wider than 162 px.
function approxTextWidthPx(s) {
  let w = 0;
  for (const ch of String(s ?? '')) {
    w += (ch.charCodeAt(0) > 0x7F ? 13 : 7);
  }
  return w;
}

/**
 * fields: [{
 *   required?: boolean,
 *   label: string,             e.g. '구매조직'
 *   name: string,              e.g. 'S_EKORG'
 *   range?: boolean,           true → LOW ~ HIGH two inputs
 *   note?: string,
 * }, ...]
 *
 * NOTE: `defaultLow` / `defaultHigh` are ACCEPTED in the field schema for
 *  spec documentation (they show up in the Parameters table), but they are
 *  NOT rendered inside the input-box graphic any more. The field name is
 *  already labeled next to the box; stuffing "BOM" / "1000" / "오늘" inside
 *  the input box just adds visual noise. Callers can still pass these
 *  values — the renderer silently ignores them.
 *
 * `lang` controls the bottom legend text ('ko' | 'en' | 'ja').
 */
export function renderSelectionScreenSVG({
  fields = [],
  blockLabel = '조회 조건',
  optionFields = [],
  optionBlockLabel = '옵션',
  lang = 'ko',
} = {}) {
  const L = legendFor(lang);
  const rowH = 24;
  const padTop = 40, padBottom = 60, optionBlockH = optionFields.length ? 24 + optionFields.length * rowH : 0;

  // ── Dynamic label-column layout ───────────────────────────────
  // Compute the label column's pixel width from the actual longest
  // label across BOTH the main block and the option block, then push
  // every input-box x-coord right of that so labels never overlap the
  // inputs. Minimum inputX stays at 200 to preserve the legacy look
  // for short CJK labels (typical 구매조직 (S_EKORG) ≈ 135 px).
  const LABEL_X = 38;
  const LABEL_GAP = 16;            // gap between label end and input start
  const BOX_W = 150;
  const SEP_GAP = 8;
  const allLabels = [
    ...fields.map(f => `${f.label} (${f.name})`),
    ...optionFields.map(f => `${f.label} (${f.name})`),
  ];
  const maxLabelPx = allLabels.length ? Math.max(...allLabels.map(approxTextWidthPx)) : 150;
  const inputX = Math.max(200, LABEL_X + maxLabelPx + LABEL_GAP);
  const sepX   = inputX + BOX_W + SEP_GAP;              // '~' center
  const highX  = sepX + 10;                              // HIGH box left
  const rangeDropX = highX + BOX_W + 2;                  // range dropdown
  const singleDropX = inputX + BOX_W + 2;                // single dropdown
  const rangeNoteX = rangeDropX + 28;
  const singleNoteX = singleDropX + 28;
  // Trailing note text can be up to ~200 px wide; block frame + 10 margin.
  const noteReserve = 200;
  const w = Math.max(900, rangeNoteX + noteReserve);
  const h = padTop + fields.length * rowH + padBottom + optionBlockH + 60;

  const rows = fields.map((f, i) => {
    const y = padTop + (i + 1) * rowH - 6;
    const star = f.required ? `<text x="25" y="${y}" fill="#B00020" font-weight="700">*</text>` : '';
    const label = `<text x="${LABEL_X}" y="${y}">${xml(f.label)} (${xml(f.name)})</text>`;
    if (f.range) {
      return [
        star, label,
        `<rect x="${inputX}" y="${y - 12}" width="${BOX_W}" height="16" fill="#FFF" stroke="#808080"/>`,
        `<text x="${sepX}" y="${y}" text-anchor="middle">~</text>`,
        `<rect x="${highX}" y="${y - 12}" width="${BOX_W}" height="16" fill="#FFF" stroke="#808080"/>`,
        `<rect x="${rangeDropX}" y="${y - 12}" width="16" height="16" fill="#EEE" stroke="#808080"/><text x="${rangeDropX + 8}" y="${y}" text-anchor="middle">▼</text>`,
        f.note ? `<text x="${rangeNoteX}" y="${y}" fill="#666">${xml(f.note)}</text>` : '',
      ].join('');
    }
    return [
      star, label,
      `<rect x="${inputX}" y="${y - 12}" width="${BOX_W}" height="16" fill="#FFF" stroke="#808080"/>`,
      `<rect x="${singleDropX}" y="${y - 12}" width="16" height="16" fill="#EEE" stroke="#808080"/><text x="${singleDropX + 8}" y="${y}" text-anchor="middle">▼</text>`,
      f.note ? `<text x="${singleNoteX}" y="${y}" fill="#666">${xml(f.note)}</text>` : '',
    ].join('');
  }).join('');

  const blockTop = 20;
  const blockH = padTop + fields.length * rowH + 20;
  const optBlockY = blockTop + blockH + 20;

  const optionRows = optionFields.map((f, i) => {
    const y = optBlockY + 34 + i * rowH;
    return [
      `<rect x="${inputX}" y="${y - 10}" width="12" height="12" fill="#FFF" stroke="#555"/>`,
      `<text x="${inputX + 20}" y="${y}">${xml(f.label)} (${xml(f.name)})</text>`,
      f.note ? `<text x="${inputX + 220}" y="${y}" fill="#666">${xml(f.note)}</text>` : '',
    ].join('');
  }).join('');

  const legendY = optBlockY + optionBlockH + 30;

  // Dynamic legend — only emit items that actually apply to this spec.
  // (No required fields → omit *; no ranges → omit ~; empty field set →
  // omit legend entirely.)
  const allFields = [...fields, ...optionFields];
  const legendParts = [];
  if (allFields.some(f => f.required)) legendParts.push(`<tspan fill="#B00020" font-weight="700">*</tspan> ${xml(L.required)}`);
  if (fields.length) legendParts.push(xml(L.dropdown));
  if (fields.some(f => f.range)) legendParts.push(xml(L.range));
  const legendSvg = legendParts.length
    ? `<text x="25" y="${legendY}" fill="#555" font-size="11">${legendParts.join(' · ')}</text>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Arial,sans-serif" font-size="12">
<rect width="${w}" height="${h}" fill="#FFF"/>
<rect x="10" y="${blockTop}" width="${w - 20}" height="${blockH}" fill="none" stroke="#7E9CC2"/>
<rect x="30" y="${blockTop - 8}" width="${Math.max(120, approxTextWidthPx(blockLabel) + 40)}" height="16" fill="#FFF"/>
<text x="36" y="${blockTop + 5}" font-weight="700" fill="#0A4F8C">◆ ${xml(blockLabel)}</text>
${rows}
${optionFields.length ? `
<rect x="10" y="${optBlockY}" width="${w - 20}" height="${optionBlockH}" fill="none" stroke="#7E9CC2"/>
<rect x="30" y="${optBlockY - 8}" width="${Math.max(70, approxTextWidthPx(optionBlockLabel) + 40)}" height="16" fill="#FFF"/>
<text x="36" y="${optBlockY + 5}" font-weight="700" fill="#0A4F8C">◆ ${xml(optionBlockLabel)}</text>
${optionRows}
` : ''}
${legendSvg}
</svg>`;
}

/**
 * Compute final SVG dimensions for a selection-screen spec — matches the
 * internal math of renderSelectionScreenSVG so renderScreenImages() can
 * allocate the headless browser viewport without duplicating formulas.
 */
export function selectionScreenMetrics({ fields = [], optionFields = [] } = {}) {
  const rowH = 24;
  const padTop = 40, padBottom = 60;
  const optionBlockH = optionFields.length ? 24 + optionFields.length * rowH : 0;
  const h = padTop + fields.length * rowH + padBottom + optionBlockH + 60;
  const LABEL_X = 38, LABEL_GAP = 16, BOX_W = 150, SEP_GAP = 8;
  const allLabels = [
    ...fields.map(f => `${f.label} (${f.name})`),
    ...optionFields.map(f => `${f.label} (${f.name})`),
  ];
  const maxLabelPx = allLabels.length ? Math.max(...allLabels.map(approxTextWidthPx)) : 150;
  const inputX = Math.max(200, LABEL_X + maxLabelPx + LABEL_GAP);
  const rangeNoteX = inputX + BOX_W + SEP_GAP + 10 + BOX_W + 2 + 28;
  const w = Math.max(900, rangeNoteX + 200);
  return { width: w, height: h };
}

/**
 * columns: [{ name, header, width?, align?: 'left'|'center'|'end', hotspot?, editable? }]
 * sampleRows: [{ [colName]: value, _status?: '●'|'○'|'◉', _locked?: boolean }]
 *
 * `lang` controls the bottom legend text ('ko' | 'en' | 'ja'). The legend
 * items are also **auto-derived** from the actual spec — if no column has
 * `hotspot: true`, the Hotspot item is omitted; if no column has
 * `editable: true`, the Editable item is omitted; if no `_status` column
 * exists (and no sampleRow sets `_status`), the traffic-light items are
 * omitted. When nothing applies, the legend row is skipped entirely and
 * the SVG height shrinks by ~30 px. This stops the renderer from telling
 * readers that a program has features it does not actually have.
 */
export function renderAlvLayoutSVG({ columns = [], sampleRows = [], maxRows = 3, lang = 'ko' } = {}) {
  const L = legendFor(lang);
  const rows = sampleRows.slice(0, Math.max(1, Math.min(maxRows, 5)));
  const totalW = columns.reduce((s, c) => s + (c.width || 100), 0) + 20;
  const w = Math.max(900, Math.min(totalW, 1600));
  const rowH = 24;
  const headerH = 22;
  // Spec-driven legend feature detection — only include items that apply.
  const hasStatus   = columns.some(c => c.name === '_status') || rows.some(r => r && r._status);
  const hasHotspot  = columns.some(c => c.hotspot);
  const hasEditable = columns.some(c => c.editable);
  const hasLegend   = hasStatus || hasHotspot || hasEditable;
  const legendPad   = hasLegend ? 80 : 30;
  const h = 10 + headerH + rows.length * rowH + legendPad;

  let x = 10;
  const colX = columns.map(c => { const left = x; x += (c.width || 100); return left; });
  const gridRight = x;

  const headerCells = columns.map((c, i) => {
    const cx = colX[i] + (c.width || 100) / 2;
    return `<text x="${cx}" y="${10 + headerH - 7}" text-anchor="middle" font-weight="700" fill="#0A4F8C">${xml(c.header || c.name)}</text>`;
  }).join('');

  const sepLines = colX.slice(1).map(lx =>
    `<line x1="${lx}" y1="10" x2="${lx}" y2="${10 + headerH + rows.length * rowH}" stroke="#C8D4E2"/>`).join('');

  const dataRows = rows.map((r, rIdx) => {
    const y = 10 + headerH + rIdx * rowH;
    const bg = r._locked ? '#F0F5FA' : (rIdx % 2 === 1 ? '#F5F9FC' : '#FFF');
    const bandBg = rIdx % 2 === 1 || r._locked
      ? `<rect x="10" y="${y}" width="${gridRight - 10}" height="${rowH}" fill="${bg}"/>` : '';
    const cells = columns.map((c, ci) => {
      const cx = colX[ci] + (c.width || 100) / 2;
      const leftX = colX[ci] + 8, rightX = colX[ci] + (c.width || 100) - 8;
      const cy = y + rowH - 8;
      const val = r[c.name];
      const statusFill = { '●': '#D4A017', '○': '#C0392B', '◉': '#1E8449' };
      if (c.name === '_status' || c.editable) {
        if (c.editable) {
          const editBg = r._locked ? '#E5E5E5' : '#FFF6C8';
          const editStroke = r._locked ? '#999' : '#A67F25';
          return `<rect x="${colX[ci] + 2}" y="${y + 3}" width="${(c.width || 100) - 4}" height="${rowH - 6}" fill="${editBg}" stroke="${editStroke}"/>`
            + (val !== undefined ? `<text x="${rightX}" y="${cy}" text-anchor="end" font-family="monospace" fill="${r._locked ? '#888' : '#000'}">${xml(val)}</text>` : '');
        }
      }
      if (val === undefined || val === null || val === '') return '';
      const strVal = String(val);
      if (c.name === '_status') {
        return `<text x="${cx}" y="${cy}" text-anchor="middle" fill="${statusFill[strVal] || '#555'}" font-weight="700">${xml(strVal)}</text>`;
      }
      if (c.hotspot) {
        return `<text x="${cx}" y="${cy}" text-anchor="middle" font-family="monospace" fill="#1F5AA0" text-decoration="underline">${xml(strVal)}</text>`;
      }
      const anchor = c.align === 'end' ? 'end' : (c.align === 'left' ? 'start' : 'middle');
      const tx = anchor === 'end' ? rightX : anchor === 'start' ? leftX : cx;
      const fam = /^[\d.,\-]+$/.test(strVal) ? 'monospace' : 'Arial,sans-serif';
      return `<text x="${tx}" y="${cy}" text-anchor="${anchor}" font-family="${fam}">${xml(strVal)}</text>`;
    }).join('');
    return bandBg + cells;
  }).join('');

  const legendY = 10 + headerH + rows.length * rowH + 30;

  const legendParts = [];
  if (hasStatus) {
    legendParts.push(
      `<tspan fill="#1E8449" font-weight="700">◉</tspan> ${xml(L.status_done)}`,
      `<tspan fill="#D4A017" font-weight="700">●</tspan> ${xml(L.status_partial)}`,
      `<tspan fill="#C0392B" font-weight="700">○</tspan> ${xml(L.status_open)}`,
    );
  }
  if (hasHotspot)  legendParts.push(`<tspan fill="#1F5AA0" text-decoration="underline">${xml(L.hotspot_text)}</tspan> ${xml(L.hotspot_label)}`);
  if (hasEditable) legendParts.push(`<tspan>${xml(L.editable_cell)}</tspan> ${xml(L.editable_label)}`);
  const legendSvg = hasLegend
    ? `<text x="10" y="${legendY}" font-size="11" fill="#555">${legendParts.join(' · ')}</text>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Arial,sans-serif" font-size="12">
<rect width="${w}" height="${h}" fill="#FFF"/>
<rect x="10" y="10" width="${gridRight - 10}" height="${headerH}" fill="#D0DEED" stroke="#3E7DB3"/>
${headerCells}
${dataRows}
<rect x="10" y="10" width="${gridRight - 10}" height="${headerH + rows.length * rowH}" fill="none" stroke="#C8D4E2"/>
${sepLines}
${legendSvg}
</svg>`;
}

/**
 * ALV layout dimensions — mirrors the formulas in renderAlvLayoutSVG so
 * callers (renderScreenImages) can size the headless browser viewport
 * without duplicating the feature-detection logic.
 */
export function alvLayoutMetrics({ columns = [], sampleRows = [], maxRows = 3 } = {}) {
  const rows = sampleRows.slice(0, Math.max(1, Math.min(maxRows, 5)));
  const totalW = columns.reduce((s, c) => s + (c.width || 100), 0) + 20;
  const w = Math.max(900, Math.min(totalW, 1600));
  const hasStatus   = columns.some(c => c.name === '_status') || rows.some(r => r && r._status);
  const hasHotspot  = columns.some(c => c.hotspot);
  const hasEditable = columns.some(c => c.editable);
  const legendPad   = (hasStatus || hasHotspot || hasEditable) ? 80 : 30;
  const h = 10 + 22 + rows.length * 24 + legendPad;
  return { width: w, height: h };
}

// ──────────────────────────────────────────────────────────────
// Rasterizer — headless Edge/Chrome/Chromium
// ──────────────────────────────────────────────────────────────

function findBrowser() {
  const candidates = platform() === 'win32'
    ? [
      // Edge (modern x64 install path) — Win11 default location since 2022.
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      // Edge (legacy WOW6432 install path) — older Win10 / downgraded installs.
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      // Chrome (both bitness variants).
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ]
    : platform() === 'darwin'
      ? [
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      ]
      : ['google-chrome', 'chromium', 'chromium-browser', 'microsoft-edge'];
  for (const p of candidates) {
    if (p.includes('/') || p.includes('\\')) {
      if (existsSync(p)) return p;
    } else {
      const r = spawnSync('which', [p]);
      if (r.status === 0 && r.stdout?.toString().trim()) return p;
    }
  }
  return null;
}

// ──────────────────────────────────────────────────────────────
// PNG top-left crop — used by rasterizeSvgToPng to strip the browser-
// chrome reservation that Chrome/Edge subtracts from --window-size.
// Pure zlib + Buffer, no native deps.
// ──────────────────────────────────────────────────────────────
const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();
function pngCrc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const payload = Buffer.concat([typeBuf, data]);
  const lenBuf = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(pngCrc32(payload), 0);
  return Buffer.concat([lenBuf, payload, crcBuf]);
}
/**
 * Crop an 8-bit, non-interlaced PNG to its top-left (targetW × targetH).
 * All PNG filter modes (None/Sub/Up/Average/Paeth) reference only LEFT
 * and ABOVE pixels, so keeping the top-left rectangle with its original
 * filter bytes is lossless — no need to re-filter the scanlines.
 * Chrome/Edge headless screenshots are always 8-bit RGB/RGBA non-interlaced
 * so this covers every case rasterizeSvgToPng produces. Throws on unknown
 * PNG shape; caller falls back to returning the unprocessed buffer.
 */
function cropPngTopLeft(pngBuf, targetW, targetH) {
  if (!pngBuf.slice(0, 8).equals(PNG_SIG)) throw new Error('not a PNG');
  let idx = 8;
  let ihdr = null;
  const idatParts = [];
  const preChunks = [];
  while (idx < pngBuf.length) {
    const len = pngBuf.readUInt32BE(idx);
    const type = pngBuf.toString('ascii', idx + 4, idx + 8);
    const data = pngBuf.slice(idx + 8, idx + 8 + len);
    if (type === 'IHDR') ihdr = data;
    else if (type === 'IDAT') idatParts.push(data);
    else if (type === 'IEND') break;
    else if (idatParts.length === 0) preChunks.push({ type, data });
    idx += 8 + len + 4;
  }
  if (!ihdr || idatParts.length === 0) throw new Error('invalid PNG');
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr.readUInt8(8);
  const colorType = ihdr.readUInt8(9);
  const interlace = ihdr.readUInt8(12);
  if (bitDepth !== 8 || interlace !== 0) throw new Error('unsupported PNG variant');
  const bppMap = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
  const bpp = bppMap[colorType];
  if (!bpp) throw new Error('unsupported PNG color type ' + colorType);
  if (targetW >= width && targetH >= height) return pngBuf;
  const cropW = Math.min(targetW, width);
  const cropH = Math.min(targetH, height);
  const raw = inflateSync(Buffer.concat(idatParts));
  const oldRowBytes = 1 + width * bpp;
  const newRowBytes = 1 + cropW * bpp;
  const newRaw = Buffer.alloc(cropH * newRowBytes);
  for (let r = 0; r < cropH; r++) {
    newRaw[r * newRowBytes] = raw[r * oldRowBytes];
    raw.copy(newRaw, r * newRowBytes + 1, r * oldRowBytes + 1, r * oldRowBytes + 1 + cropW * bpp);
  }
  const newIdat = deflateSync(newRaw);
  const newIhdr = Buffer.from(ihdr);
  newIhdr.writeUInt32BE(cropW, 0);
  newIhdr.writeUInt32BE(cropH, 4);
  const parts = [PNG_SIG, pngChunk('IHDR', newIhdr)];
  for (const c of preChunks) parts.push(pngChunk(c.type, c.data));
  parts.push(pngChunk('IDAT', newIdat));
  parts.push(pngChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

// ──────────────────────────────────────────────────────────────
// Browser-chrome compensation.
//
// Even in headless mode, Chrome/Edge reserves pixels for the title bar,
// tab strip, omnibox, and scrollbar gutter, so a `--window-size=W,H`
// produces an INNER viewport of ~(W-24) × (H-92). Probed on Edge 147
// (both legacy `--headless` and `--headless=new`) — and the same
// subtraction has been present since Chrome 60+ on Windows.
//
// Result (without compensation): a 900×328 window renders the first
// 876×236 pixels of content, and the remaining 64w × 92h area of the
// screenshot is painted with body background (white). Users reported it
// as "image cut off halfway with blank below".
//
// Fix: pad the window by (W_SLACK, H_SLACK) — both generous (~1.5× the
// observed miss) to absorb version drift — then crop the resulting PNG
// back to exactly the requested W × H. The chrome-reserved area is
// outside the crop box, so users see a pixel-perfect target-size PNG.
// ──────────────────────────────────────────────────────────────
const CHROME_W_SLACK = 40;
const CHROME_H_SLACK = 140;

export async function rasterizeSvgToPng(svg, { width, height } = {}) {
  const browser = findBrowser();
  if (!browser) return null;
  const dir = mkdtempSync(join(tmpdir(), 'sc4sap-svg-'));
  try {
    const htmlPath = join(dir, 'in.html');
    const pngPath = join(dir, 'out.png');
    // INLINE the SVG into the HTML body (rather than <img src="in.svg">)
    // so the browser paints it synchronously with the initial parse. This
    // eliminates a load-vs-paint race that could also clip the output.
    const svgInline = String(svg).replace(/^<\?xml[^?]*\?>\s*/, '');
    writeFileSync(
      htmlPath,
      `<!doctype html><html><head><meta charset="utf-8">`
        + `<style>html,body{margin:0;padding:0;background:#fff}svg{display:block}</style>`
        + `</head><body>${svgInline}</body></html>`,
      'utf8',
    );
    const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
    const winW = width + CHROME_W_SLACK;
    const winH = height + CHROME_H_SLACK;
    // Async spawn — allows the caller to Promise.all() multiple rasterize jobs
    // in parallel (selection + ALV) so two headless browsers run concurrently.
    await new Promise((resolve, reject) => {
      const child = spawn(browser, [
        '--headless', '--disable-gpu', '--hide-scrollbars',
        // Pin DPR=1 so --window-size pixels map 1:1 to the screenshot
        // regardless of the host's Windows display scaling (125 % / 150 %).
        '--force-device-scale-factor=1',
        '--default-background-color=FFFFFFFF',
        `--screenshot=${pngPath}`,
        `--window-size=${winW},${winH}`,
        fileUrl,
      ], { windowsHide: true, stdio: 'ignore' });
      const timer = setTimeout(() => {
        try { child.kill('SIGKILL'); } catch { /* ignore */ }
        reject(new Error('headless browser timeout (30s)'));
      }, 30000);
      child.once('exit', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`headless browser exited with code ${code}`));
      });
      child.once('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
    if (!existsSync(pngPath)) return null;
    const padded = readFileSync(pngPath);
    // Crop off the chrome-slack padding so callers get an exact W × H PNG.
    try {
      return cropPngTopLeft(padded, width, height);
    } catch {
      // On any unexpected PNG shape, fall back to the padded buffer rather
      // than losing the render entirely — oversized but visually complete.
      return padded;
    }
  } catch {
    return null;
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

/**
 * Convenience — render both screens from a spec dict.
 * spec: { selection: { fields, optionFields, ... }, alv: { columns, sampleRows, maxRows? }, lang? }
 * Returns { selection: { pngBuffer, width, height } | null, alv: { ... } | null }.
 * Null values signal the caller to fall back to cell-border wireframes.
 *
 * `lang` is forwarded to both sub-renderers so the auto-derived legends
 * come out in the spec's language. When absent it defaults to 'ko' inside
 * the renderers, preserving backward-compatible behaviour.
 */
export async function renderScreenImages({ selection, alv, lang = 'ko' } = {}) {
  const out = { selection: null, alv: null };
  // PARALLEL RENDERING — selection + ALV rasterize concurrently.
  // Each rasterizeSvgToPng() spawns its own headless browser process, so
  // Promise.all() cuts wall-clock time roughly in half (~3s → ~3s instead
  // of ~6s on Windows/Edge). Each task is self-contained: a rasterize
  // failure or timeout in one does not affect the other — the output of
  // the failed branch simply stays null and the caller falls back to the
  // cell-border wireframe for that section only.
  const tasks = [];
  if (selection) {
    tasks.push((async () => {
      try {
        const svg = renderSelectionScreenSVG({ ...selection, lang });
        // Use the shared metrics helper so we stay in lockstep with the
        // renderer's actual layout — avoids the bug where a longer label
        // widened the SVG but the viewport stayed at 900 and cropped it.
        const { width, height } = selectionScreenMetrics(selection);
        const png = await rasterizeSvgToPng(svg, { width, height });
        if (png) out.selection = { pngBuffer: png, width, height };
      } catch { /* keep selection null → wireframe fallback */ }
    })());
  }
  if (alv) {
    tasks.push((async () => {
      try {
        const svg = renderAlvLayoutSVG({ ...alv, lang });
        const { width, height } = alvLayoutMetrics(alv);
        const png = await rasterizeSvgToPng(svg, { width, height });
        if (png) out.alv = { pngBuffer: png, width, height };
      } catch { /* keep alv null → wireframe fallback */ }
    })());
  }
  await Promise.all(tasks);
  return out;
}
