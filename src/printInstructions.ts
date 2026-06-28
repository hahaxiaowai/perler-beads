import type { BoardLayout, ColorInventoryRow } from './patternExport'

export type PrintableInstructionsOptions = {
  title: string
  width: number
  height: number
  gridImageDataUrl: string
  inventory: ColorInventoryRow[]
  boardLayout: BoardLayout
}

export function buildPrintableInstructionsHtml(options: PrintableInstructionsOptions) {
  const title = escapeHtml(options.title || 'Perler pattern')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 32px;
      color: #24201b;
      background: #fffdf8;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    h1,
    h2,
    p {
      margin-top: 0;
    }
    h1 {
      margin-bottom: 8px;
      font-size: 28px;
    }
    .summary {
      margin-bottom: 24px;
      color: #5f554a;
      font-weight: 700;
    }
    .pattern {
      max-width: 100%;
      border: 2px solid #27221d;
      image-rendering: pixelated;
    }
    table {
      width: 100%;
      margin: 24px 0;
      border-collapse: collapse;
    }
    th,
    td {
      padding: 8px;
      border: 1px solid #d6d0c4;
      text-align: left;
    }
    th {
      background: #f7f3ea;
    }
    .swatch {
      display: inline-block;
      width: 16px;
      height: 16px;
      margin-right: 8px;
      border: 1px solid #27221d;
      vertical-align: middle;
    }
    .boards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px;
      padding: 0;
      list-style: none;
    }
    .boards li {
      padding: 10px;
      border: 1px solid #d6d0c4;
      border-radius: 8px;
    }
    @media print {
      body {
        padding: 18px;
      }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="summary">${options.width} x ${options.height} beads · ${options.boardLayout.totalBoards} boards · ${options.boardLayout.columns} x ${options.boardLayout.rows}</p>
  <img class="pattern" alt="${title}" src="${escapeAttribute(options.gridImageDataUrl)}">
  <h2>Color inventory</h2>
  <table>
    <thead>
      <tr>
        <th>Color</th>
        <th>Hex</th>
        <th>Count</th>
        <th>Share</th>
      </tr>
    </thead>
    <tbody>
      ${options.inventory.map(renderInventoryRow).join('\n      ')}
    </tbody>
  </table>
  <h2>Board layout</h2>
  <p>${options.boardLayout.boardSize} x ${options.boardLayout.boardSize} board sections</p>
  <ol class="boards">
    ${options.boardLayout.sections.map(renderBoardSection).join('\n    ')}
  </ol>
</body>
</html>
`
}

export function getInstructionsFileName(sourceName: string, width: number, height: number) {
  const baseName = sourceName
    .trim()
    .replace(/\.perler\.json$/i, '')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${baseName || 'perler-pattern'}-${width}x${height}-instructions.html`
}

function renderInventoryRow(color: ColorInventoryRow) {
  const name = escapeHtml(color.name)
  const hex = escapeHtml(color.hex)
  return `<tr>
        <td><span class="swatch" style="background:${escapeAttribute(color.hex)}"></span>${name}</td>
        <td>${hex}</td>
        <td>${color.count}</td>
        <td>${color.percentage}%</td>
      </tr>`
}

function renderBoardSection(section: BoardLayout['sections'][number]) {
  return `<li><strong>Board ${section.index}</strong><br>X ${section.startX}-${section.endX}, Y ${section.startY}-${section.endY}</li>`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, '&#96;')
}
