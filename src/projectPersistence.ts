export type ProjectColorOptions = {
  brightness: number
  contrast: number
  saturation: number
  usePalette: boolean
  maxColors: number
  speckleReduction: number
}

export type ProjectDocument = {
  version: 1
  sourceName?: string
  width: number
  height: number
  colorOptions: ProjectColorOptions
  pixels: Array<string | null>
}

const PROJECT_VERSION = 1
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i
const MIN_DIMENSION = 1
const MAX_DIMENSION = 300

export function createProjectDocumentFromImageData(
  imageData: ImageData,
  colorOptions: ProjectColorOptions,
  sourceName = '',
): ProjectDocument {
  const pixels: Array<string | null> = []

  for (let index = 0; index < imageData.data.length; index += 4) {
    if (imageData.data[index + 3] === 0) {
      pixels.push(null)
      continue
    }

    pixels.push(rgbToHex(imageData.data[index], imageData.data[index + 1], imageData.data[index + 2]))
  }

  const document: ProjectDocument = {
    version: PROJECT_VERSION,
    width: imageData.width,
    height: imageData.height,
    colorOptions: { ...colorOptions },
    pixels,
  }

  if (sourceName.trim()) {
    document.sourceName = sourceName.trim()
  }

  return document
}

export function stringifyProjectDocument(document: ProjectDocument) {
  return `${JSON.stringify(document, null, 2)}\n`
}

export function parseProjectDocument(rawJson: string): ProjectDocument {
  let parsed: unknown

  try {
    parsed = JSON.parse(rawJson)
  } catch {
    throw new Error('Project file is not valid JSON.')
  }

  if (!isRecord(parsed) || parsed.version !== PROJECT_VERSION) {
    throw new Error('Project file version is not supported.')
  }

  const width = parseDimension(parsed.width)
  const height = parseDimension(parsed.height)
  const colorOptions = parseColorOptions(parsed.colorOptions)
  if (!Array.isArray(parsed.pixels)) {
    throw new Error('Project pixel data is missing.')
  }

  if (parsed.pixels.length !== width * height) {
    throw new Error('Project pixel data does not match the saved dimensions.')
  }

  const pixels = parsed.pixels.map((pixel) => {
    if (pixel === null) {
      return null
    }

    if (typeof pixel === 'string' && HEX_COLOR_PATTERN.test(pixel)) {
      return pixel.toLowerCase()
    }

    throw new Error('Project pixel data contains an invalid color.')
  })

  return {
    version: PROJECT_VERSION,
    sourceName: typeof parsed.sourceName === 'string' ? parsed.sourceName : undefined,
    width,
    height,
    colorOptions,
    pixels,
  }
}

export function projectDocumentToImageData(document: ProjectDocument) {
  const data = new Uint8ClampedArray(document.width * document.height * 4)

  document.pixels.forEach((pixel, pixelIndex) => {
    const dataIndex = pixelIndex * 4
    if (!pixel) {
      return
    }

    const color = parseHexColor(pixel)
    data[dataIndex] = color.r
    data[dataIndex + 1] = color.g
    data[dataIndex + 2] = color.b
    data[dataIndex + 3] = 255
  })

  if (typeof ImageData !== 'undefined') {
    return new ImageData(data, document.width, document.height)
  }

  return {
    data,
    width: document.width,
    height: document.height,
    colorSpace: 'srgb',
  } as ImageData
}

export function getProjectFileName(sourceName: string, width: number, height: number) {
  const baseName = sourceName
    .trim()
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${baseName || 'perler-project'}-${width}x${height}.perler.json`
}

function parseDimension(value: unknown) {
  if (
    typeof value !== 'number'
    || !Number.isInteger(value)
    || value < MIN_DIMENSION
    || value > MAX_DIMENSION
  ) {
    throw new Error('Project dimensions are invalid.')
  }

  return value
}

function parseColorOptions(value: unknown): ProjectColorOptions {
  if (!isRecord(value)) {
    throw new Error('Project color options are missing.')
  }

  const { brightness, contrast, saturation, usePalette, maxColors, speckleReduction } = value
  if (
    typeof brightness !== 'number'
    || typeof contrast !== 'number'
    || typeof saturation !== 'number'
    || typeof usePalette !== 'boolean'
    || typeof maxColors !== 'number'
    || typeof speckleReduction !== 'number'
  ) {
    throw new Error('Project color options are invalid.')
  }

  return {
    brightness,
    contrast,
    saturation,
    usePalette,
    maxColors,
    speckleReduction,
  }
}

function parseHexColor(hex: string) {
  const normalized = hex.replace('#', '')
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0'))
    .join('')}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
