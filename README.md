# wtc-simplegl

A small WebGL2 helper library. It takes care of the boilerplate (compiling and linking shaders, vertex arrays, uniforms, framebuffers, textures, canvas sizing) and otherwise stays out of the way: you still write GLSL and plain `gl` calls.

It's built to work where you can't install packages. The whole library is one file you can copy into a project.

WebGL2 only: every function expects a context from `canvas.getContext("webgl2")`.

## Getting it

**Copy-paste:** download `simplegl.js` from the [latest release](https://github.com/wethegit/wtc-simplegl/releases/latest), or from a CDN:

```
https://cdn.jsdelivr.net/npm/wtc-simplegl/dist/simplegl.js
https://unpkg.com/wtc-simplegl/dist/simplegl.js
```

Then import from it as an ES module:

```html
<script type="module">
  import { createContext, createRenderer, loop } from "./simplegl.js";
</script>
```

**npm:**

```sh
npm install wtc-simplegl
```

```js
import { createContext, createRenderer, loop } from "wtc-simplegl";
```

## Quick start

A fullscreen canvas with an animated fragment shader:

```js
import { createContext, createRenderer, loop } from "./simplegl.js";

const gl = createContext();

const quad = createRenderer(gl, {
  vert: `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0, 1); }`,
  frag: `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 color;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  color = vec4(uv, 0.5 + 0.5 * sin(u_time), 1);
}`,
  attributes: {
    // One triangle that covers the screen.
    a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 },
  },
  count: 3,
});

loop((time) => {
  quad.bindVAOs();
  quad.bindUniform("u_resolution", [gl.canvas.width, gl.canvas.height]);
  quad.bindUniform("u_time", time);
  quad.render();
});
```

## API

### `createContext(options?)`

Returns a WebGL2 context and keeps the canvas's pixel size in step with its CSS size and the device pixel ratio. With no options it creates a canvas that fills the window.

| Option | Default | |
|---|---|---|
| `canvas` | new canvas | Use an existing canvas; size it with CSS. |
| `container` | `document.body` | Where a new canvas is appended. |
| `dpr` | `devicePixelRatio`, max 2 | A fixed pixel ratio. |
| `autoResize` | `true` | Resize when the canvas's CSS size changes. |
| `onResize` | | `(width, height, gl) => {}`, called on creation and after every resize. |
| `attributes` | | Passed to `getContext`. |
| `signal` | | An `AbortSignal` that stops the resizing. |

### `loop(fn, { autoStart = true }?)`

Calls `fn(time, delta, frame)` every animation frame, with `time` and `delta` in seconds. `time` doesn't advance while stopped. Returns `{ start(), stop(), running }`.

### `createRenderer(gl, options)`

Compiles and links a program, sets up its vertex array and looks up its uniforms.

| Option | Default | |
|---|---|---|
| `vert`, `frag` | | GLSL ES 3.00 source (`#version 300 es`). |
| `attributes` | `{}` | Attribute definitions, by name. See below. |
| `count` | | Number of vertices to draw. |
| `offset` | `0` | First vertex to draw. |
| `mode` | `gl.TRIANGLES` | Primitive type. |

Each attribute takes `data` (a typed array) or an existing `buffer`, plus `size`, `type`, `normalize`, `stride`, `offset`, `usage` and `index` (its location), which default to WebGL's usual values. Set `buffertype: gl.ELEMENT_ARRAY_BUFFER` for an index buffer.

For transform feedback, give an attribute `component: "transformFeedback"` and the name of the vertex shader output that updates it as `varying`. Two copies of its buffer are made and swapped every frame. `mode` must be `gl.POINTS`, `gl.LINES` or `gl.TRIANGLES`.

The renderer has:

- `bindVAOs()`: uses the program and binds its vertex array. Call before drawing.
- `bindUniform(name, value)`: sets a uniform. Numbers, arrays and typed arrays all work; array uniforms can be set by their plain name.
- `render({ x, y, width, height }?)`: sets the viewport (the whole canvas by default) and draws.
- `program`, `uniforms`: the underlying program and its active uniforms.

### `createFrameBuffer(gl, options)`

Creates an offscreen render target, or a `read`/`write` pair for ping-pong effects. Each target is `{ fb, targetTexture, depthBuffer }`.

| Option | Default | |
|---|---|---|
| `width`, `height` | | Size in pixels. |
| `type` | `gl.UNSIGNED_BYTE` | `gl.FLOAT` or `gl.HALF_FLOAT` for float targets. |
| `format`, `internalFormat` | `gl.RGBA` | The internal format is picked for float types. |
| `data` | `null` | Initial pixels. |
| `singular` | `false` | Only create `read`. |
| `depth` | `false` | Add a depth buffer. |
| `minFilter`, `magFilter` | `gl.LINEAR` | |
| `tiling` | `gl.CLAMP_TO_EDGE` | Wrap mode. |
| `mips` | `false` | Generate mipmaps. |

It has `swap()` to flip `read` and `write`, and `resize(width, height)`.

### `createTexture(gl, options)`, `loadTexture(gl, url, options?)`, `updateTexture(gl, texture, source, options?)`

`createTexture` makes a 2D texture from either:

- `img`: an image, canvas, video or `ImageBitmap` that has already loaded, or
- `width` and `height`, with optional `data` (a typed array). Leave `data` out for an empty texture.

```js
// Two floats per texel, read with texelFetch
const positions = createTexture(gl, { data, width: 1024, height: rows, format: gl.RG, type: gl.FLOAT });
```

| Option | Default | |
|---|---|---|
| `type`, `format` | `gl.UNSIGNED_BYTE`, `gl.RGBA` | |
| `internalFormat` | `format` | A sized format (e.g. `gl.RG32F`) is picked for `gl.FLOAT` and `gl.HALF_FLOAT`. |
| `flipY` | `false` | Flip on upload, so the top of an image is at texture coordinate y = 1. |
| `generateMips` | `true` for `gl.UNSIGNED_BYTE` | |
| `minFilter`, `magFilter` | `gl.LINEAR` | Trilinear with mips; `gl.NEAREST` for 32-bit float where linear filtering isn't supported. |
| `wrapS`, `wrapT` | `gl.CLAMP_TO_EDGE` | |
| `level` | `0` | |

`loadTexture` loads an image from a URL and resolves with a texture, taking the same options.

`updateTexture` uploads new contents: an image source, such as the current frame of a video, or a typed array with `width` and `height`. Pass the same `type`, `format` and `flipY` the texture was made with.

### Lower level

`compileShader`, `createProgram`, `linkProgram`, `createBuffer`, `createVertexArray` and `getActiveUniforms` are the pieces `createRenderer` is built from, for when you want more control.

## Development

`lib/` holds the source, one function per file. `npm run build` joins it into `dist/simplegl.js`; the build runs automatically when the package is packed, so `dist/` isn't committed.

Releases use [Changesets](https://github.com/changesets/changesets). Add a changeset with `npx changeset` in any PR that changes `lib/`. Merging to `main` opens a "Version Packages" PR, and merging that publishes to npm and attaches `simplegl.js` to the GitHub release.
