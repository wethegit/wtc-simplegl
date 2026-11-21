import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { test, expect, type ConsoleMessage, type Page } from '@playwright/test'

const docs = join(import.meta.dirname, '..')
const skip = new Set(['node_modules', 'api', 'e2e', '.vitepress', 'public', 'examples'])

// Every Markdown page with a live example, as a path under the site's base
function pagesWithExamples(dir = docs): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return skip.has(entry.name) ? [] : pagesWithExamples(path)
    if (!entry.name.endsWith('.md') || entry.name === 'README.md') return []
    if (!readFileSync(path, 'utf8').includes('<Example')) return []
    return [relative(docs, path).replace(/\\/g, '/').replace(/(index)?\.md$/, '')]
  })
}

// Chromium reports GL errors as console warnings, e.g.
// "[.WebGL-0x…] GL_INVALID_OPERATION: glDrawArrays: …"
const webglWarning = /WebGL|GL_INVALID|GL ERROR|GL_OUT_OF_MEMORY/i

// Examples lose their context on purpose when they're disposed of
const contextLostWarning = /CONTEXT_LOST_WEBGL/

/** Collect console errors, uncaught exceptions and WebGL warnings. */
function watch(page: Page) {
  const problems: string[] = []
  page.on('console', (msg: ConsoleMessage) => {
    const text = msg.text()
    if (msg.type() === 'error') problems.push(`console.error: ${text}`)
    else if (msg.type() === 'warning' && webglWarning.test(text) && !contextLostWarning.test(text))
      problems.push(`WebGL warning: ${text}`)
  })
  page.on('pageerror', (error) => problems.push(`Uncaught: ${error.message}`))
  return problems
}

/** Let the page render some frames, so per-frame errors show up. */
function waitFrames(page: Page, count = 30) {
  return page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        let n = 0
        const tick = () => (++n >= count ? resolve() : requestAnimationFrame(tick))
        requestAnimationFrame(tick)
      }),
    count
  )
}

for (const path of pagesWithExamples()) {
  test(`examples: /${path}`, async ({ page }) => {
    const problems = watch(page)
    await page.goto(path)
    await page.waitForLoadState('load')

    // Examples only run while they're on screen, so visit each in turn
    const examples = page.locator('.example')
    const count = await examples.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const example = examples.nth(i)
      await example.scrollIntoViewIfNeeded()
      await expect(example.locator('canvas')).toHaveCount(1, { timeout: 15_000 })
      await waitFrames(page)
      await expect(example.locator('.example__message')).toHaveCount(0)
    }

    expect(problems, problems.join('\n')).toEqual([])
  })
}
