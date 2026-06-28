import Cropper, { type Area, type Point } from 'react-easy-crop'
import {
  Download,
  Grid3X3,
  ImagePlus,
  LockKeyhole,
  Move,
  Palette,
  RefreshCw,
  RotateCcw,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Upload,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BEAD_PALETTE,
  downloadCanvas,
  getCroppedCanvas,
  loadImageFromFile,
  pixelateCanvas,
  replaceCanvasColor,
  type UsedColor,
} from './imageProcessing'
import { getInitialLanguage, languages, t, type Language } from './i18n'
import { DEFAULT_BOARD_SIZE, buildColorInventory, createGridPatternCanvas, getBoardLayout } from './patternExport'

const MIN_PIXELS = 1
const MAX_PIXELS = 300
const DEFAULT_X_PIXELS = 48
const DEFAULT_Y_PIXELS = 48
const PREVIEW_MAX_SIZE = 520
const DEFAULT_COLOR_OPTIONS = {
  brightness: 0,
  contrast: 1,
  saturation: 1,
  usePalette: false,
  maxColors: 12,
  speckleReduction: 2,
}

function clampPixelCount(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_X_PIXELS
  }

  return Math.min(MAX_PIXELS, Math.max(MIN_PIXELS, Math.round(value)))
}

function parsePixelInput(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return parsed >= MIN_PIXELS && parsed <= MAX_PIXELS ? Math.round(parsed) : null
}

function getPreviewScale(width: number, height: number) {
  return Math.max(1, Math.floor(PREVIEW_MAX_SIZE / Math.max(width, height)))
}

function App() {
  const [language, setLanguage] = useState<Language>(() => {
    const storedLanguage = window.localStorage.getItem('perler-beads-language')
    const matchedLanguage = languages.find((option) => option.code === storedLanguage)
    return matchedLanguage?.code ?? getInitialLanguage()
  })
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [xPixelInput, setXPixelInput] = useState(String(DEFAULT_X_PIXELS))
  const [yPixelInput, setYPixelInput] = useState(String(DEFAULT_Y_PIXELS))
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [cropPixels, setCropPixels] = useState<Area | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [outputCanvas, setOutputCanvas] = useState<HTMLCanvasElement | null>(null)
  const [usedColors, setUsedColors] = useState<UsedColor[]>([])
  const [brightness, setBrightness] = useState(DEFAULT_COLOR_OPTIONS.brightness)
  const [contrast, setContrast] = useState(DEFAULT_COLOR_OPTIONS.contrast)
  const [saturation, setSaturation] = useState(DEFAULT_COLOR_OPTIONS.saturation)
  const [usePalette, setUsePalette] = useState(DEFAULT_COLOR_OPTIONS.usePalette)
  const [maxColors, setMaxColors] = useState(DEFAULT_COLOR_OPTIONS.maxColors)
  const [speckleReduction, setSpeckleReduction] = useState(DEFAULT_COLOR_OPTIONS.speckleReduction)
  const [error, setError] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const xPixels = parsePixelInput(xPixelInput)
  const yPixels = parsePixelInput(yPixelInput)
  const hasValidDimensions = xPixels !== null && yPixels !== null
  const aspect = hasValidDimensions ? xPixels / yPixels : 1
  const previewScale = hasValidDimensions ? getPreviewScale(xPixels, yPixels) : 1

  const translate = useCallback(
    (key: Parameters<typeof t>[1], params?: Parameters<typeof t>[2]) => t(language, key, params),
    [language],
  )

  const statusText = useMemo(() => {
    if (!hasValidDimensions) {
      return translate('invalidDimensionsStatus', { min: MIN_PIXELS, max: MAX_PIXELS })
    }

    if (!imageSrc) {
      return translate('uploadStatus')
    }

    if (isProcessing) {
      return translate('processingStatus')
    }

    if (previewUrl) {
      return translate('readyStatus', { width: xPixels, height: yPixels })
    }

    return translate('cropHint')
  }, [hasValidDimensions, imageSrc, isProcessing, previewUrl, translate, xPixels, yPixels])

  const colorInventory = useMemo(
    () => buildColorInventory(usedColors, outputCanvas ? outputCanvas.width * outputCanvas.height : 0, BEAD_PALETTE),
    [outputCanvas, usedColors],
  )
  const boardLayout = useMemo(
    () => (outputCanvas ? getBoardLayout(outputCanvas.width, outputCanvas.height, DEFAULT_BOARD_SIZE) : null),
    [outputCanvas],
  )

  useEffect(() => {
    window.localStorage.setItem('perler-beads-language', language)
  }, [language])

  const processFile = async (file: File) => {
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setError(translate('fileTypeError'))
      return
    }

    try {
      const nextImageSrc = await loadImageFromFile(file)
      setImageSrc(nextImageSrc)
      setFileName(file.name)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setCropPixels(null)
      setPreviewUrl(null)
      setOutputCanvas(null)
      setUsedColors([])
      setError('')
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : translate('imageReadError'))
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const handleDrop = async (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const handleCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCropPixels(croppedAreaPixels)
  }, [])

  useEffect(() => {
    let isCurrent = true

    async function renderPreview() {
      if (!imageSrc || !cropPixels || !hasValidDimensions || !xPixels || !yPixels) {
        return
      }

      setIsProcessing(true)
      setError('')

      try {
        const croppedCanvas = await getCroppedCanvas(imageSrc, cropPixels)
        const { outputCanvas: nextOutputCanvas, previewCanvas, usedColors: nextUsedColors } = pixelateCanvas(
          croppedCanvas,
          xPixels,
          yPixels,
          previewScale,
          {
            brightness,
            contrast,
            saturation,
            usePalette,
            palette: BEAD_PALETTE,
            maxColors,
            speckleReduction,
          },
        )

        if (!isCurrent) {
          return
        }

        setOutputCanvas(nextOutputCanvas)
        setPreviewUrl(previewCanvas.toDataURL('image/png'))
        setUsedColors(nextUsedColors)
      } catch (renderError) {
        if (isCurrent) {
          setError(renderError instanceof Error ? renderError.message : translate('pixelateError'))
        }
      } finally {
        if (isCurrent) {
          setIsProcessing(false)
        }
      }
    }

    const debounceId = window.setTimeout(renderPreview, 120)

    return () => {
      isCurrent = false
      window.clearTimeout(debounceId)
    }
  }, [
    brightness,
    contrast,
    cropPixels,
    hasValidDimensions,
    imageSrc,
    maxColors,
    previewScale,
    saturation,
    speckleReduction,
    translate,
    usePalette,
    xPixels,
    yPixels,
  ])

  const handleDownload = () => {
    if (!outputCanvas || !xPixels || !yPixels) {
      return
    }

    downloadCanvas(outputCanvas, `pixel-art-${xPixels}x${yPixels}.png`)
  }

  const handleDownloadGrid = () => {
    if (!outputCanvas || !xPixels || !yPixels) {
      return
    }

    downloadCanvas(createGridPatternCanvas(outputCanvas), `pixel-art-grid-${xPixels}x${yPixels}.png`)
  }

  const handleReplaceColor = (fromHex: string, replacementHex: string) => {
    if (!outputCanvas) {
      return
    }

    const replacement = BEAD_PALETTE.find((color) => color.hex === replacementHex)
    if (!replacement || fromHex.toLowerCase() === replacement.hex.toLowerCase()) {
      return
    }

    const nextOutputCanvas = document.createElement('canvas')
    const context = nextOutputCanvas.getContext('2d', { willReadFrequently: true })
    if (!context) {
      setError(translate('pixelateError'))
      return
    }

    nextOutputCanvas.width = outputCanvas.width
    nextOutputCanvas.height = outputCanvas.height
    context.drawImage(outputCanvas, 0, 0)

    try {
      const {
        outputCanvas: replacedCanvas,
        previewCanvas,
        usedColors: nextUsedColors,
      } = replaceCanvasColor(nextOutputCanvas, fromHex, replacement, previewScale)
      setOutputCanvas(replacedCanvas)
      setPreviewUrl(previewCanvas.toDataURL('image/png'))
      setUsedColors(nextUsedColors)
    } catch (replaceError) {
      setError(replaceError instanceof Error ? replaceError.message : translate('pixelateError'))
    }
  }

  const getReplaceSelectId = (hex: string) => `replace-${hex.replace('#', '')}`

  const handleApplyReplacement = (fromHex: string) => {
    const select = document.getElementById(getReplaceSelectId(fromHex)) as HTMLSelectElement | null
    if (!select) {
      return
    }

    handleReplaceColor(fromHex, select.value)
    select.selectedIndex = 0
  }

  const handleReset = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  const handleResetColors = () => {
    setBrightness(DEFAULT_COLOR_OPTIONS.brightness)
    setContrast(DEFAULT_COLOR_OPTIONS.contrast)
    setSaturation(DEFAULT_COLOR_OPTIONS.saturation)
    setUsePalette(DEFAULT_COLOR_OPTIONS.usePalette)
    setMaxColors(DEFAULT_COLOR_OPTIONS.maxColors)
    setSpeckleReduction(DEFAULT_COLOR_OPTIONS.speckleReduction)
  }

  const handleDimensionBlur = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    fallback: number,
  ) => {
    const parsed = Number(value)
    setter(String(Number.isFinite(parsed) ? clampPixelCount(parsed) : fallback))
  }

  return (
    <main className="app-shell">
      <nav className="progress-nav" aria-label={translate('workflowLabel')}>
        <div>
          <span className="logo-mark">PB</span>
          <div>
            <strong>{translate('brandName')}</strong>
            <span>{translate('brandTagline')}</span>
          </div>
        </div>
        <ol>
          <li><span>1</span> {translate('uploadSizeStep')}</li>
          <li><span>2</span> {translate('cropStepTitle')}</li>
          <li><span>3</span> {translate('pixelateDownloadStep')}</li>
        </ol>
        <label className="language-switcher">
          <span>{translate('languageLabel')}</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as Language)}
          >
            {languages.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </nav>

      <section className="studio-header">
        <div>
          <h1>{translate('appTitle')}</h1>
        </div>
        <div className="header-status">
          <Sparkles size={18} />
          <span>{statusText}</span>
        </div>
      </section>

      <section className="workflow-grid" aria-label={translate('workflowLabel')}>
        <aside className="tool-panel upload-panel">
          <div className="step-title">
            <span>1</span>
            <div>
              <p>{translate('upload')}</p>
              <h2>{translate('uploadStepTitle')}</h2>
            </div>
          </div>

          <button
            className="upload-target"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp"
              className="file-input"
              type="file"
              onChange={handleFileChange}
            />
            <ImagePlus size={34} />
            <strong>{fileName || translate('uploadActionEmpty')}</strong>
            <span>{translate('uploadActionHint')}</span>
          </button>

          <div className="dimension-card">
            <div className="section-label">
              <Grid3X3 size={18} />
              <span>{translate('pixelCount')}</span>
            </div>
            <label>
              {translate('xBeads')}
              <input
                inputMode="numeric"
                max={MAX_PIXELS}
                min={MIN_PIXELS}
                type="number"
                value={xPixelInput}
                onBlur={() => handleDimensionBlur(xPixelInput, setXPixelInput, DEFAULT_X_PIXELS)}
                onChange={(event) => setXPixelInput(event.target.value)}
              />
            </label>
            <label>
              {translate('yBeads')}
              <input
                inputMode="numeric"
                max={MAX_PIXELS}
                min={MIN_PIXELS}
                type="number"
                value={yPixelInput}
                onBlur={() => handleDimensionBlur(yPixelInput, setYPixelInput, DEFAULT_Y_PIXELS)}
                onChange={(event) => setYPixelInput(event.target.value)}
              />
            </label>
            <p className={hasValidDimensions ? 'hint' : 'hint error-text'}>
              {hasValidDimensions
                ? translate('cropRatioLocked', { width: xPixels, height: yPixels })
                : translate('dimensionRangeHint', { min: MIN_PIXELS, max: MAX_PIXELS })}
            </p>
          </div>

          <div className="bead-strip" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </aside>

        <section className="tool-panel crop-panel">
          <div className="step-title">
            <span>2</span>
            <div>
              <p>{translate('crop')}</p>
              <h2>{translate('cropImage')}</h2>
            </div>
          </div>

          <div className="crop-toolbar">
            <div>
              <LockKeyhole size={16} />
              <span>{hasValidDimensions ? `${xPixels}:${yPixels}` : translate('ratioLocked')}</span>
            </div>
            <button type="button" onClick={handleReset} disabled={!imageSrc}>
              <RefreshCw size={16} />
              {translate('reset')}
            </button>
          </div>

          <div className="crop-stage">
            {imageSrc && hasValidDimensions ? (
              <Cropper
                aspect={aspect}
                crop={crop}
                image={imageSrc}
                maxZoom={6}
                minZoom={1}
                objectFit="contain"
                showGrid={false}
                zoom={zoom}
                onCropChange={setCrop}
                onCropComplete={handleCropComplete}
                onZoomChange={setZoom}
              />
            ) : (
              <div className="empty-state">
                <Upload size={38} />
                <strong>{translate('uploadEmptyTitle')}</strong>
                <span>{translate('uploadEmptyHint')}</span>
              </div>
            )}
          </div>

          <div className="zoom-row">
            <Move size={18} />
            <label htmlFor="zoom">{translate('zoom')}</label>
            <input
              disabled={!imageSrc}
              id="zoom"
              max="6"
              min="1"
              step="0.05"
              type="range"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </div>
        </section>

        <aside className="tool-panel output-panel">
          <div className="step-title">
            <span>3</span>
            <div>
              <p>{translate('export')}</p>
              <h2>{translate('previewStageTitle')}</h2>
            </div>
          </div>

          <div className="preview-frame">
            {previewUrl && hasValidDimensions ? (
              <img
                alt={translate('previewAlt', { width: xPixels, height: yPixels })}
                src={previewUrl}
                style={{
                  aspectRatio: `${xPixels} / ${yPixels}`,
                }}
              />
            ) : (
              <div className="empty-state preview-empty">
                <Scissors size={34} />
                <strong>{translate('noPreviewTitle')}</strong>
                <span>{translate('noPreviewHint')}</span>
              </div>
            )}
          </div>

          <dl className="output-details">
            <div>
              <dt>PNG</dt>
              <dd>{hasValidDimensions ? `${xPixels} x ${yPixels}` : '-'}</dd>
            </div>
            <div>
              <dt>{translate('previewScale')}</dt>
              <dd>{hasValidDimensions ? `${previewScale}x` : '-'}</dd>
            </div>
            <div>
              <dt>{translate('source')}</dt>
              <dd>{fileName || translate('notUploaded')}</dd>
            </div>
          </dl>

          <div className="color-tuning">
            <div className="color-tuning-header">
              <div className="section-label">
                <SlidersHorizontal size={18} />
                <span>{translate('colorTuning')}</span>
              </div>
              <button type="button" onClick={handleResetColors}>
                <RotateCcw size={15} />
                {translate('resetColors')}
              </button>
            </div>

            <label className="slider-control">
              <span>{translate('brightness')} <strong>{brightness > 0 ? `+${brightness}` : brightness}</strong></span>
              <input
                max="50"
                min="-50"
                step="1"
                type="range"
                value={brightness}
                onChange={(event) => setBrightness(Number(event.target.value))}
              />
            </label>

            <label className="slider-control">
              <span>{translate('contrast')} <strong>{contrast.toFixed(1)}x</strong></span>
              <input
                max="1.8"
                min="0.5"
                step="0.1"
                type="range"
                value={contrast}
                onChange={(event) => setContrast(Number(event.target.value))}
              />
            </label>

            <label className="slider-control">
              <span>{translate('saturation')} <strong>{saturation.toFixed(1)}x</strong></span>
              <input
                max="2"
                min="0"
                step="0.1"
                type="range"
                value={saturation}
                onChange={(event) => setSaturation(Number(event.target.value))}
              />
            </label>

            <label className="palette-toggle">
              <span>
                <Palette size={18} />
                {translate('useBeadPalette')}
              </span>
              <input
                checked={usePalette}
                type="checkbox"
                onChange={(event) => setUsePalette(event.target.checked)}
              />
            </label>

            <label className="slider-control">
              <span>{translate('maxColors')} <strong>{maxColors}</strong></span>
              <input
                disabled={!usePalette}
                max="24"
                min="4"
                step="1"
                type="range"
                value={maxColors}
                onChange={(event) => setMaxColors(Number(event.target.value))}
              />
            </label>

            <label className="slider-control">
              <span>{translate('cleanSpeckles')} <strong>{speckleReduction} / 4</strong></span>
              <input
                disabled={!usePalette}
                max="4"
                min="0"
                step="1"
                type="range"
                value={speckleReduction}
                onChange={(event) => setSpeckleReduction(Number(event.target.value))}
              />
            </label>
          </div>

          <div className="used-colors">
            <div>
              <strong>{usePalette ? translate('usedColors', { count: usedColors.length }) : translate('outputColors')}</strong>
              <span>{usePalette ? translate('paletteMapped') : translate('sourceColors')}</span>
            </div>
            <div className="used-color-strip" aria-label={translate('usedColors', { count: usedColors.length })}>
              {(usePalette ? usedColors : usedColors.slice(0, 18)).map((color) => (
                <span
                  key={color.hex}
                  aria-label={`${color.hex}, ${color.count} pixels`}
                  style={{ backgroundColor: color.hex }}
                  title={`${color.hex} - ${color.count} px`}
                />
              ))}
            </div>
          </div>

          <div className="color-inventory">
            <div className="section-label">
              <Palette size={18} />
              <span>{translate('colorInventory')}</span>
            </div>
            {colorInventory.length > 0 ? (
              <div className="inventory-table" role="table" aria-label={translate('colorInventory')}>
                <div className="inventory-row inventory-head" role="row">
                  <span role="columnheader">{translate('colorName')}</span>
                  <span role="columnheader">{translate('colorCount')}</span>
                  <span role="columnheader">{translate('colorShare')}</span>
                  <span role="columnheader">{translate('replaceColor')}</span>
                </div>
                {colorInventory.map((color) => (
                  <div className="inventory-row" role="row" key={color.hex}>
                    <span role="cell">
                      <i style={{ backgroundColor: color.hex }} />
                      <span>
                        {color.name === 'Custom color' ? translate('customColor') : color.name}
                        <small>{color.hex}</small>
                      </span>
                    </span>
                    <strong role="cell">{color.count}</strong>
                    <strong role="cell">{color.percentage}%</strong>
                    <div className="replace-color-control" role="cell">
                      <span>{translate('replaceColor')}</span>
                      <select
                        aria-label={`${translate('replaceColor')} ${color.hex}`}
                        defaultValue=""
                        id={getReplaceSelectId(color.hex)}
                      >
                        <option value="">{translate('replaceWith')}</option>
                        {BEAD_PALETTE.map((paletteColor) => (
                          <option key={paletteColor.hex} value={paletteColor.hex}>
                            {paletteColor.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        ref={(button) => {
                          if (button) {
                            button.onclick = () => handleApplyReplacement(color.hex)
                          }
                        }}
                      >
                        {translate('applyReplacement')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="hint">{translate('noColorsYet')}</p>
            )}
          </div>

          <div className="board-layout">
            <div className="section-label">
              <Grid3X3 size={18} />
              <span>{translate('boardLayout')}</span>
            </div>
            {boardLayout ? (
              <>
                <p className="board-summary">
                  <strong>{translate('boardSize', { size: boardLayout.boardSize })}</strong>
                  <span>
                    {translate('boardSummary', {
                      boards: boardLayout.totalBoards,
                      columns: boardLayout.columns,
                      rows: boardLayout.rows,
                    })}
                  </span>
                </p>
                <ol className="board-sections">
                  {boardLayout.sections.map((section) => (
                    <li key={section.index}>
                      <strong>{section.index}</strong>
                      <span>
                        {translate('boardCoverage', {
                          startX: section.startX,
                          endX: section.endX,
                          startY: section.startY,
                          endY: section.endY,
                        })}
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className="hint">{translate('boardLayoutEmpty')}</p>
            )}
          </div>

          <div className="download-actions">
            <button className="download-button" type="button" disabled={!outputCanvas} onClick={handleDownload}>
              <Download size={20} />
              {translate('downloadPng')}
            </button>
            <button className="download-button secondary" type="button" disabled={!outputCanvas} onClick={handleDownloadGrid}>
              <Grid3X3 size={20} />
              {translate('downloadGridPng')}
            </button>
          </div>
        </aside>
      </section>

      {error ? (
        <div className="toast" role="alert">
          {error}
        </div>
      ) : null}
    </main>
  )
}

export default App
