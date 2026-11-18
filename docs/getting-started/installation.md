# Installation

Install wtc-simplegl from npm, or copy its single file into your project. {.lead}

## From npm

::: code-group

```sh [npm]
npm install wtc-simplegl
```

```sh [pnpm]
pnpm add wtc-simplegl
```

```sh [yarn]
yarn add wtc-simplegl
```

:::

Everything is a named export:

```js
import { createContext, createRenderer, loop } from 'wtc-simplegl'
```

The package is ES modules only, with JSDoc types that editors pick up.

## As one file

Where you can't install packages, such as a CMS, a CodePen or a page without a build step, use `simplegl.js`: the whole library as one ES module. Download it from the [latest release](https://github.com/wethegit/wtc-simplegl/releases/latest), or load it from a CDN:

```
https://cdn.jsdelivr.net/npm/wtc-simplegl/dist/simplegl.js
https://unpkg.com/wtc-simplegl/dist/simplegl.js
```

Then import from it in a module script:

```html
<script type="module">
  import { createContext, createRenderer, loop } from './simplegl.js'
</script>
```

The file has no dependencies and keeps its JSDoc, so editors still show the types when you copy it in. Add a version to the CDN URL, such as `wtc-simplegl@1.1.0`, so an update can't change it under you.

## Browser support

wtc-simplegl needs WebGL2, which every current browser supports. `createRenderer`, `createTexture` and `createFrameBuffer` throw a clear error if they're given a WebGL1 context, and `createContext` throws if WebGL2 isn't available, so you can catch that and show a fallback:

```js
let gl
try {
  gl = createContext({ canvas })
} catch {
  canvas.replaceWith(fallbackImage)
}
```

## Shaders

Shaders are GLSL ES 3.00 strings, so they start with `#version 300 es` on their very first line. Template literals keep them readable inline; mark them with `/* glsl */` and editors with a GLSL extension will highlight them:

```js
const frag = /* glsl */ `#version 300 es
precision highp float;
out vec4 colour;
void main() { colour = vec4(1.0); }`
```

With a bundler you can also keep them in files and import them as strings, for example with Vite's `?raw` suffix: `import frag from './shape.frag?raw'`.
