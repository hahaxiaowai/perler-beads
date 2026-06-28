export const languages = [
  { code: 'en', label: 'English' },
  { code: 'zh-CN', label: '中文' },
] as const

export type Language = (typeof languages)[number]['code']

type MessageKey =
  | 'appTitle'
  | 'applyReplacement'
  | 'brandName'
  | 'brandTagline'
  | 'boardCoverage'
  | 'boardLayout'
  | 'boardLayoutEmpty'
  | 'boardSize'
  | 'boardSummary'
  | 'brightness'
  | 'cleanSpeckles'
  | 'colorTuning'
  | 'colorCount'
  | 'colorHex'
  | 'colorInventory'
  | 'colorName'
  | 'colorShare'
  | 'contrast'
  | 'crop'
  | 'cropHint'
  | 'cropImage'
  | 'cropRatioLocked'
  | 'cropStepTitle'
  | 'dimensionRangeHint'
  | 'downloadInstructions'
  | 'downloadPng'
  | 'downloadGridPng'
  | 'export'
  | 'exportProject'
  | 'fileTypeError'
  | 'imageReadError'
  | 'imageLoadError'
  | 'invalidDimensionsStatus'
  | 'languageLabel'
  | 'maxColors'
  | 'noPreviewHint'
  | 'noPreviewTitle'
  | 'noColorsYet'
  | 'notUploaded'
  | 'outputColors'
  | 'paletteMapped'
  | 'pixelCount'
  | 'pixelateDownloadStep'
  | 'pixelateError'
  | 'previewAlt'
  | 'previewScale'
  | 'previewStageTitle'
  | 'processingStatus'
  | 'projectExportError'
  | 'projectImportError'
  | 'importProject'
  | 'ratioLocked'
  | 'readyStatus'
  | 'replaceColor'
  | 'replaceWith'
  | 'reset'
  | 'resetColors'
  | 'saturation'
  | 'source'
  | 'sourceColors'
  | 'upload'
  | 'uploadActionEmpty'
  | 'uploadActionHint'
  | 'uploadEmptyHint'
  | 'uploadEmptyTitle'
  | 'uploadSizeStep'
  | 'uploadStatus'
  | 'uploadStepTitle'
  | 'useBeadPalette'
  | 'usedColors'
  | 'customColor'
  | 'workflowLabel'
  | 'xBeads'
  | 'yBeads'
  | 'zoom'

type Messages = Record<MessageKey, string>
type MessageParams = Record<string, string | number>

const messages: Record<Language, Messages> = {
  en: {
    appTitle: 'Turn any picture into a bead-ready pixel image.',
    applyReplacement: 'Apply',
    brandName: 'Pixel Bead Studio',
    brandTagline: 'Pixelate your world. Make it real.',
    boardCoverage: 'X {startX}-{endX}, Y {startY}-{endY}',
    boardLayout: 'Board layout',
    boardLayoutEmpty: 'Generate a preview to see board sections.',
    boardSize: '{size} x {size} board',
    boardSummary: '{boards} boards, {columns} columns x {rows} rows',
    brightness: 'Brightness',
    cleanSpeckles: 'Clean speckles',
    colorTuning: 'Color tuning',
    colorCount: 'Count',
    colorHex: 'Hex',
    colorInventory: 'Bead color inventory',
    colorName: 'Color',
    colorShare: 'Share',
    contrast: 'Contrast',
    crop: 'Crop',
    cropHint: 'The crop box will lock to your bead dimensions.',
    cropImage: 'Frame the part you want',
    cropRatioLocked: 'Crop ratio is locked to {width}:{height}.',
    cropStepTitle: 'Crop your image',
    dimensionRangeHint: '{min}-{max} pixels per side.',
    downloadInstructions: 'Download instructions',
    downloadPng: 'Download PNG',
    downloadGridPng: 'Download grid PNG',
    export: 'Export',
    exportProject: 'Export project',
    fileTypeError: 'Please upload a JPG, PNG, or WebP image.',
    imageReadError: 'Could not read image file.',
    imageLoadError: 'Could not load image.',
    invalidDimensionsStatus: 'Pixel counts must be between {min} and {max}.',
    languageLabel: 'Language',
    maxColors: 'Max colors',
    noPreviewHint: 'Adjust the crop to make the preview appear here.',
    noPreviewTitle: 'No pixel preview yet',
    noColorsYet: 'Generate a preview to see bead counts.',
    notUploaded: 'Not uploaded',
    outputColors: 'Output colors',
    paletteMapped: 'Mapped to bead palette',
    pixelCount: 'Pixel count',
    pixelateDownloadStep: 'Pixelate & download',
    pixelateError: 'Could not pixelate this image.',
    previewAlt: 'Pixelated output preview at {width} by {height} pixels',
    previewScale: 'Preview scale',
    previewStageTitle: 'Preview the pixels',
    processingStatus: 'Building crisp bead-sized pixels...',
    projectExportError: 'Could not export this project.',
    projectImportError: 'Could not import this project file.',
    importProject: 'Import project',
    ratioLocked: 'Ratio locked',
    readyStatus: 'Ready: {width} x {height} PNG.',
    replaceColor: 'Replace',
    replaceWith: 'Replace with...',
    reset: 'Reset',
    resetColors: 'Reset colors',
    saturation: 'Saturation',
    source: 'Source',
    sourceColors: 'From tuned image',
    upload: 'Upload',
    uploadActionEmpty: 'Drop in a photo',
    uploadActionHint: 'JPG, PNG, or WebP stays in your browser.',
    uploadEmptyHint: 'The crop box will lock to your bead dimensions.',
    uploadEmptyTitle: 'Upload an image and set a valid grid.',
    uploadSizeStep: 'Upload & set size',
    uploadStatus: 'Upload an image to unlock the crop board.',
    uploadStepTitle: 'Choose your image',
    useBeadPalette: 'Use bead palette',
    usedColors: '{count} colors used',
    customColor: 'Custom color',
    workflowLabel: 'Pixel image workflow',
    xBeads: 'Horizontal beads',
    yBeads: 'Vertical beads',
    zoom: 'Zoom',
  },
  'zh-CN': {
    appTitle: '将任意图片转换成可拼豆的像素图。',
    applyReplacement: '应用',
    brandName: '像素拼豆工作室',
    brandTagline: '把你的世界像素化，再亲手拼出来。',
    boardCoverage: 'X {startX}-{endX}，Y {startY}-{endY}',
    boardLayout: '拼豆板布局',
    boardLayoutEmpty: '生成预览后会显示拼豆板分区。',
    boardSize: '{size} x {size} 拼豆板',
    boardSummary: '需要 {boards} 块板，{columns} 列 x {rows} 行',
    brightness: '亮度',
    cleanSpeckles: '清理杂点',
    colorTuning: '颜色调整',
    colorCount: '数量',
    colorHex: '色值',
    colorInventory: '拼豆颜色清单',
    colorName: '颜色',
    colorShare: '占比',
    contrast: '对比度',
    crop: '裁切',
    cropHint: '裁切框会锁定为你的拼豆尺寸比例。',
    cropImage: '框选你想保留的区域',
    cropRatioLocked: '裁切比例已锁定为 {width}:{height}。',
    cropStepTitle: '裁切图片',
    dimensionRangeHint: '每边可设置 {min}-{max} 个像素。',
    downloadInstructions: '下载说明书',
    downloadPng: '下载 PNG',
    downloadGridPng: '下载网格 PNG',
    export: '导出',
    exportProject: '导出项目',
    fileTypeError: '请上传 JPG、PNG 或 WebP 图片。',
    imageReadError: '无法读取图片文件。',
    imageLoadError: '无法加载图片。',
    invalidDimensionsStatus: '像素数量必须在 {min} 到 {max} 之间。',
    languageLabel: '语言',
    maxColors: '最大颜色数',
    noPreviewHint: '调整裁切区域后，预览会显示在这里。',
    noPreviewTitle: '还没有像素预览',
    noColorsYet: '生成预览后会显示拼豆数量。',
    notUploaded: '未上传',
    outputColors: '输出颜色',
    paletteMapped: '已映射到拼豆色板',
    pixelCount: '像素数量',
    pixelateDownloadStep: '像素化并下载',
    pixelateError: '无法将这张图片像素化。',
    previewAlt: '{width} x {height} 像素的像素化输出预览',
    previewScale: '预览倍率',
    previewStageTitle: '预览像素图',
    processingStatus: '正在生成清晰的拼豆像素...',
    projectExportError: '无法导出这个项目。',
    projectImportError: '无法导入这个项目文件。',
    importProject: '导入项目',
    ratioLocked: '比例已锁定',
    readyStatus: '已就绪：{width} x {height} PNG。',
    replaceColor: '替换',
    replaceWith: '替换为...',
    reset: '重置',
    resetColors: '重置颜色',
    saturation: '饱和度',
    source: '来源',
    sourceColors: '来自调整后的图片',
    upload: '上传',
    uploadActionEmpty: '拖入一张照片',
    uploadActionHint: 'JPG、PNG 或 WebP 会保留在你的浏览器中。',
    uploadEmptyHint: '裁切框会锁定为你的拼豆尺寸。',
    uploadEmptyTitle: '上传图片并设置有效网格。',
    uploadSizeStep: '上传并设置尺寸',
    uploadStatus: '上传图片后即可使用裁切画板。',
    uploadStepTitle: '选择图片',
    useBeadPalette: '使用拼豆色板',
    usedColors: '已使用 {count} 种颜色',
    customColor: '自定义颜色',
    workflowLabel: '像素图片工作流',
    xBeads: '横向拼豆数',
    yBeads: '纵向拼豆数',
    zoom: '缩放',
  },
}

export function getInitialLanguage(browserLanguage = globalThis.navigator?.language): Language {
  return browserLanguage?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'
}

export function t(language: Language, key: MessageKey, params: MessageParams = {}) {
  const template = messages[language]?.[key] ?? messages.en[key]
  return template.replace(/\{(\w+)\}/g, (_match, paramKey: string) => String(params[paramKey] ?? ''))
}
