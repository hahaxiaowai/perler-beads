import { describe, expect, it } from 'vitest'
import {
  createProjectDocumentFromImageData,
  getProjectFileName,
  parseProjectDocument,
  projectDocumentToImageData,
  stringifyProjectDocument,
} from './projectPersistence'

function imageDataFromRows(rows: number[][][]) {
  return {
    data: new Uint8ClampedArray(rows.flat(2)),
    width: rows[0]?.length ?? 0,
    height: rows.length,
    colorSpace: 'srgb',
  } as ImageData
}

describe('project persistence', () => {
  it('serializes bead pixels and color options into a versioned project document', () => {
    const imageData = imageDataFromRows([
      [
        [255, 0, 0, 255],
        [0, 0, 0, 0],
      ],
      [
        [0, 0, 255, 255],
        [255, 255, 255, 255],
      ],
    ])

    expect(createProjectDocumentFromImageData(imageData, {
      brightness: 8,
      contrast: 1.2,
      saturation: 0.8,
      usePalette: true,
      maxColors: 10,
      speckleReduction: 3,
    }, 'cat.png')).toEqual({
      version: 1,
      sourceName: 'cat.png',
      width: 2,
      height: 2,
      colorOptions: {
        brightness: 8,
        contrast: 1.2,
        saturation: 0.8,
        usePalette: true,
        maxColors: 10,
        speckleReduction: 3,
      },
      pixels: [
        '#ff0000',
        null,
        '#0000ff',
        '#ffffff',
      ],
    })
  })

  it('round-trips a project document through JSON and back to image data', () => {
    const document = parseProjectDocument(stringifyProjectDocument({
      version: 1,
      width: 2,
      height: 1,
      colorOptions: {
        brightness: 0,
        contrast: 1,
        saturation: 1,
        usePalette: false,
        maxColors: 12,
        speckleReduction: 2,
      },
      pixels: ['#123456', null],
      sourceName: 'saved-cat.png',
    }))

    const imageData = projectDocumentToImageData(document)

    expect(document.sourceName).toBe('saved-cat.png')
    expect(Array.from(imageData.data)).toEqual([
      18, 52, 86, 255,
      0, 0, 0, 0,
    ])
  })

  it('rejects malformed project JSON before restoring it', () => {
    expect(() => parseProjectDocument('not json')).toThrow('Project file is not valid JSON.')
    expect(() => parseProjectDocument(JSON.stringify({
      version: 1,
      width: 2,
      height: 2,
      colorOptions: {
        brightness: 0,
        contrast: 1,
        saturation: 1,
        usePalette: false,
        maxColors: 12,
        speckleReduction: 2,
      },
      pixels: ['#ffffff'],
    }))).toThrow('Project pixel data does not match the saved dimensions.')
  })

  it('creates a safe project filename from the source image name and dimensions', () => {
    expect(getProjectFileName('My cat photo.PNG', 48, 32)).toBe('my-cat-photo-48x32.perler.json')
    expect(getProjectFileName('', 12, 12)).toBe('perler-project-12x12.perler.json')
  })
})
