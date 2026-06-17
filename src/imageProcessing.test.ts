import { describe, expect, it } from 'vitest'
import {
  adjustImageDataColors,
  findNearestPaletteColor,
  getUsedColorsFromImageData,
  mapImageDataToPalette,
  perceptualColorDistance,
  sampleImageDataToPixelGrid,
  type RgbColor,
} from './imageProcessing'

function imageDataFromPixels(pixels: number[][]) {
  return {
    data: new Uint8ClampedArray(pixels.flat()),
    width: pixels.length,
    height: 1,
    colorSpace: 'srgb',
  } as ImageData
}

function imageDataFromRows(rows: number[][][]) {
  return {
    data: new Uint8ClampedArray(rows.flat(2)),
    width: rows[0]?.length ?? 0,
    height: rows.length,
    colorSpace: 'srgb',
  } as ImageData
}

describe('color tuning', () => {
  it('adjusts brightness and contrast while preserving alpha', () => {
    const imageData = imageDataFromPixels([[100, 120, 140, 255]])

    adjustImageDataColors(imageData, {
      brightness: 10,
      contrast: 1.2,
      saturation: 1,
    })

    expect(Array.from(imageData.data)).toEqual([106, 130, 154, 255])
  })

  it('maps a color to the nearest palette color', () => {
    const palette: RgbColor[] = [
      { name: 'Black', hex: '#000000', r: 0, g: 0, b: 0 },
      { name: 'Red', hex: '#ff0000', r: 255, g: 0, b: 0 },
      { name: 'Yellow', hex: '#ffff00', r: 255, g: 255, b: 0 },
    ]

    expect(findNearestPaletteColor(240, 28, 16, palette)).toEqual(palette[1])
  })

  it('uses perceptual distance for palette matching', () => {
    expect(perceptualColorDistance(120, 120, 120, { name: 'Same', hex: '#787878', r: 120, g: 120, b: 120 })).toBe(0)
    expect(
      perceptualColorDistance(120, 120, 120, { name: 'Near gray', hex: '#808080', r: 128, g: 128, b: 128 }),
    ).toBeLessThan(
      perceptualColorDistance(120, 120, 120, { name: 'Bright blue', hex: '#0000ff', r: 0, g: 0, b: 255 }),
    )
  })

  it('limits bead palette candidates to the configured max colors', () => {
    const palette: RgbColor[] = [
      { name: 'Black', hex: '#000000', r: 0, g: 0, b: 0 },
      { name: 'Red', hex: '#ff0000', r: 255, g: 0, b: 0 },
      { name: 'Green', hex: '#00ff00', r: 0, g: 255, b: 0 },
      { name: 'Blue', hex: '#0000ff', r: 0, g: 0, b: 255 },
      { name: 'Yellow', hex: '#ffff00', r: 255, g: 255, b: 0 },
      { name: 'White', hex: '#ffffff', r: 255, g: 255, b: 255 },
    ]
    const imageData = imageDataFromRows([
      [
        [255, 0, 0, 255],
        [0, 255, 0, 255],
        [0, 0, 255, 255],
      ],
      [
        [255, 255, 0, 255],
        [0, 0, 0, 255],
        [255, 255, 255, 255],
      ],
    ])

    mapImageDataToPalette(imageData, palette, { maxColors: 3, speckleReduction: 0 })

    expect(getUsedColorsFromImageData(imageData)).toHaveLength(3)
  })

  it('cleans tiny similar-color islands without changing larger regions', () => {
    const palette: RgbColor[] = [
      { name: 'Orange', hex: '#f4954f', r: 244, g: 149, b: 79 },
      { name: 'Red Orange', hex: '#e55d50', r: 229, g: 93, b: 80 },
    ]
    const orange = [244, 149, 79, 255]
    const redOrange = [229, 93, 80, 255]
    const imageData = imageDataFromRows([
      [orange, orange, orange],
      [orange, redOrange, orange],
      [orange, orange, orange],
    ])

    mapImageDataToPalette(imageData, palette, { maxColors: 2, speckleReduction: 2 })

    expect(Array.from(imageData.data.slice(16, 20))).toEqual(orange)
  })

  it('preserves transparent pixels while mapping opaque pixels', () => {
    const palette: RgbColor[] = [
      { name: 'Red', hex: '#ff0000', r: 255, g: 0, b: 0 },
    ]
    const imageData = imageDataFromRows([
      [
        [12, 34, 56, 0],
        [250, 10, 10, 255],
      ],
    ])

    mapImageDataToPalette(imageData, palette, { maxColors: 1, speckleReduction: 2 })

    expect(Array.from(imageData.data.slice(0, 4))).toEqual([12, 34, 56, 0])
    expect(Array.from(imageData.data.slice(4, 8))).toEqual([255, 0, 0, 255])
  })

  it('uses the dominant sampled color instead of averaging mixed cells', () => {
    const red = [255, 0, 0, 255]
    const blue = [0, 0, 255, 255]
    const source = imageDataFromRows([
      [red, red, red],
      [red, red, blue],
      [red, blue, blue],
    ])

    const output = sampleImageDataToPixelGrid(source, 1, 1, {
      brightness: 0,
      contrast: 1,
      saturation: 1,
      usePalette: false,
      palette: [],
      maxColors: 12,
      speckleReduction: 0,
    })

    expect(Array.from(output.data.slice(0, 4))).toEqual(red)
  })

  it('keeps edge cells on their dominant side instead of creating boundary blends', () => {
    const red = [255, 0, 0, 255]
    const blue = [0, 0, 255, 255]
    const source = imageDataFromRows([
      [red, red, blue, blue],
      [red, red, blue, blue],
      [red, red, blue, blue],
      [red, red, blue, blue],
    ])

    const output = sampleImageDataToPixelGrid(source, 2, 1, {
      brightness: 0,
      contrast: 1,
      saturation: 1,
      usePalette: false,
      palette: [],
      maxColors: 12,
      speckleReduction: 0,
    })

    expect(Array.from(output.data.slice(0, 4))).toEqual(red)
    expect(Array.from(output.data.slice(4, 8))).toEqual(blue)
  })

  it('counts unique used colors in final output data', () => {
    const imageData = imageDataFromPixels([
      [255, 0, 0, 255],
      [255, 0, 0, 255],
      [0, 0, 0, 255],
    ])

    expect(getUsedColorsFromImageData(imageData)).toEqual([
      { hex: '#ff0000', count: 2 },
      { hex: '#000000', count: 1 },
    ])
  })
})
