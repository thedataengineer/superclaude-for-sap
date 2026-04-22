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

import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir, platform } from 'node:os';
import { join } from 'node:path';

// ──────────────────────────────────────────────────────────────
// SVG templates — minimal, no gradients
// ──────────────────────────────────────────────────────────────

function xml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * fields: [{
 *   required?: boolean,
 *   label: string,             e.g. '구매조직'
 *   name: string,              e.g. 'S_EKORG'
 *   range?: boolean,           true → LOW ~ HIGH two inputs
 *   defaultLow?: string, defaultHigh?: string,
 *   note?: string,
 * }, ...]
 */
export function renderSelectionScreenSVG({ fields = [], blockLabel = '조회 조건', optionFields = [], optionBlockLabel = '옵션' } = {}) {
  const rowH = 24;
  const padTop = 40, padBottom = 60, optionBlockH = optionFields.length ? 24 + optionFields.length * rowH : 0;
  const h = padTop + fields.length * rowH + padBottom + optionBlockH + 60;
  const w = 900;

  const rows = fields.map((f, i) => {
    const y = padTop + (i + 1) * rowH - 6;
    const star = f.required ? `<text x="25" y="${y}" fill="#B00020" font-weight="700">*</text>` : '';
    const label = `<text x="38" y="${y}">${xml(f.label)} (${xml(f.name)})</text>`;
    if (f.range) {
      return [
        star, label,
        `<rect x="200" y="${y - 12}" width="150" height="16" fill="#FFF" stroke="#808080"/>`,
        f.defaultLow ? `<text x="205" y="${y}" font-family="monospace" fill="#0A4F8C">${xml(f.defaultLow)}</text>` : '',
        `<text x="358" y="${y}" text-anchor="middle">~</text>`,
        `<rect x="368" y="${y - 12}" width="150" height="16" fill="#FFF" stroke="#808080"/>`,
        f.defaultHigh ? `<text x="373" y="${y}" font-family="monospace" fill="#0A4F8C">${xml(f.defaultHigh)}</text>` : '',
        `<rect x="520" y="${y - 12}" width="16" height="16" fill="#EEE" stroke="#808080"/><text x="528" y="${y}" text-anchor="middle">▼</text>`,
        f.note ? `<text x="548" y="${y}" fill="#666">${xml(f.note)}</text>` : '',
      ].join('');
    }
    return [
      star, label,
      `<rect x="200" y="${y - 12}" width="150" height="16" fill="#FFF" stroke="#808080"/>`,
      f.defaultLow ? `<text x="205" y="${y}" font-family="monospace" fill="#0A4F8C">${xml(f.defaultLow)}</text>` : '',
      `<rect x="352" y="${y - 12}" width="16" height="16" fill="#EEE" stroke="#808080"/><text x="360" y="${y}" text-anchor="middle">▼</text>`,
      f.note ? `<text x="380" y="${y}" fill="#666">${xml(f.note)}</text>` : '',
    ].join('');
  }).join('');

  const blockTop = 20;
  const blockH = padTop + fields.length * rowH + 20;
  const optBlockY = blockTop + blockH + 20;

  const optionRows = optionFields.map((f, i) => {
    const y = optBlockY + 34 + i * rowH;
    return [
      `<rect x="200" y="${y - 10}" width="12" height="12" fill="#FFF" stroke="#555"/>`,
      `<text x="220" y="${y}">${xml(f.label)} (${xml(f.name)})</text>`,
      f.note ? `<text x="420" y="${y}" fill="#666">${xml(f.note)}</text>` : '',
    ].join('');
  }).join('');

  const legendY = optBlockY + optionBlockH + 30;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Arial,sans-serif" font-size="12">
<rect width="${w}" height="${h}" fill="#FFF"/>
<rect x="10" y="${blockTop}" width="${w - 20}" height="${blockH}" fill="none" stroke="#7E9CC2"/>
<rect x="30" y="${blockTop - 8}" width="120" height="16" fill="#FFF"/>
<text x="36" y="${blockTop + 5}" font-weight="700" fill="#0A4F8C">◆ ${xml(blockLabel)}</text>
${rows}
${optionFields.length ? `
<rect x="10" y="${optBlockY}" width="${w - 20}" height="${optionBlockH}" fill="none" stroke="#7E9CC2"/>
<rect x="30" y="${optBlockY - 8}" width="70" height="16" fill="#FFF"/>
<text x="36" y="${optBlockY + 5}" font-weight="700" fill="#0A4F8C">◆ ${xml(optionBlockLabel)}</text>
${optionRows}
` : ''}
<text x="25" y="${legendY}" fill="#555" font-size="11"><tspan fill="#B00020" font-weight="700">*</tspan> 필수 입력 · ▼ 복수 선택 · ~ 범위(LOW~HIGH)</text>
</svg>`;
}

/**
 * columns: [{ name, header, width?, align?: 'left'|'center'|'end', hotspot?, editable? }]
 * sampleRows: [{ [colName]: value, _status?: '●'|'○'|'◉', _locked?: boolean }]
 */
export function renderAlvLayoutSVG({ columns = [], sampleRows = [], maxRows = 3 } = {}) {
  const rows = sampleRows.slice(0, Math.max(1, Math.min(maxRows, 5)));
  const totalW = columns.reduce((s, c) => s + (c.width || 100), 0) + 20;
  const w = Math.max(900, Math.min(totalW, 1600));
  const rowH = 24;
  const headerH = 22;
  const h = 10 + headerH + rows.length * rowH + 80;

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

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Arial,sans-serif" font-size="12">
<rect width="${w}" height="${h}" fill="#FFF"/>
<rect x="10" y="10" width="${gridRight - 10}" height="${headerH}" fill="#D0DEED" stroke="#3E7DB3"/>
${headerCells}
${dataRows}
<rect x="10" y="10" width="${gridRight - 10}" height="${headerH + rows.length * rowH}" fill="none" stroke="#C8D4E2"/>
${sepLines}
<text x="10" y="${legendY}" font-size="11" fill="#555">
  <tspan fill="#1E8449" font-weight="700">◉</tspan> 완료 · <tspan fill="#D4A017" font-weight="700">●</tspan> 부분입고 · <tspan fill="#C0392B" font-weight="700">○</tspan> 미입고 · <tspan fill="#1F5AA0" text-decoration="underline">밑줄 파랑</tspan> Hotspot · <tspan>노랑 셀</tspan> 편집가능
</text>
</svg>`;
}

// ──────────────────────────────────────────────────────────────
// Rasterizer — headless Edge/Chrome/Chromium
// ──────────────────────────────────────────────────────────────

function findBrowser() {
  const candidates = platform() === 'win32'
    ? [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
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

export async function rasterizeSvgToPng(svg, { width, height } = {}) {
  const browser = findBrowser();
  if (!browser) return null;
  const dir = mkdtempSync(join(tmpdir(), 'sc4sap-svg-'));
  try {
    const svgPath = join(dir, 'in.svg');
    const htmlPath = join(dir, 'in.html');
    const pngPath = join(dir, 'out.png');
    writeFileSync(svgPath, svg, 'utf8');
    writeFileSync(htmlPath, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff}</style></head><body><img src="in.svg" width="${width}" height="${height}"></body></html>`, 'utf8');
    const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
    const r = spawnSync(browser, [
      '--headless', '--disable-gpu', '--hide-scrollbars',
      '--default-background-color=00FFFFFF',
      `--screenshot=${pngPath}`,
      `--window-size=${width},${height}`,
      fileUrl,
    ], { timeout: 30000 });
    if (r.status !== 0 || !existsSync(pngPath)) return null;
    return readFileSync(pngPath);
  } catch {
    return null;
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

/**
 * Convenience — render both screens from a spec dict.
 * spec: { selection: { fields, optionFields, ... }, alv: { columns, sampleRows, maxRows? } }
 * Returns { selection: { pngBuffer, width, height } | null, alv: { ... } | null }.
 * Null values signal the caller to fall back to cell-border wireframes.
 */
export async function renderScreenImages({ selection, alv } = {}) {
  const out = { selection: null, alv: null };
  if (selection) {
    const svg = renderSelectionScreenSVG(selection);
    const selWidth = 900;
    // Height matches the SVG's computed height (keep in sync with template).
    const selHeight = 40 + (selection.fields?.length || 0) * 24
      + 60 + (selection.optionFields?.length ? 24 + selection.optionFields.length * 24 : 0) + 60;
    const png = await rasterizeSvgToPng(svg, { width: selWidth, height: selHeight });
    if (png) out.selection = { pngBuffer: png, width: selWidth, height: selHeight };
  }
  if (alv) {
    const cols = alv.columns || [];
    const totalW = cols.reduce((s, c) => s + (c.width || 100), 0) + 20;
    const alvWidth = Math.max(900, Math.min(totalW, 1600));
    const rows = Math.min((alv.sampleRows || []).length, Math.max(1, Math.min(alv.maxRows || 3, 5)));
    const alvHeight = 10 + 22 + rows * 24 + 80;
    const svg = renderAlvLayoutSVG(alv);
    const png = await rasterizeSvgToPng(svg, { width: alvWidth, height: alvHeight });
    if (png) out.alv = { pngBuffer: png, width: alvWidth, height: alvHeight };
  }
  return out;
}
