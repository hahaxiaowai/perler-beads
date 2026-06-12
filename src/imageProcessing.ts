import type { Area } from 'react-easy-crop'

export type RgbColor = {
  name: string
  hex: string
  r: number
  g: number
  b: number
}

export type UsedColor = {
  hex: string
  count: number
  name?: string
}

export type ColorOptions = {
  brightness: number
  contrast: number
  saturation: number
  usePalette: boolean
  palette: RgbColor[]
}

export const BEAD_PALETTE: RgbColor[] = [
  { name: 'Black', hex: '#1f1b18', r: 31, g: 27, b: 24 },
  { name: 'White', hex: '#fffaf0', r: 255, g: 250, b: 240 },
  { name: 'Light Gray', hex: '#d6d0c4', r: 214, g: 208, b: 196 },
  { name: 'Dark Gray', hex: '#625a50', r: 98, g: 90, b: 80 },
  { name: 'Red', hex: '#e55d50', r: 229, g: 93, b: 80 },
  { name: 'Orange', hex: '#f4954f', r: 244, g: 149, b: 79 },
  { name: 'Yellow', hex: '#ffcf56', r: 255, g: 207, b: 86 },
  { name: 'Light Yellow', hex: '#ffe8a6', r: 255, g: 232, b: 166 },
  { name: 'Pink', hex: '#dd78a6', r: 221, g: 120, b: 166 },
  { name: 'Hot Pink', hex: '#d9487c', r: 217, g: 72, b: 124 },
  { name: 'Green', hex: '#69aa84', r: 105, g: 170, b: 132 },
  { name: 'Dark Green', hex: '#2f6d4d', r: 47, g: 109, b: 77 },
  { name: 'Blue', hex: '#5aaad1', r: 90, g: 170, b: 209 },
  { name: 'Dark Blue', hex: '#2f6d9e', r: 47, g: 109, b: 158 },
  { name: 'Purple', hex: '#9b70bd', r: 155, g: 112, b: 189 },
  { name: 'Brown', hex: '#7a4c2e', r: 122, g: 76, b: 46 },
  { name: 'Tan', hex: '#c28a55', r: 194, g: 138, b: 85 },
  { name: 'Skin Tone', hex: '#e3bd92', r: 227, g: 189, b: 146 },
]

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => clampChannel(value).toString(16).padStart(2, '0')).join('')}`
}

export function loadImageFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Could not read image file.'))
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image file.'))
    reader.readAsDataURL(file)
  })
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load image.'))
    image.src = src
  })
}

export async function getCroppedCanvas(imageSrc: string, cropPixels: Area): Promise<HTMLCanvasElement> {
  const image = await loadImageElement(imageSrc)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas is not supported in this browser.')
  }

  const width = Math.max(1, Math.round(cropPixels.width))
  const height = Math.max(1, Math.round(cropPixels.height))
  canvas.width = width
  canvas.height = height

  context.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    width,
    height,
  )

  return canvas
}

export function pixelateCanvas(
  sourceCanvas: HTMLCanvasElement,
  width: number,
  height: number,
  previewScale = 10,
  colorOptions?: ColorOptions,
) {
  const outputCanvas = document.createElement('canvas')
  const outputContext = outputCanvas.getContext('2d', { willReadFrequently: true })
  const previewCanvas = document.createElement('canvas')
  const previewContext = previewCanvas.getContext('2d')

  if (!outputContext || !previewContext) {
    throw new Error('Canvas is not supported in this browser.')
  }

  outputCanvas.width = width
  outputCanvas.height = height
  outputContext.imageSmoothingEnabled = true
  outputContext.drawImage(sourceCanvas, 0, 0, width, height)

  if (colorOptions) {
    adjustCanvasColors(outputCanvas, colorOptions)
    if (colorOptions.usePalette) {
      mapCanvasToPalette(outputCanvas, colorOptions.palette)
    }
  }

  const usedColors = getUsedColors(outputCanvas)

  previewCanvas.width = width * previewScale
  previewCanvas.height = height * previewScale
  previewContext.imageSmoothingEnabled = false
  previewContext.drawImage(outputCanvas, 0, 0, previewCanvas.width, previewCanvas.height)

  return { outputCanvas, previewCanvas, usedColors }
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = canvas.toDataURL('image/png')
  link.click()
}

export function adjustCanvasColors(canvas: HTMLCanvasElement, options: Pick<ColorOptions, 'brightness' | 'contrast' | 'saturation'>) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Canvas is not supported in this browser.')
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  adjustImageDataColors(imageData, options)
  context.putImageData(imageData, 0, 0)
}

export function adjustImageDataColors(
  imageData: ImageData,
  options: Pick<ColorOptions, 'brightness' | 'contrast' | 'saturation'>,
) {
  const { brightness, contrast, saturation } = options
  const data = imageData.data

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3]
    if (alpha === 0) {
      continue
    }

    let red = (data[index] + brightness - 128) * contrast + 128
    let green = (data[index + 1] + brightness - 128) * contrast + 128
    let blue = (data[index + 2] + brightness - 128) * contrast + 128

    const luminance = 0.299 * red + 0.587 * green + 0.114 * blue
    red = luminance + (red - luminance) * saturation
    green = luminance + (green - luminance) * saturation
    blue = luminance + (blue - luminance) * saturation

    data[index] = clampChannel(red)
    data[index + 1] = clampChannel(green)
    data[index + 2] = clampChannel(blue)
  }
}

export function findNearestPaletteColor(red: number, green: number, blue: number, palette: RgbColor[]) {
  if (palette.length === 0) {
    throw new Error('Palette must contain at least one color.')
  }

  return palette.reduce((nearest, color) => {
    const nearestDistance = colorDistance(red, green, blue, nearest)
    const nextDistance = colorDistance(red, green, blue, color)
    return nextDistance < nearestDistance ? color : nearest
  }, palette[0])
}

export function mapCanvasToPalette(canvas: HTMLCanvasElement, palette: RgbColor[]) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Canvas is not supported in this browser.')
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) {
      continue
    }

    const nearest = findNearestPaletteColor(data[index], data[index + 1], data[index + 2], palette)
    data[index] = nearest.r
    data[index + 1] = nearest.g
    data[index + 2] = nearest.b
  }

  context.putImageData(imageData, 0, 0)
}

export function getUsedColors(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Canvas is not supported in this browser.')
  }

  return getUsedColorsFromImageData(context.getImageData(0, 0, canvas.width, canvas.height))
}

export function getUsedColorsFromImageData(imageData: ImageData): UsedColor[] {
  const counts = new Map<string, number>()
  const data = imageData.data

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) {
      continue
    }

    const hex = rgbToHex(data[index], data[index + 1], data[index + 2])
    counts.set(hex, (counts.get(hex) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([hex, count]) => ({ hex, count }))
    .sort((left, right) => right.count - left.count || left.hex.localeCompare(right.hex))
}

function colorDistance(red: number, green: number, blue: number, color: RgbColor) {
  return (red - color.r) ** 2 + (green - color.g) ** 2 + (blue - color.b) ** 2
}
