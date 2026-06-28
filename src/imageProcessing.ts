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
  maxColors: number
  speckleReduction: number
}

export type PaletteMapOptions = {
  maxColors: number
  speckleReduction: number
}

type RgbSample = {
  r: number
  g: number
  b: number
}

type SampledCell = {
  samples: RgbSample[]
  average: RgbSample | null
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

function parseHexColor(hex: string) {
  const normalized = hex.trim().replace(/^#/, '')
  if (!/^[0-9a-f]{6}$/i.test(normalized)) {
    throw new Error('Invalid hex color.')
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function channelChroma(red: number, green: number, blue: number) {
  return Math.max(red, green, blue) - Math.min(red, green, blue)
}

function luminance(red: number, green: number, blue: number) {
  return 0.299 * red + 0.587 * green + 0.114 * blue
}

function createImageDataLike(width: number, height: number) {
  const data = new Uint8ClampedArray(width * height * 4)
  if (typeof ImageData !== 'undefined') {
    return new ImageData(data, width, height)
  }

  return {
    data,
    width,
    height,
    colorSpace: 'srgb',
  } as ImageData
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
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true })
  if (!sourceContext) {
    throw new Error('Canvas is not supported in this browser.')
  }

  const sourceImageData = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
  const outputImageData = sampleImageDataToPixelGrid(sourceImageData, width, height, colorOptions)
  outputContext.putImageData(outputImageData, 0, 0)

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

export function replaceCanvasColor(
  canvas: HTMLCanvasElement,
  fromHex: string,
  replacement: RgbColor,
  previewScale = 10,
) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Canvas is not supported in this browser.')
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const changedPixels = replaceImageDataColor(imageData, fromHex, replacement)
  context.putImageData(imageData, 0, 0)

  const previewCanvas = document.createElement('canvas')
  const previewContext = previewCanvas.getContext('2d')
  if (!previewContext) {
    throw new Error('Canvas is not supported in this browser.')
  }

  previewCanvas.width = canvas.width * previewScale
  previewCanvas.height = canvas.height * previewScale
  previewContext.imageSmoothingEnabled = false
  previewContext.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height)

  return {
    outputCanvas: canvas,
    previewCanvas,
    usedColors: getUsedColors(canvas),
    changedPixels,
  }
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

export function replaceImageDataColor(imageData: ImageData, fromHex: string, replacement: RgbColor) {
  const fromColor = parseHexColor(fromHex)
  const data = imageData.data
  let changedPixels = 0

  for (let index = 0; index < data.length; index += 4) {
    if (
      data[index + 3] === 0
      || data[index] !== fromColor.r
      || data[index + 1] !== fromColor.g
      || data[index + 2] !== fromColor.b
    ) {
      continue
    }

    data[index] = replacement.r
    data[index + 1] = replacement.g
    data[index + 2] = replacement.b
    changedPixels += 1
  }

  return changedPixels
}

export function sampleImageDataToPixelGrid(
  sourceImageData: ImageData,
  width: number,
  height: number,
  colorOptions?: ColorOptions,
) {
  const outputImageData = createImageDataLike(width, height)
  const sampledCells = sampleGridCells(sourceImageData, width, height, colorOptions)
  const candidates = colorOptions?.usePalette
    ? selectPaletteCandidatesFromSampledCells(
      sampledCells,
      colorOptions.palette,
      Math.max(1, Math.min(colorOptions.palette.length, Math.round(colorOptions.maxColors))),
      Math.max(0, Math.min(4, Math.round(colorOptions.speckleReduction))),
    )
    : []

  sampledCells.forEach((cell, pixelIndex) => {
    const outputIndex = pixelIndex * 4
    const color = colorOptions?.usePalette
      ? choosePaletteCellColor(cell, candidates)
      : chooseFreeCellColor(cell)

    if (!color) {
      outputImageData.data[outputIndex + 3] = 0
      return
    }

    outputImageData.data[outputIndex] = color.r
    outputImageData.data[outputIndex + 1] = color.g
    outputImageData.data[outputIndex + 2] = color.b
    outputImageData.data[outputIndex + 3] = 255
  })

  if (colorOptions?.usePalette && colorOptions.speckleReduction > 0) {
    mapImageDataToPalette(outputImageData, colorOptions.palette, {
      maxColors: colorOptions.maxColors,
      speckleReduction: colorOptions.speckleReduction,
    })
  }

  return outputImageData
}

function sampleGridCells(
  sourceImageData: ImageData,
  width: number,
  height: number,
  colorOptions?: Pick<ColorOptions, 'brightness' | 'contrast' | 'saturation'>,
) {
  const sampleSide = 7
  const cells: SampledCell[] = []
  const data = sourceImageData.data
  const sourceWidth = sourceImageData.width
  const sourceHeight = sourceImageData.height

  for (let cellY = 0; cellY < height; cellY += 1) {
    for (let cellX = 0; cellX < width; cellX += 1) {
      const samples: RgbSample[] = []
      let redSum = 0
      let greenSum = 0
      let blueSum = 0

      for (let sampleY = 0; sampleY < sampleSide; sampleY += 1) {
        for (let sampleX = 0; sampleX < sampleSide; sampleX += 1) {
          const sourceX = Math.min(
            sourceWidth - 1,
            Math.max(0, Math.floor(((cellX + (sampleX + 0.5) / sampleSide) / width) * sourceWidth)),
          )
          const sourceY = Math.min(
            sourceHeight - 1,
            Math.max(0, Math.floor(((cellY + (sampleY + 0.5) / sampleSide) / height) * sourceHeight)),
          )
          const index = (sourceY * sourceWidth + sourceX) * 4
          if (data[index + 3] === 0) {
            continue
          }

          const sample = adjustRgbSample(
            data[index],
            data[index + 1],
            data[index + 2],
            colorOptions,
          )
          samples.push(sample)
          redSum += sample.r
          greenSum += sample.g
          blueSum += sample.b
        }
      }

      cells.push({
        samples,
        average: samples.length > 0
          ? {
              r: clampChannel(redSum / samples.length),
              g: clampChannel(greenSum / samples.length),
              b: clampChannel(blueSum / samples.length),
            }
          : null,
      })
    }
  }

  return cells
}

function adjustRgbSample(
  red: number,
  green: number,
  blue: number,
  colorOptions?: Pick<ColorOptions, 'brightness' | 'contrast' | 'saturation'>,
) {
  if (!colorOptions) {
    return { r: red, g: green, b: blue }
  }

  const { brightness, contrast, saturation } = colorOptions
  let nextRed = (red + brightness - 128) * contrast + 128
  let nextGreen = (green + brightness - 128) * contrast + 128
  let nextBlue = (blue + brightness - 128) * contrast + 128
  const nextLuminance = luminance(nextRed, nextGreen, nextBlue)
  nextRed = nextLuminance + (nextRed - nextLuminance) * saturation
  nextGreen = nextLuminance + (nextGreen - nextLuminance) * saturation
  nextBlue = nextLuminance + (nextBlue - nextLuminance) * saturation

  return {
    r: clampChannel(nextRed),
    g: clampChannel(nextGreen),
    b: clampChannel(nextBlue),
  }
}

function chooseFreeCellColor(cell: SampledCell) {
  if (cell.samples.length === 0) {
    return null
  }

  const dominant = dominantSampleColor(cell.samples)
  if (dominant.share >= 0.34) {
    return dominant.color
  }

  return cell.average
}

function choosePaletteCellColor(cell: SampledCell, candidates: RgbColor[]) {
  if (cell.samples.length === 0 || candidates.length === 0) {
    return null
  }

  const counts = new Map<string, { color: RgbColor, count: number }>()
  cell.samples.forEach((sample) => {
    const nearest = findNearestPaletteColor(sample.r, sample.g, sample.b, candidates)
    const existing = counts.get(nearest.hex) ?? { color: nearest, count: 0 }
    existing.count += 1
    counts.set(nearest.hex, existing)
  })

  const ranked = Array.from(counts.values()).sort((left, right) => {
    const leftScore = cellPaletteVoteScore(left.color, left.count)
    const rightScore = cellPaletteVoteScore(right.color, right.count)
    return rightScore - leftScore || right.count - left.count
  })
  const primary = ranked[0]
  if (!primary) {
    return null
  }

  const primaryShare = primary.count / cell.samples.length
  if (primaryShare >= 0.34 || !cell.average) {
    return primary.color
  }

  return findNearestPaletteColor(cell.average.r, cell.average.g, cell.average.b, candidates)
}

function dominantSampleColor(samples: RgbSample[]) {
  const counts = new Map<string, { color: RgbSample, count: number }>()
  samples.forEach((sample) => {
    const key = `${sample.r},${sample.g},${sample.b}`
    const existing = counts.get(key) ?? { color: sample, count: 0 }
    existing.count += 1
    counts.set(key, existing)
  })

  const dominant = Array.from(counts.values()).sort((left, right) => right.count - left.count)[0]
  return {
    color: dominant.color,
    share: dominant.count / samples.length,
  }
}

function selectPaletteCandidatesFromSampledCells(
  sampledCells: SampledCell[],
  palette: RgbColor[],
  maxColors: number,
  speckleReduction: number,
) {
  if (palette.length === 0) {
    throw new Error('Palette must contain at least one color.')
  }

  const counts = new Map<string, { color: RgbColor, count: number }>()
  sampledCells.forEach((cell) => {
    cell.samples.forEach((sample) => {
      const nearest = findNearestPaletteColor(sample.r, sample.g, sample.b, palette)
      const existing = counts.get(nearest.hex) ?? { color: nearest, count: 0 }
      existing.count += 1
      counts.set(nearest.hex, existing)
    })
  })

  const ranked = Array.from(counts.values()).sort((left, right) => {
    const leftScore = paletteCandidateScore(left.color, left.count, speckleReduction)
    const rightScore = paletteCandidateScore(right.color, right.count, speckleReduction)
    return rightScore - leftScore || right.count - left.count || left.color.hex.localeCompare(right.color.hex)
  })

  return ranked.slice(0, maxColors).map((entry) => entry.color)
}

function cellPaletteVoteScore(color: RgbColor, count: number) {
  const light = luminance(color.r, color.g, color.b)
  const chroma = channelChroma(color.r, color.g, color.b)
  const darkLineBoost = light < 70 ? 1.25 : 1
  const accentBoost = chroma > 80 ? 1.18 : 1
  return count * darkLineBoost * accentBoost
}

export function findNearestPaletteColor(red: number, green: number, blue: number, palette: RgbColor[]) {
  if (palette.length === 0) {
    throw new Error('Palette must contain at least one color.')
  }

  return palette.reduce((nearest, color) => {
    const nearestDistance = perceptualColorDistance(red, green, blue, nearest)
    const nextDistance = perceptualColorDistance(red, green, blue, color)
    return nextDistance < nearestDistance ? color : nearest
  }, palette[0])
}

export function mapCanvasToPalette(
  canvas: HTMLCanvasElement,
  palette: RgbColor[],
  options: PaletteMapOptions = { maxColors: 12, speckleReduction: 2 },
) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Canvas is not supported in this browser.')
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  mapImageDataToPalette(imageData, palette, options)
  context.putImageData(imageData, 0, 0)
}

export function mapImageDataToPalette(
  imageData: ImageData,
  palette: RgbColor[],
  options: PaletteMapOptions = { maxColors: 12, speckleReduction: 2 },
) {
  if (palette.length === 0) {
    throw new Error('Palette must contain at least one color.')
  }

  const maxColors = Math.max(1, Math.min(palette.length, Math.round(options.maxColors)))
  const speckleReduction = Math.max(0, Math.min(4, Math.round(options.speckleReduction)))
  const candidates = selectPaletteCandidates(imageData, palette, maxColors, speckleReduction)
  const data = imageData.data
  const mappedColorIds = new Array<string | null>(imageData.width * imageData.height).fill(null)

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) {
      continue
    }

    const nearest = findNearestPaletteColor(data[index], data[index + 1], data[index + 2], candidates)
    data[index] = nearest.r
    data[index + 1] = nearest.g
    data[index + 2] = nearest.b
    mappedColorIds[index / 4] = nearest.hex
  }

  if (speckleReduction > 0) {
    mergeRareSimilarColors(imageData, mappedColorIds, candidates, speckleReduction)
    reduceTinyColorRegions(imageData, mappedColorIds, candidates, speckleReduction)
  }
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
  return perceptualColorDistance(red, green, blue, color)
}

function srgbChannelToLinear(channel: number) {
  const normalized = channel / 255
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
}

function rgbToOklab(red: number, green: number, blue: number) {
  const r = srgbChannelToLinear(red)
  const g = srgbChannelToLinear(green)
  const b = srgbChannelToLinear(blue)

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

  const lRoot = Math.cbrt(l)
  const mRoot = Math.cbrt(m)
  const sRoot = Math.cbrt(s)

  return {
    l: 0.2104542553 * lRoot + 0.7936177850 * mRoot - 0.0040720468 * sRoot,
    a: 1.9779984951 * lRoot - 2.4285922050 * mRoot + 0.4505937099 * sRoot,
    b: 0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.8086757660 * sRoot,
  }
}

export function perceptualColorDistance(red: number, green: number, blue: number, color: RgbColor) {
  const left = rgbToOklab(red, green, blue)
  const right = rgbToOklab(color.r, color.g, color.b)
  const lightness = left.l - right.l
  const greenRed = left.a - right.a
  const blueYellow = left.b - right.b
  return Math.sqrt(lightness * lightness + greenRed * greenRed + blueYellow * blueYellow) * 100
}

function selectPaletteCandidates(
  imageData: ImageData,
  palette: RgbColor[],
  maxColors: number,
  speckleReduction: number,
) {
  const counts = new Map<string, { color: RgbColor, count: number }>()
  const data = imageData.data

  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) {
      continue
    }

    const nearest = findNearestPaletteColor(data[index], data[index + 1], data[index + 2], palette)
    const existing = counts.get(nearest.hex) ?? { color: nearest, count: 0 }
    existing.count += 1
    counts.set(nearest.hex, existing)
  }

  const ranked = Array.from(counts.values()).sort((left, right) => {
    const leftScore = paletteCandidateScore(left.color, left.count, speckleReduction)
    const rightScore = paletteCandidateScore(right.color, right.count, speckleReduction)
    return rightScore - leftScore || right.count - left.count || left.color.hex.localeCompare(right.color.hex)
  })

  return ranked.slice(0, maxColors).map((entry) => entry.color)
}

function paletteCandidateScore(color: RgbColor, count: number, speckleReduction: number) {
  const chroma = channelChroma(color.r, color.g, color.b)
  const light = luminance(color.r, color.g, color.b)
  const chromaBoost = chroma > 80 ? 1.7 : chroma > 45 ? 1.25 : 1
  const darkLineBoost = light < 70 ? 1.35 : 1
  const lightNeutralPenalty = light > 220 && chroma < 28 ? 0.88 : 1
  const cleanupBias = 1 + speckleReduction * 0.02
  return count * chromaBoost * darkLineBoost * lightNeutralPenalty * cleanupBias
}

function mergeRareSimilarColors(
  imageData: ImageData,
  mappedColorIds: Array<string | null>,
  candidates: RgbColor[],
  speckleReduction: number,
) {
  const counts = new Map<string, number>()
  mappedColorIds.forEach((colorId) => {
    if (colorId) {
      counts.set(colorId, (counts.get(colorId) ?? 0) + 1)
    }
  })

  const colorByHex = new Map(candidates.map((color) => [color.hex, color]))
  const rows = Array.from(counts.entries())
    .flatMap(([hex, count]) => {
      const color = colorByHex.get(hex)
      return color ? [{ color, count }] : []
    })
    .sort((left, right) => right.count - left.count)
  const total = rows.reduce((sum, row) => sum + row.count, 0)
  const rareLimit = Math.max(2, Math.ceil(total * (0.01 + speckleReduction * 0.004)))
  const replacements = new Map<string, RgbColor>()

  rows.forEach((row, index) => {
    if (row.count > rareLimit) {
      return
    }

    const replacement = rows.slice(0, index).find((candidate) =>
      areSimilarPaletteColors(row.color, candidate.color, speckleReduction, true),
    )
    if (replacement) {
      replacements.set(row.color.hex, replacement.color)
    }
  })

  if (replacements.size === 0) {
    return
  }

  for (let pixelIndex = 0; pixelIndex < mappedColorIds.length; pixelIndex += 1) {
    const colorId = mappedColorIds[pixelIndex]
    const replacement = colorId ? replacements.get(colorId) : undefined
    if (!replacement) {
      continue
    }

    writePixelColor(imageData, pixelIndex, replacement)
    mappedColorIds[pixelIndex] = replacement.hex
  }
}

function reduceTinyColorRegions(
  imageData: ImageData,
  mappedColorIds: Array<string | null>,
  candidates: RgbColor[],
  speckleReduction: number,
) {
  const maxRegionSize = [0, 1, 2, 5, 8][speckleReduction]
  if (maxRegionSize <= 0) {
    return
  }

  const colorByHex = new Map(candidates.map((color) => [color.hex, color]))
  const visited = new Uint8Array(mappedColorIds.length)
  const width = imageData.width
  const height = imageData.height
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const

  for (let start = 0; start < mappedColorIds.length; start += 1) {
    const colorId = mappedColorIds[start]
    if (!colorId || visited[start]) {
      continue
    }

    const region: number[] = []
    const borderCounts = new Map<string, number>()
    const queue = [start]
    visited[start] = 1

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const pixelIndex = queue[cursor]
      region.push(pixelIndex)
      const x = pixelIndex % width
      const y = Math.floor(pixelIndex / width)

      offsets.forEach(([dx, dy]) => {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          return
        }

        const nextIndex = ny * width + nx
        const nextColorId = mappedColorIds[nextIndex]
        if (nextColorId === colorId && !visited[nextIndex]) {
          visited[nextIndex] = 1
          queue.push(nextIndex)
          return
        }

        if (nextColorId && nextColorId !== colorId) {
          borderCounts.set(nextColorId, (borderCounts.get(nextColorId) ?? 0) + 1)
        }
      })
    }

    if (region.length > maxRegionSize || borderCounts.size === 0) {
      continue
    }

    const sourceColor = colorByHex.get(colorId)
    const replacementHex = Array.from(borderCounts.entries())
      .sort((left, right) => right[1] - left[1])
      .find(([neighborColorId]) =>
        areSimilarPaletteColors(sourceColor, colorByHex.get(neighborColorId), speckleReduction, false),
      )?.[0]
    const replacement = replacementHex ? colorByHex.get(replacementHex) : undefined
    if (!replacement) {
      continue
    }

    region.forEach((pixelIndex) => {
      writePixelColor(imageData, pixelIndex, replacement)
      mappedColorIds[pixelIndex] = replacement.hex
    })
  }
}

function areSimilarPaletteColors(
  from: RgbColor | undefined,
  to: RgbColor | undefined,
  speckleReduction: number,
  rare: boolean,
) {
  if (!from || !to || from.hex === to.hex) {
    return false
  }

  const threshold = [0, 8, 16, 24, 32][speckleReduction] * (rare ? 1.25 : 1)
  const distance = perceptualColorDistance(from.r, from.g, from.b, to)
  const lightnessGap = Math.abs(luminance(from.r, from.g, from.b) - luminance(to.r, to.g, to.b))
  const chromaGap = Math.abs(channelChroma(from.r, from.g, from.b) - channelChroma(to.r, to.g, to.b))
  if (lightnessGap > 95 || chromaGap > 95) {
    return false
  }

  return distance <= threshold
}

function writePixelColor(imageData: ImageData, pixelIndex: number, color: RgbColor) {
  const index = pixelIndex * 4
  imageData.data[index] = color.r
  imageData.data[index + 1] = color.g
  imageData.data[index + 2] = color.b
}
