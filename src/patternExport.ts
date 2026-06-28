import type { RgbColor, UsedColor } from './imageProcessing'

export type ColorInventoryRow = {
  hex: string
  name: string
  count: number
  percentage: number
}

export type GridPatternOptions = {
  cellSize?: number
  majorLineEvery?: number
}

export type BoardSection = {
  index: number
  column: number
  row: number
  startX: number
  endX: number
  startY: number
  endY: number
  width: number
  height: number
}

export type BoardLayout = {
  boardSize: number
  columns: number
  rows: number
  totalBoards: number
  sections: BoardSection[]
}

const DEFAULT_CELL_SIZE = 18
const DEFAULT_MAJOR_LINE_EVERY = 5
export const DEFAULT_BOARD_SIZE = 29

export function buildColorInventory(
  usedColors: UsedColor[],
  totalPixels: number,
  palette: RgbColor[],
): ColorInventoryRow[] {
  const paletteByHex = new Map(palette.map((color) => [color.hex.toLowerCase(), color.name]))

  return usedColors.map((color) => ({
    hex: color.hex,
    name: color.name ?? paletteByHex.get(color.hex.toLowerCase()) ?? 'Custom color',
    count: color.count,
    percentage: totalPixels > 0 ? Math.round((color.count / totalPixels) * 1000) / 10 : 0,
  }))
}

export function getGridPatternSize(width: number, height: number, cellSize = DEFAULT_CELL_SIZE) {
  return {
    width: width * cellSize + 1,
    height: height * cellSize + 1,
  }
}

export function getBoardLayout(width: number, height: number, boardSize = DEFAULT_BOARD_SIZE): BoardLayout {
  const safeWidth = Math.max(0, Math.round(width))
  const safeHeight = Math.max(0, Math.round(height))
  const safeBoardSize = Math.max(1, Math.round(boardSize))
  const columns = Math.ceil(safeWidth / safeBoardSize)
  const rows = Math.ceil(safeHeight / safeBoardSize)
  const sections: BoardSection[] = []

  for (let row = 1; row <= rows; row += 1) {
    for (let column = 1; column <= columns; column += 1) {
      const startX = (column - 1) * safeBoardSize + 1
      const startY = (row - 1) * safeBoardSize + 1
      const endX = Math.min(column * safeBoardSize, safeWidth)
      const endY = Math.min(row * safeBoardSize, safeHeight)

      sections.push({
        index: sections.length + 1,
        column,
        row,
        startX,
        endX,
        startY,
        endY,
        width: Math.max(0, endX - startX + 1),
        height: Math.max(0, endY - startY + 1),
      })
    }
  }

  return {
    boardSize: safeBoardSize,
    columns,
    rows,
    totalBoards: sections.length,
    sections,
  }
}

export function createGridPatternCanvas(sourceCanvas: HTMLCanvasElement, options: GridPatternOptions = {}) {
  const cellSize = options.cellSize ?? DEFAULT_CELL_SIZE
  const majorLineEvery = options.majorLineEvery ?? DEFAULT_MAJOR_LINE_EVERY
  const gridSize = getGridPatternSize(sourceCanvas.width, sourceCanvas.height, cellSize)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas is not supported in this browser.')
  }

  canvas.width = gridSize.width
  canvas.height = gridSize.height
  context.fillStyle = '#fffaf0'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.imageSmoothingEnabled = false
  context.drawImage(sourceCanvas, 0, 0, sourceCanvas.width * cellSize, sourceCanvas.height * cellSize)

  drawGridLines(context, sourceCanvas.width, sourceCanvas.height, cellSize, majorLineEvery)

  return canvas
}

function drawGridLines(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number,
  majorLineEvery: number,
) {
  for (let column = 0; column <= width; column += 1) {
    drawGridLine(
      context,
      column * cellSize + 0.5,
      0,
      column * cellSize + 0.5,
      height * cellSize,
      column % majorLineEvery === 0,
    )
  }

  for (let row = 0; row <= height; row += 1) {
    drawGridLine(
      context,
      0,
      row * cellSize + 0.5,
      width * cellSize,
      row * cellSize + 0.5,
      row % majorLineEvery === 0,
    )
  }
}

function drawGridLine(
  context: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  isMajorLine: boolean,
) {
  context.beginPath()
  context.lineWidth = isMajorLine ? 2 : 1
  context.strokeStyle = isMajorLine ? 'rgba(39, 34, 29, 0.72)' : 'rgba(39, 34, 29, 0.24)'
  context.moveTo(startX, startY)
  context.lineTo(endX, endY)
  context.stroke()
}
