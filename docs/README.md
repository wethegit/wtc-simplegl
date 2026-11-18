# wtc-simplegl docs

The documentation site, built with [VitePress](https://vitepress.dev) and published to GitHub Pages at `https://wethegit.github.io/wtc-simplegl/`.

```sh
npm run docs:dev     # from the repo root
npm run docs:build
```

The docs have their own `package.json`; run `npm ci --prefix docs` once to install it.

- Guides are Markdown pages in the section folders (`getting-started/`, `core/`, `cookbook/` and so on). The sidebar is in `.vitepress/config.mts`.
- Every demo lives in the docs, as a live example on a cookbook page. There's no separate demos site.
- Live examples are modules in `examples/`, shown with `<Example>`. They import `wtc-simplegl`, which points at `../lib/index.js`, so they always run against the current source.

## Writing a page

Each page starts with a title and a one-sentence lead, marked `{.lead}`:

```md
# Framebuffers

Draw into a texture instead of the canvas, for post-processing and effects that build up over time. {.lead}
```

Then explain the idea in a paragraph or two, show it working, and work through the options a reader actually reaches for, each under its own `##` heading. Finish with links to related pages and the API reference.

- Write plainly, in British English (colour, normalise, centre). Short sentences; say what something does and why you'd use it. No "simply", "just", "easy" or "powerful".
- Code is complete enough to paste: imports, then the setup. Use the library's real names and options; check them against `lib/` rather than memory.
- Link to other pages by path, without the extension: `[Uniforms](/core/uniforms)`. Only link to pages that exist; the build fails on dead links.
- Use `::: tip` and `::: warning` containers sparingly, for things that trip people up.

## Live examples

An example is a module in `examples/` whose default export takes the element to draw into and returns the example:

```js
import { createContext, createRenderer } from 'wtc-simplegl'

export default function (container) {
  const ac = new AbortController()
  const canvas = document.createElement('canvas')
  container.appendChild(canvas)
  // See-through, so the panel's light or dark background shows
  const gl = createContext({
    canvas,
    signal: ac.signal,
    attributes: { alpha: true, premultipliedAlpha: true, antialias: true }
  })
  // ...make renderers, framebuffers and textures

  return {
    frame(time, delta) {
      // time and delta in seconds; only called while on screen
    },
    dispose() {
      ac.abort()
      // delete() what you made, then free the context:
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }
}
```

Show it on a page with its source under it:

```md
<Example src="first-shader" :height="360" />

<<< @/examples/first-shader.js
```

`<Example>` makes the example when it nears the screen, only calls `frame` while it's visible, and disposes of it when it's far away, so a page can have several. Keep examples focused on the page's idea; cookbook examples can be longer.

- Don't start a `loop()` of your own: `<Example>` calls `frame`, and pauses it off screen.
- `createContext` keeps the canvas sized, so `resize(width, height)` is optional. Use it for anything else that depends on the size, such as framebuffers.
- Keep the canvas see-through as above, and write premultiplied colour (`vec4(rgb * alpha, alpha)`), since the panel follows the light and dark themes.
- `examples/first-shader.js` is a working example.
