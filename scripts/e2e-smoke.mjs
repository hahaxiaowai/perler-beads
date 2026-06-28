import { chromium } from 'playwright'
import { createServer } from 'vite'
import { readFile } from 'node:fs/promises'

const server = await createServer({
  logLevel: 'error',
  server: {
    host: '127.0.0.1',
    port: 0,
  },
})

await server.listen()

const address = server.httpServer?.address()
if (!address || typeof address === 'string') {
  await server.close()
  throw new Error('Could not resolve Vite test server address.')
}

const baseUrl = `http://127.0.0.1:${address.port}/`
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({
  acceptDownloads: true,
  viewport: { width: 1280, height: 720 },
})
const consoleIssues = []

page.on('console', (message) => {
  if (['error', 'warning'].includes(message.type())) {
    consoleIssues.push(`${message.type()}: ${message.text()}`)
  }
})

try {
  await page.goto(baseUrl, { waitUntil: 'load' })
  await page.selectOption('select', 'zh-CN')
  await uploadFixture(page)
  await page.waitForSelector('.preview-frame img', { timeout: 10000 })
  await page.waitForSelector('.board-sections li', { timeout: 10000 })

  const initialState = await readPatternState(page)
  assert(initialState.inventoryRows.length === 2, 'Expected two inventory rows after upload.')
  assert(initialState.boardSections.length === 4, 'Expected a 48 x 48 pattern to use four 29 x 29 board sections.')
  assert(initialState.gridButtonEnabled, 'Expected grid download button to be enabled.')
  assert(!initialState.horizontalOverflow, 'Expected desktop layout to avoid horizontal overflow.')

  const redSelect = page.locator('select[aria-label="替换 #ff0000"]')
  await redSelect.selectOption('#ffcf56')
  await page.locator('.inventory-row', { hasText: '#ff0000' }).locator('button').click()
  await page.waitForFunction(() => document.body.textContent?.includes('#ffcf56'), null, { timeout: 10000 })

  const replacedState = await readPatternState(page)
  assert(
    replacedState.inventoryRows.some((row) => row.includes('#ffcf56')),
    'Expected manual replacement to add #ffcf56 to inventory.',
  )
  assert(
    !replacedState.inventoryRows.some((row) => row.includes('#ff0000')),
    'Expected manual replacement to remove #ff0000 from inventory.',
  )

  const [projectDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '导出项目' }).click(),
  ])
  assert(
    projectDownload.suggestedFilename() === 'e2e-fixture-48x48.perler.json',
    'Expected project export filename.',
  )
  const projectPath = await projectDownload.path()
  const projectJson = JSON.parse(await readFile(projectPath, 'utf8'))
  assert(projectJson.version === 1, 'Expected project export version.')
  assert(projectJson.width === 48 && projectJson.height === 48, 'Expected project dimensions in export.')
  assert(projectJson.pixels.includes('#ffcf56'), 'Expected exported project to contain replaced color.')

  await page.reload({ waitUntil: 'load' })
  await page.selectOption('select', 'zh-CN')
  await page.locator('input[accept="application/json,.json,.perler.json"]').setInputFiles(projectPath)
  await page.waitForSelector('.preview-frame img', { timeout: 10000 })
  await page.waitForSelector('.board-sections li', { timeout: 10000 })

  const importedState = await readPatternState(page)
  assert(importedState.inventoryRows.length === 2, 'Expected imported project to restore replaced color rows.')
  assert(
    importedState.inventoryRows.some((row) => row.includes('#ffcf56')),
    'Expected imported project to restore replaced color.',
  )
  assert(importedState.boardSections.length === 4, 'Expected imported project to restore board layout.')
  assert(
    documentBodyIncludes(importedState.bodyText, '已就绪：48 x 48 PNG。'),
    'Expected imported project to show ready status.',
  )

  const [instructionsDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '下载说明书' }).click(),
  ])
  assert(
    instructionsDownload.suggestedFilename() === 'e2e-fixture-48x48-instructions.html',
    `Expected printable instructions filename, got ${instructionsDownload.suggestedFilename()}.`,
  )
  const instructionsHtml = await readFile(await instructionsDownload.path(), 'utf8')
  assert(instructionsHtml.includes('48 x 48 beads'), 'Expected instructions to include pattern dimensions.')
  assert(instructionsHtml.includes('#ffcf56'), 'Expected instructions to include restored color inventory.')
  assert(instructionsHtml.includes('Board 4'), 'Expected instructions to include all board sections.')

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: '下载网格 PNG' }).click(),
  ])
  assert(download.suggestedFilename() === 'pixel-art-grid-48x48.png', 'Expected grid PNG download filename.')

  assert(consoleIssues.length === 0, `Expected no console errors or warnings, got: ${consoleIssues.join('; ')}`)
} finally {
  await browser.close()
  await server.close()
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function uploadFixture(page) {
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 10
    canvas.height = 10
    const context = canvas.getContext('2d')
    context.fillStyle = '#ff0000'
    context.fillRect(0, 0, 5, 10)
    context.fillStyle = '#0000ff'
    context.fillRect(5, 0, 5, 10)

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    const file = new File([blob], 'e2e-fixture.png', { type: 'image/png' })
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    const input = document.querySelector('input[type=file]')
    input.files = dataTransfer.files
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

async function readPatternState(page) {
  return page.evaluate(() => ({
    boardSections: [...document.querySelectorAll('.board-sections li')].map((node) =>
      node.textContent?.replace(/\s+/g, ' ').trim(),
    ),
    gridButtonEnabled: [...document.querySelectorAll('button')].some((button) =>
      button.textContent?.includes('下载网格 PNG') && !button.disabled,
    ),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    inventoryRows: [...document.querySelectorAll('.inventory-row:not(.inventory-head)')].map((row) =>
      row.textContent?.replace(/\s+/g, ' ').trim(),
    ),
    bodyText: document.body.textContent ?? '',
  }))
}

function documentBodyIncludes(bodyText, text) {
  return bodyText.replace(/\s+/g, ' ').includes(text)
}
