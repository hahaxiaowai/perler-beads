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
  type UsedColor,
} from './imageProcessing'

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

  const statusText = useMemo(() => {
    if (!hasValidDimensions) {
      return `Pixel counts must be between ${MIN_PIXELS} and ${MAX_PIXELS}.`
    }

    if (!imageSrc) {
      return 'Upload an image to unlock the crop board.'
    }

    if (isProcessing) {
      return 'Building crisp bead-sized pixels...'
    }

    if (previewUrl) {
      return `Ready: ${xPixels} x ${yPixels} PNG.`
    }

    return 'Move or zoom the crop box to generate a preview.'
  }, [hasValidDimensions, imageSrc, isProcessing, previewUrl, xPixels, yPixels])

  const processFile = async (file: File) => {
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload a JPG, PNG, or WebP image.')
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
      setError(readError instanceof Error ? readError.message : 'Could not read image file.')
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
          setError(renderError instanceof Error ? renderError.message : 'Could not pixelate this image.')
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
      <nav className="progress-nav" aria-label="Pixel workflow">
        <div>
          <span className="logo-mark">PB</span>
          <div>
            <strong>Pixel Bead Studio</strong>
            <span>Pixelate your world. Make it real.</span>
          </div>
        </div>
        <ol>
          <li><span>1</span> Upload & set size</li>
          <li><span>2</span> Crop your image</li>
          <li><span>3</span> Pixelate & download</li>
        </ol>
      </nav>

      <section className="studio-header">
        <div>
          <h1>Turn any picture into a bead-ready pixel image.</h1>
        </div>
        <div className="header-status">
          <Sparkles size={18} />
          <span>{statusText}</span>
        </div>
      </section>

      <section className="workflow-grid" aria-label="Pixel image workflow">
        <aside className="tool-panel upload-panel">
          <div className="step-title">
            <span>1</span>
            <div>
              <p>Upload</p>
              <h2>Choose your image</h2>
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
            <strong>{fileName || 'Drop in a photo'}</strong>
            <span>JPG, PNG, or WebP stays in your browser.</span>
          </button>

          <div className="dimension-card">
            <div className="section-label">
              <Grid3X3 size={18} />
              <span>Pixel count</span>
            </div>
            <label>
              Horizontal beads
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
              Vertical beads
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
                ? `Crop ratio is locked to ${xPixels}:${yPixels}.`
                : `${MIN_PIXELS}-${MAX_PIXELS} pixels per side.`}
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
              <p>Crop</p>
              <h2>Frame the part you want</h2>
            </div>
          </div>

          <div className="crop-toolbar">
            <div>
              <LockKeyhole size={16} />
              <span>{hasValidDimensions ? `${xPixels}:${yPixels}` : 'Ratio locked'}</span>
            </div>
            <button type="button" onClick={handleReset} disabled={!imageSrc}>
              <RefreshCw size={16} />
              Reset
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
                <strong>Upload an image and set a valid grid.</strong>
                <span>The crop box will lock to your bead dimensions.</span>
              </div>
            )}
          </div>

          <div className="zoom-row">
            <Move size={18} />
            <label htmlFor="zoom">Zoom</label>
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
              <p>Export</p>
              <h2>Preview the pixels</h2>
            </div>
          </div>

          <div className="preview-frame">
            {previewUrl && hasValidDimensions ? (
              <img
                alt={`Pixelated output preview at ${xPixels} by ${yPixels} pixels`}
                src={previewUrl}
                style={{
                  aspectRatio: `${xPixels} / ${yPixels}`,
                }}
              />
            ) : (
              <div className="empty-state preview-empty">
                <Scissors size={34} />
                <strong>No pixel preview yet</strong>
                <span>Adjust the crop to make the preview appear here.</span>
              </div>
            )}
          </div>

          <dl className="output-details">
            <div>
              <dt>PNG size</dt>
              <dd>{hasValidDimensions ? `${xPixels} x ${yPixels}` : '-'}</dd>
            </div>
            <div>
              <dt>Preview scale</dt>
              <dd>{hasValidDimensions ? `${previewScale}x` : '-'}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>{fileName || 'Not uploaded'}</dd>
            </div>
          </dl>

          <div className="color-tuning">
            <div className="color-tuning-header">
              <div className="section-label">
                <SlidersHorizontal size={18} />
                <span>Color tuning</span>
              </div>
              <button type="button" onClick={handleResetColors}>
                <RotateCcw size={15} />
                Reset colors
              </button>
            </div>

            <label className="slider-control">
              <span>Brightness <strong>{brightness > 0 ? `+${brightness}` : brightness}</strong></span>
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
              <span>Contrast <strong>{contrast.toFixed(1)}x</strong></span>
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
              <span>Saturation <strong>{saturation.toFixed(1)}x</strong></span>
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
                Use bead palette
              </span>
              <input
                checked={usePalette}
                type="checkbox"
                onChange={(event) => setUsePalette(event.target.checked)}
              />
            </label>

            <label className="slider-control">
              <span>Max colors <strong>{maxColors}</strong></span>
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
              <span>Clean speckles <strong>{speckleReduction} / 4</strong></span>
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
              <strong>{usePalette ? `${usedColors.length} colors used` : 'Output colors'}</strong>
              <span>{usePalette ? 'Mapped to bead palette' : 'From tuned image'}</span>
            </div>
            <div className="used-color-strip" aria-label="Used colors">
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

          <button className="download-button" type="button" disabled={!outputCanvas} onClick={handleDownload}>
            <Download size={20} />
            Download PNG
          </button>
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
