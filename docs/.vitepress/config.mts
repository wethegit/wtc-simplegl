import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type DefaultTheme } from 'vitepress'

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

const pkg = JSON.parse(readFileSync(here('../../package.json'), 'utf8'))

const guide: DefaultTheme.SidebarItem[] = [
  {
    text: 'Getting started',
    items: [
      { text: 'Introduction', link: '/' },
      { text: 'Your first shader', link: '/getting-started/first-shader' }
    ]
  }
]

export default defineConfig({
  title: 'wtc-simplegl',
  description:
    'A small WebGL2 helper library that cuts down boilerplate, usable from npm or as a single copy-paste file.',
  base: '/wtc-simplegl/',
  cleanUrls: true,
  // The README is for people working on the docs
  srcExclude: ['README.md'],
  lastUpdated: false,
  // Links within the site must resolve
  ignoreDeadLinks: [/^https?:\/\//],
  head: [['link', { rel: 'icon', href: '/wtc-simplegl/favicon.svg' }]],

  markdown: {
    // Code blocks are dark in both themes, as on tailwindcss.com
    theme: { light: 'github-dark', dark: 'github-dark' },
    lineNumbers: false
  },

  themeConfig: {
    logo: { src: '/logo.svg', alt: '' },
    siteTitle: 'wtc-simplegl',
    nav: [
      { text: 'Docs', link: '/' },
      {
        text: `v${pkg.version}`,
        items: [
          {
            text: 'Releases',
            link: 'https://github.com/wethegit/wtc-simplegl/releases'
          },
          { text: 'npm', link: 'https://www.npmjs.com/package/wtc-simplegl' }
        ]
      }
    ],
    sidebar: { '/': guide },
    outline: { level: [2, 3], label: 'On this page' },
    search: { provider: 'local' },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/wethegit/wtc-simplegl' }
    ],
    editLink: {
      pattern: 'https://github.com/wethegit/wtc-simplegl/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },
    docFooter: { prev: 'Previous', next: 'Next' }
  },

  vite: {
    resolve: {
      // Examples run against the library's source, so the docs always match it
      alias: { 'wtc-simplegl': here('../../lib/index.js') }
    }
  }
})
