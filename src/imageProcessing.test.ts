import { describe, expect, it } from 'vitest'
import {
  adjustImageDataColors,
  findNearestPaletteColor,
  getUsedColorsFromImageData,
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
