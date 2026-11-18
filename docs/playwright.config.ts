import { defineConfig, devices } from '@playwright/test'

const port = 5299
const ci = !!process.env.CI

// Smoke tests for the live examples. Starts the VitePress dev server, opens
// every page with an <Example>, and fails on console errors, uncaught
// exceptions and WebGL warnings. Run with `npm run test:e2e`.
export default defineConfig({
  testDir: './e2e',
  // WebGL runs in software (SwiftShader), which is slow, so allow more time
  // and run fewer pages at once on CI's smaller runners.
  timeout: ci ? 120_000 : 60_000,
  workers: ci ? 2 : 4,
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}/wtc-simplegl/`,
    trace: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(ci && { viewport: { width: 1000, height: 700 } }),
        launchOptions: {
          // Headless Chromium has no GPU; use SwiftShader so WebGL2 works
          args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
        }
      }
    }
  ],
  webServer: {
    command: `npx vitepress dev --port ${port} --strictPort`,
    url: `http://localhost:${port}/wtc-simplegl/`,
    reuseExistingServer: !ci
  }
})
