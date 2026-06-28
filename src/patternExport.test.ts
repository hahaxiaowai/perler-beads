import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildColorInventory,
  createGridPatternCanvas,
  getBoardLayout,
  getGridPatternSize,
} from './patternExport'
import type { RgbColor, UsedColor } from './imageProcessing'

describe('pattern export', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds color inventory rows with palette names and percentages', () => {
    const palette: RgbColor[] = [
      { name: 'Red', hex: '#ff0000', r: 255, g: 0, b: 0 },
      { name: 'Blue', hex: '#0000ff', r: 0, g: 0, b: 255 },
    ]
    const usedColors: UsedColor[] = [
      { hex: '#ff0000', count: 6 },
      { hex: '#123456', count: 2 },
    ]

    expect(buildColorInventory(usedColors, 10, palette)).toEqual([
      { hex: '#ff0000', name: 'Red', count: 6, percentage: 60 },
      { hex: '#123456', name: 'Custom color', count: 2, percentage: 20 },
    ])
  })

  it('calculates a scaled grid export size including the final grid line', () => {
    expect(getGridPatternSize(12, 8, 18)).toEqual({
      width: 217,
      height: 145,
    })
  })

  it('splits a pattern into board-sized sections', () => {
    expect(getBoardLayout(60, 35, 29)).toEqual({
      boardSize: 29,
      columns: 3,
      rows: 2,
      totalBoards: 6,
      sections: [
        { index: 1, column: 1, row: 1, startX: 1, endX: 29, startY: 1, endY: 29, width: 29, height: 29 },
        { index: 2, column: 2, row: 1, startX: 30, endX: 58, startY: 1, endY: 29, width: 29, height: 29 },
        { index: 3, column: 3, row: 1, startX: 59, endX: 60, startY: 1, endY: 29, width: 2, height: 29 },
        { index: 4, column: 1, row: 2, startX: 1, endX: 29, startY: 30, endY: 35, width: 29, height: 6 },
        { index: 5, column: 2, row: 2, startX: 30, endX: 58, startY: 30, endY: 35, width: 29, height: 6 },
        { index: 6, column: 3, row: 2, startX: 59, endX: 60, startY: 30, endY: 35, width: 2, height: 6 },
      ],
    })
  })

  it('creates a pixelated grid pattern canvas', () => {
    const calls: string[] = []
    const context = {
      set fillStyle(value: string) {
        calls.push(`fillStyle:${value}`)
      },
      set imageSmoothingEnabled(value: boolean) {
        calls.push(`imageSmoothingEnabled:${value}`)
      },
      set lineWidth(value: number) {
        calls.push(`lineWidth:${value}`)
      },
      set strokeStyle(value: string) {
        calls.push(`strokeStyle:${value}`)
      },
      beginPath: vi.fn(() => calls.push('beginPath')),
      drawImage: vi.fn(() => calls.push('drawImage')),
      fillRect: vi.fn(() => calls.push('fillRect')),
      lineTo: vi.fn((x: number, y: number) => calls.push(`lineTo:${x},${y}`)),
      moveTo: vi.fn((x: number, y: number) => calls.push(`moveTo:${x},${y}`)),
      stroke: vi.fn(() => calls.push('stroke')),
    }
    const createdCanvas = {
      height: 0,
      width: 0,
      getContext: vi.fn(() => context),
    }
    vi.stubGlobal('document', {
      createElement: vi.fn(() => createdCanvas),
    })

    const sourceCanvas = { height: 3, width: 2 } as HTMLCanvasElement
    const result = createGridPatternCanvas(sourceCanvas, { cellSize: 12, majorLineEvery: 2 })

    expect(result.width).toBe(25)
    expect(result.height).toBe(37)
    expect(context.drawImage).toHaveBeenCalledWith(sourceCanvas, 0, 0, 24, 36)
    expect(calls).toContain('imageSmoothingEnabled:false')
    expect(calls).toContain('moveTo:12.5,0')
    expect(calls).toContain('moveTo:0,24.5')
    expect(calls).toContain('lineWidth:2')
  })
})
