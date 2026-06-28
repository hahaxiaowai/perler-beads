import { describe, expect, it } from 'vitest'
import { buildPrintableInstructionsHtml, getInstructionsFileName } from './printInstructions'
import type { BoardLayout, ColorInventoryRow } from './patternExport'

const inventory: ColorInventoryRow[] = [
  { hex: '#ff0000', name: 'Red', count: 12, percentage: 75 },
  { hex: '#0000ff', name: 'Blue', count: 4, percentage: 25 },
]

const boardLayout: BoardLayout = {
  boardSize: 29,
  columns: 2,
  rows: 1,
  totalBoards: 2,
  sections: [
    { index: 1, column: 1, row: 1, startX: 1, endX: 29, startY: 1, endY: 16, width: 29, height: 16 },
    { index: 2, column: 2, row: 1, startX: 30, endX: 32, startY: 1, endY: 16, width: 3, height: 16 },
  ],
}

describe('printable instructions', () => {
  it('builds a standalone printable HTML document with image, inventory, and board sections', () => {
    const html = buildPrintableInstructionsHtml({
      title: 'Cat pattern',
      width: 32,
      height: 16,
      gridImageDataUrl: 'data:image/png;base64,abc',
      inventory,
      boardLayout,
    })

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('<title>Cat pattern</title>')
    expect(html).toContain('32 x 16 beads')
    expect(html).toContain('data:image/png;base64,abc')
    expect(html).toContain('#ff0000')
    expect(html).toContain('Red')
    expect(html).toContain('12')
    expect(html).toContain('Board 2')
    expect(html).toContain('X 30-32, Y 1-16')
  })

  it('escapes user-controlled text before embedding it in HTML', () => {
    const html = buildPrintableInstructionsHtml({
      title: '<script>alert(1)</script>',
      width: 1,
      height: 1,
      gridImageDataUrl: 'data:image/png;base64,abc',
      inventory: [{ hex: '#ffffff', name: '<White>', count: 1, percentage: 100 }],
      boardLayout: {
        boardSize: 29,
        columns: 1,
        rows: 1,
        totalBoards: 1,
        sections: [
          { index: 1, column: 1, row: 1, startX: 1, endX: 1, startY: 1, endY: 1, width: 1, height: 1 },
        ],
      },
    })

    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;White&gt;')
  })

  it('creates a safe printable instructions filename', () => {
    expect(getInstructionsFileName('Cat Face.PNG', 32, 16)).toBe('cat-face-32x16-instructions.html')
    expect(getInstructionsFileName('cat-face.perler.json', 32, 16)).toBe('cat-face-32x16-instructions.html')
    expect(getInstructionsFileName('', 8, 8)).toBe('perler-pattern-8x8-instructions.html')
  })
})
