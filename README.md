# wtc-simplegl

A small WebGL2 helper library. It takes care of the boilerplate (compiling and linking shaders, vertex arrays, uniforms, textures, framebuffers, canvas sizing, cleaning up) and otherwise stays out of the way: you still write GLSL and plain `gl` calls.

It's built to work where you can't install packages. The whole library is one file you can copy into a project.

**[Documentation](https://wethegit.github.io/wtc-simplegl/)**: guides, a cookbook of live examples, and the API reference.

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

A full-window canvas with an animated fragment shader:

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
out vec4 colour;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  colour = vec4(uv, 0.5 + 0.5 * sin(u_time), 1);
}`,
  attributes: {
    // One triangle that covers the screen
    a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 },
  },
  count: 3,
});

loop((time) => {
  quad.bindVAOs();
  quad.setUniforms({ u_resolution: [gl.canvas.width, gl.canvas.height], u_time: time });
  quad.render();
});
```

[Your first shader](https://wethegit.github.io/wtc-simplegl/getting-started/first-shader) walks through it.

## What's in it

- `createContext` and `loop`: a WebGL2 context that keeps the canvas sized to the page, and a frame loop.
- `createRenderer`: a program, its vertex array and uniforms, with `setUniforms` for numbers, arrays and textures alike.
- `createTexture`, `loadTexture`, `updateTexture`: textures from images, canvases, video and typed arrays.
- `createFrameBuffer`: framebuffers, ping-pong pairs, float targets and depth.
- Transform feedback, for simulating on the GPU and drawing the results with another renderer.
- `delete()` and `AbortSignal` support throughout, for React and other places effects come and go.

## Development

`lib/` holds the source, one function per file. `npm run build` joins it into `dist/simplegl.js`; the build runs automatically when the package is packed, so `dist/` isn't committed.

The documentation is in `docs/`, with its own `package.json`. Run `npm ci --prefix docs` once, then `npm run docs:dev`. [docs/README.md](docs/README.md) covers writing pages, live examples and the JSDoc the API reference needs.

Releases use [Changesets](https://github.com/changesets/changesets). Add a changeset with `npx changeset` in any PR that changes `lib/`. Merging to `main` opens a "Version Packages" PR, and merging that publishes to npm and attaches `simplegl.js` to the GitHub release.
