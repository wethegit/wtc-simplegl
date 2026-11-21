---
name: wtc-simplegl
description: wtc-simplegl WebGL2 helper library (1.1) - createContext, loop, createRenderer with setUniforms, createTexture/loadTexture/updateTexture, createFrameBuffer ping-pong and float targets, transform feedback particles, delete() and AbortSignal cleanup for React. Use when writing or debugging wtc-simplegl code, or small WebGL2 programs that copy simplegl.js in (CodePen, static pages). Also says when to suggest wtc-gl or three.js instead.
---

# wtc-simplegl

A small **WebGL2-only** helper library. It handles the boilerplate: compiling and linking shaders, vertex arrays, uniforms, textures, framebuffers, canvas sizing and cleaning up. Everything else stays plain WebGL: you write the GLSL and call `gl` directly for state such as blending, clearing and binding framebuffers.

- **Docs:** https://wethegit.github.io/wtc-simplegl/. Guides, live cookbook recipes and the API reference. When this file and the docs disagree, read the docs.
- **Source:** https://github.com/wethegit/wtc-simplegl. `lib/` has one function per file, each with full JSDoc.
- **Version:** this file covers **1.1.0**. 1.1 added `createContext`, `loop`, `setUniforms`, samplers that take textures directly, data textures, float and depth framebuffers, transform feedback `outputs` and `from`, and `delete()` / `AbortSignal` cleanup. Code for 1.0 set sampler units by hand and had no cleanup.

## Getting it

It's one ES module with no dependencies, so it works where you can't install packages.

```js
// Copy-paste: download simplegl.js from a GitHub release, or link a CDN copy
import { createContext, createRenderer, loop } from "https://cdn.jsdelivr.net/npm/wtc-simplegl/dist/simplegl.js";
// or from a local copy
import { createContext, createRenderer, loop } from "./simplegl.js";
// npm install wtc-simplegl
import { createContext, createRenderer, loop } from "wtc-simplegl";
```

Pin a version on a CDN (`wtc-simplegl@1.1.0/dist/simplegl.js`) for anything that has to keep working.

**Exports:**
- Setup: `createContext`, `loop`.
- Drawing: `createRenderer`.
- Textures: `createTexture`, `loadTexture`, `updateTexture`.
- Framebuffers: `createFrameBuffer`.
- Lower level: `compileShader`, `createProgram`, `linkProgram`, `createVertexArray`, `createBuffer`, `getActiveUniforms`.

There is nothing else. There are no matrices, cameras, geometry, lighting or scene graph.

## When to suggest something else

Check that wtc-simplegl suits the job before writing much code.

**wtc-simplegl suits:**
- full-screen fragment shaders, image and video effects, and post-processing passes;
- 2D generative graphics;
- ping-pong simulations in framebuffers, and GPU particles with transform feedback;
- anything that has to be one copy-pasted file, such as CodePen, a static page, or a CMS embed;
- one small effect inside a larger page or app.

**Suggest [wtc-gl](https://wethegit.github.io/wtc-gl/docs/)** (same team, also WebGL2 and small) when the ask is really a 3D scene:
- meshes with a camera and orbit controls;
- built-in primitives or extruded paths;
- lights and shadows;
- glTF models;
- picking with raycasts;
- thick lines.

**Also suggest wtc-gl when WebGL is woven into a React or HTML page** rather than living in one canvas. Use it with its React bindings, `@wethegit/react-wtc-gl`. The signs:
- effects attached to several page elements, such as hero sections, cards, or images that ripple or distort as they scroll by;
- WebGL that has to stay lined up with HTML layout while the page scrolls and reflows;
- page images that should become textures in place;
- one effect per component, repeated down a page.

wtc-gl's `ScrollRenderer` draws every scene into **one shared canvas** over the page, so one context serves the whole page. Each scene follows its element's position and only draws while on screen. In React:
- a `ScrollRendererProvider` goes in the layout;
- each component calls `useScrollScene(ref, setup)` or `useScrollImage(ref, setup)` on its own element, and returns a cleanup from `setup`.

With wtc-simplegl, the same page would need one canvas and context per component. Browsers cap live WebGL contexts (Chrome at 16) and lose the oldest past that, with only a console warning. You'd also be writing the scroll syncing and culling yourself.

wtc-simplegl is still the right fit in React for **one** canvas component: a hero background, a single shader panel, or a particle field behind the content. The pattern is in "Cleaning up" below. For several of them on a page, suggest wtc-gl.

**Suggest [three.js](https://threejs.org)** when the ask needs a large ecosystem:
- PBR materials and environment maps;
- a stack of post-processing effects;
- many model formats;
- physics or animation-mixer integrations;
- WebXR or WebGPU;
- React Three Fiber;
- a team that already knows three.js and will maintain the code.

**Signs a wtc-simplegl task is outgrowing it:** you're writing your own matrix maths, a camera, mesh loading, normals and lighting, or a list of objects to draw in order. Each of those is a few lines in wtc-gl or three.js, and many lines here. A 3D effect with one or two simple meshes is still fine: bring gl-matrix for the matrices.

**Suggest the switch, don't make it.** If the project already uses wtc-simplegl, or the user asked for it, say what the other library would save and why. Then carry on with wtc-simplegl unless they agree to switch. Don't mix libraries in one canvas.

## Reference files

Read the matching file before writing code in its area:

| Area | File |
|---|---|
| `createTexture` (images, typed-array data, float formats), `loadTexture`, `updateTexture` (video, canvases), `createFrameBuffer` (single, ping-pong, float, depth, resizing) | [references/textures-and-framebuffers.md](references/textures-and-framebuffers.md) |
| Transform feedback: simulating with `component: "transformFeedback"`, `RASTERIZER_DISCARD`, drawing with `from`, `outputs` | [references/transform-feedback.md](references/transform-feedback.md) |
| `compileShader`, `createProgram`/`linkProgram`, `createVertexArray`, `createBuffer`, `getActiveUniforms`; index buffers and instancing by hand | [references/lower-level.md](references/lower-level.md) |

A complete single-file page (transform feedback particles, drawn by a second renderer, with cleanup) is in `examples/particles.html`.

---

## The shape of a program

```js
import { createContext, createRenderer, loop } from "./simplegl.js";

const gl = createContext(); // a new canvas that fills the window

const quad = createRenderer(gl, {
  vert: `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0, 1);
}`,
  frag: `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
in vec2 v_uv;
out vec4 colour;
void main() {
  colour = vec4(v_uv, 0.5 + 0.5 * sin(u_time), 1);
}`,
  attributes: {
    // One triangle that covers the screen
    a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 },
  },
  count: 3,
});

loop((time) => {
  quad.bindVAOs();                // use the program, bind its vertex array and textures
  quad.setUniforms({ u_resolution: [gl.canvas.width, gl.canvas.height], u_time: time });
  quad.render();                  // set the viewport and draw
});
```

Each draw is **`bindVAOs()` → `setUniforms()` → `render()`**, for every renderer you draw. `setUniforms` can also come before `bindVAOs()`, because it makes its program current itself. Textures are bound by `bindVAOs()` and `render()`, so when you draw by hand instead of calling `render()`, set textures before `bindVAOs()`. `render()` always calls `drawArrays`. Plain `gl` calls go around these: `gl.clear`, `gl.enable(gl.BLEND)` and `gl.bindFramebuffer`.

## createContext

```js
const gl = createContext({
  canvas,               // use your own canvas (size it with CSS); otherwise one is created
  container,            // where a new canvas goes (default document.body: fixed, fills the window)
  dpr,                  // fixed pixel ratio; default devicePixelRatio capped at 2, updated on zoom
  autoResize: true,     // follow the canvas's CSS size with a ResizeObserver
  onResize(width, height, gl) {}, // device pixels; called straight away, then on every resize
  attributes: { alpha: true, premultipliedAlpha: true }, // passed to getContext
  signal,               // AbortSignal: stops resizing; removes the canvas only if it created it
});
```

- **The canvas it creates** is `position: fixed; inset: 0; width: 100%; height: 100%` in `document.body`, or `width: 100%; height: 100%` in `container`.
- **Resizing:** the ResizeObserver watches the canvas itself, so it follows the window or the container.
- **Pointer events and z-index:** it gets them like any element, with no special handling. Add `canvas.style.touchAction = "none"` for touch drawing, and set a z-index if it should sit behind content.

- It throws if WebGL2 isn't available.
- `gl.canvas.width` and `height` are always the current pixel size. Read them each frame rather than caching them.
- Resizing the canvas clears it. Resize framebuffers that follow the canvas from `onResize`, or check the size each frame (see the framebuffer reference).

## loop

```js
const animation = loop((time, delta, frame) => { /* draw */ }, { autoStart: true, signal });
animation.stop(); animation.start(); animation.running;
```

- `time` is the seconds the loop has run, not counting time stopped. `delta` is the seconds since the last frame, and is 0 on the first frame after starting. `frame` is the frame count.
- Clamp `delta` before using it in a simulation (`Math.min(delta, 1 / 30)`), because a background tab can come back after seconds.
- Aborting `signal` stops it for good.

## createRenderer

```js
const renderer = createRenderer(gl, {
  vert, frag,            // GLSL ES 3.00 sources
  attributes: {          // by name in the vertex shader
    a_position: { data: new Float32Array(...), size: 2 },
    a_colour:   { data: new Uint8Array(...), size: 4, type: gl.UNSIGNED_BYTE, normalize: true },
    a_shared:   { buffer: existingBuffer, size: 3 },          // reuse a WebGLBuffer
  },
  count: 3,              // vertices drawn by render()
  offset: 0,             // first vertex
  mode: gl.TRIANGLES,    // gl.POINTS, gl.LINES, gl.TRIANGLE_STRIP…
});
```

**Attribute options:**
- `size` is 1 to 4 components.
- `type` defaults to `gl.FLOAT`. `normalize`, `stride` (in bytes) and `offset` (in bytes) work as in `vertexAttribPointer`.
- `usage` defaults to `gl.STATIC_DRAW`.
- `index` is the location, and defaults to the attribute's position in the object.
- `buffertype: gl.ELEMENT_ARRAY_BUFFER` makes it the index buffer. Draw it with `gl.drawElements` yourself; see the lower-level reference.
- `component: "transformFeedback"`, `varying`, `from` and `output` are for transform feedback; see its reference.

**What a renderer has:**
- `program`.
- `uniforms`: the active uniforms by name, as `{ location, type, size, unit? }`.
- `bindUniform(name, value)` and `setUniforms(values)`.
- `bindVAOs()`.
- `render({ x, y, width, height })`: the viewport, which defaults to the whole canvas.
- `outputs`.
- `delete()`.

To change the vertex data, write into the buffer yourself with `gl.bufferSubData`, or make a new renderer. A renderer has no `setAttribute`.

## Uniforms

`setUniforms({ ... })` looks each name up in the program and calls the right `gl.uniform*` for its GLSL type:

| GLSL | Pass |
|---|---|
| `float`, `int`, `uint`, `bool` | a number (or boolean) |
| `vec2/3/4`, `ivec*`, `uvec*`, `bvec*` | an array or typed array of that length |
| `mat2/3/4`, `mat2x3`… | a flat array, column-major |
| `float u_values[8]` and other arrays | one flat array, set by the plain name `u_values` |
| `sampler2D`, `sampler3D`, `samplerCube`, `sampler2DArray`, int/uint/shadow samplers | a `WebGLTexture`, or a framebuffer target (`fb.read`) |
| `sampler2D u_levels[4]` | an array of textures |

- **Samplers get their own texture units automatically** when the renderer is made. Passing a texture records it, and `bindVAOs()` / `render()` bind it to that unit. There's no `activeTexture` bookkeeping. Passing a unit number instead means "I bind this texture myself".
- **A framebuffer target is read when you pass it.** `setUniforms({ u_previous: fb.read })` records the texture `fb.read` holds at that moment. After `swap()`, pass `fb.read` again, every frame.
- **Values stick.** Uniforms belong to the program, so set only what changes each frame. Setting the same values every frame is also fine.
- **Unknown names are ignored silently.** This includes uniforms the GLSL compiler removed because they don't affect the output. A uniform that "does nothing" is often unused, misspelt, or the wrong type: `[x, y]` for a `vec3` is a GL error, not a fix-up. Check `renderer.uniforms` to see what the program really has.
- `null` and `undefined` values are skipped.

## Cleaning up (React, HMR, components that come and go)

Pass one `AbortSignal` to everything that takes one, then free the GPU side:

```js
useEffect(() => {
  const controller = new AbortController();
  const { signal } = controller;
  const gl = createContext({ canvas: canvasRef.current, signal });
  const quad = createRenderer(gl, { vert, frag, attributes, count: 3 });
  const trail = createFrameBuffer(gl, { width: 256, height: 256 });
  loop((time) => { /* … */ }, { signal });
  loadTexture(gl, url, { signal }).then((t) => (texture = t)).catch(() => {});

  return () => {
    controller.abort();   // stops resizing, the loop, pending loads, listeners added with { signal }
    quad.delete();        // program, vertex arrays, transform feedback objects, buffers made from `data`
    trail.delete();       // framebuffers, their textures, depth buffers
    if (texture) gl.deleteTexture(texture); // textures are plain WebGLTextures
    // The canvas is React's, so the context is kept (see below). If you made the
    // canvas yourself and are removing it, free the context last:
    // gl.getExtension("WEBGL_lose_context")?.loseContext(); canvas.remove();
  };
}, []);
```

- **Don't lose the context of a canvas you passed in.** In development, React StrictMode runs the effect, cleans up, and runs it again on the same canvas. `getContext` then returns the same context, which must still be alive. Only call `WEBGL_lose_context` for a canvas you created and are removing, after the `delete()` calls. `abort()` never loses the context. It only removes a canvas that `createContext` made.
- `delete()` is safe to call twice, and a deleted renderer's methods do nothing.
- Buffers and textures you passed in (`buffer:` attributes, textures given to `setUniforms`) are left alone. Delete them yourself.
- For larger effects, write a plain module with a function that takes a canvas and returns `{ frame, destroy }`. The component or page then only connects it to a `loop`.

## Common patterns

```js
// Transparent canvas over the page: draw premultiplied colours
const gl = createContext({ attributes: { alpha: true, premultipliedAlpha: true } });
gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
// in GLSL: colour = vec4(rgb * alpha, alpha);

// Pointer in device pixels, y up, to match gl_FragCoord
canvas.addEventListener("pointermove", (e) => {
  const r = canvas.getBoundingClientRect();
  const dpr = gl.canvas.width / r.width;
  pointer = [(e.clientX - r.left) * dpr, (r.bottom - e.clientY) * dpr];
}, { signal });

// Draw into a framebuffer: bind it yourself and give render() its size
gl.bindFramebuffer(gl.FRAMEBUFFER, target.write.fb);
step.bindVAOs(); step.setUniforms({ u_previous: target.read }); step.render({ width: target.width, height: target.height });
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
target.swap();
```

## Gotchas

- **`#version 300 es` must be the very first line** of both shaders: not after a blank line, and not after a comment. Write `` vert: `#version 300 es `` with the backtick on the same line. Use `in`/`out`, `texture()` and an `out vec4` instead of `gl_FragColor`. Fragment shaders need `precision highp float;`.
- **Compile errors** throw with the log and the failing source lines marked `>`. Read the message; it names the line.
- **`render()` sets the viewport to the canvas** unless you pass `{ width, height }`. Pass the framebuffer's size when drawing into one.
- **Unused attributes and uniforms are optimised away**, which is harmless. But an attribute the shader reads that you didn't give data for reads as `(0, 0, 0, 1)`; check the name matches.
- **Images are upside down** unless you pass `flipY: true`, because texture y = 0 is the bottom row. Use it for images, canvases and video, and pass the same `flipY` to `updateTexture`.
- **Float framebuffers** need `EXT_color_buffer_float`, which `createFrameBuffer` requests and throws without. Prefer `gl.HALF_FLOAT`, which is more widely supported and can be filtered. 32-bit float textures fall back to `NEAREST` where `OES_texture_float_linear` is missing.
- **Mipmaps:** `createTexture` makes them by default for `UNSIGNED_BYTE` textures. Pass `generateMips: false` for textures you update every frame or read with `texelFetch`.
- **A framebuffer can't be read and written in the same draw.** Use the ping-pong pair: read `fb.read`, draw into `fb.write.fb`, then `swap()`.
- **Transform feedback `mode`** must be `gl.POINTS`, `gl.LINES` or `gl.TRIANGLES`, and the program still needs a fragment shader.
- **Canvas size is 0** when the canvas isn't in the DOM or has no CSS size. `createContext` clamps it to 1 × 1, so make sure the canvas, or its container, has a real size.
