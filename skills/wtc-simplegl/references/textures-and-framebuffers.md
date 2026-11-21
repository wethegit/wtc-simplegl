# Textures and framebuffers (wtc-simplegl 1.1)

Docs: `/core/textures`, `/core/framebuffers`. The recipes `/cookbook/ping-pong`, `/cookbook/image-effect`, `/cookbook/data-textures` and `/cookbook/live-canvas` show complete programs.

Every texture here is a plain `WebGLTexture`: pass it to `setUniforms`, and free it with `gl.deleteTexture`.

## createTexture

From an image source that has **already loaded**: an `HTMLImageElement`, canvas, `OffscreenCanvas`, video or `ImageBitmap`.

```js
const texture = createTexture(gl, { img: canvas, flipY: true });
```

From data: `width` × `height` pixels, as a typed array, or with `data` left out for an empty texture.

```js
// RG float lookups, read with texelFetch
const lookup = createTexture(gl, {
  data: new Float32Array(1024 * rows * 2), width: 1024, height: rows,
  format: gl.RG, type: gl.FLOAT,
  minFilter: gl.NEAREST, magFilter: gl.NEAREST,
});

// 8-bit RGBA
const pixels = createTexture(gl, { data: new Uint8Array(w * h * 4), width: w, height: h, generateMips: false });
```

| Option | Default | Notes |
|---|---|---|
| `flipY` | `false` | Flip on upload, so the top of the image is at y = 1. Use it for images; leave it off for data. |
| `format` | `gl.RGBA` | `gl.RG`, `gl.RED`, `gl.RGB`… |
| `type` | `gl.UNSIGNED_BYTE` | `gl.FLOAT`, `gl.HALF_FLOAT`, `gl.UNSIGNED_INT`… |
| `internalFormat` | `format`, or the sized float format | RGBA/RG/RED with `FLOAT` → `RGBA32F`/`RG32F`/`R32F`; with `HALF_FLOAT` → `…16F`. Pass it yourself for integer textures, e.g. `gl.R32UI` with `format: gl.RED_INTEGER`. |
| `generateMips` | `true` for `UNSIGNED_BYTE` | Turn it off for textures you update often or read with `texelFetch`. |
| `minFilter` | `LINEAR_MIPMAP_LINEAR` with mips, else `LINEAR` | `NEAREST` for 32-bit float without `OES_texture_float_linear`. |
| `magFilter` | `LINEAR` | The same float fallback. |
| `wrapS`, `wrapT` | `gl.CLAMP_TO_EDGE` | `gl.REPEAT` for tiling noise. In WebGL2 it works at any size. |
| `level` | `0` | |

- Only `gl.TEXTURE_2D` is supported. Make cube maps and 3D or array textures with plain `gl` calls. Samplers of those types still take the texture through `setUniforms`.
- Rows of data don't need 4-byte alignment; `UNPACK_ALIGNMENT` is set to 1 for the upload and restored afterwards.
- Integer textures (`usampler2D`/`isampler2D`) need `NEAREST` filtering and no mipmaps.

## loadTexture

```js
const photo = await loadTexture(gl, "photo.jpg", { flipY: true, signal });
```

- It takes `createTexture`'s options, plus `signal`.
- It rejects with `loadTexture: couldn't load <url>` on failure. If `signal` is aborted first, it rejects with the signal's reason and makes no texture, so catch that in cleanup paths.
- Cross-origin images need CORS headers. `crossOrigin = "anonymous"` is set for you.

## updateTexture

New contents for an existing texture, typically every frame for video or a 2D canvas you draw into:

```js
updateTexture(gl, texture, video, { flipY: true });              // image source
updateTexture(gl, lookup, floats, { width, height, format: gl.RG, type: gl.FLOAT }); // data; size may change
```

- Pass the same `format`, `type` and `flipY` the texture was made with, if they weren't the defaults.
- Mipmaps are regenerated if the texture's filter uses them. Create video and canvas textures with `generateMips: false` to avoid that cost.
- Only upload a video frame when one is ready (`video.readyState >= 2`). `requestVideoFrameCallback` is the cleanest trigger.

## createFrameBuffer

```js
const target = createFrameBuffer(gl, { width: 512, height: 512 });                  // ping-pong pair
const once   = createFrameBuffer(gl, { width, height, singular: true });             // one target
const sim    = createFrameBuffer(gl, { width, height, type: gl.HALF_FLOAT });        // float
const scene  = createFrameBuffer(gl, { width, height, singular: true, depth: true }); // with depth
```

The result is `{ width, height, read, write, swap(), resize(w, h), delete() }`:
- `read` and `write` are `{ fb, targetTexture, depthBuffer }`.
- `write` is `null` with `singular: true`.

| Option | Default | Notes |
|---|---|---|
| `type` | `gl.UNSIGNED_BYTE` | `gl.HALF_FLOAT` (prefer this) or `gl.FLOAT`. These need `EXT_color_buffer_float`; it throws if that's missing. |
| `format`, `internalFormat` | `gl.RGBA`, picked | `RGBA16F` / `RGBA32F` for float types. |
| `data` | `null` | Initial pixels for both targets. |
| `singular` | `false` | One target, with no `write`. |
| `depth` | `false` | Adds a 24-bit depth renderbuffer. Enable `gl.DEPTH_TEST` and clear `DEPTH_BUFFER_BIT` yourself. |
| `minFilter`, `magFilter` | `LINEAR` | `NEAREST` for 32-bit float without linear-filtering support. |
| `tiling` | `gl.CLAMP_TO_EDGE` | The wrap mode in both directions. |
| `mips` | `false` | Generated once at creation, not after each draw. |

It throws `framebuffer is incomplete (FRAMEBUFFER_…)` for format and type combinations that can't be rendered to.

### Drawing into a target

```js
gl.bindFramebuffer(gl.FRAMEBUFFER, target.write.fb);
step.bindVAOs();
step.setUniforms({ u_previous: target.read });           // a target works as a sampler value; pass it every frame
step.render({ width: target.width, height: target.height }); // otherwise the viewport is the canvas
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
target.swap();                                            // read is now what was just drawn

show.bindVAOs();
show.setUniforms({ u_result: target.read });
show.render();
```

- Always pass the target's size to `render()`.
- Pass `target.read` again after every `swap()`. The renderer records the texture it held when you passed it, not the target.
- Don't sample the texture you're drawing into. That's what the pair is for.
- A pair starts with both targets empty, or holding `data`. To seed it, draw once into `write` and `swap()`, or pass `data`.

### Following the canvas size

`resize(w, h)` replaces the targets with **empty** ones. Either resize from `onResize`, or check each frame:

```js
const fit = () => {
  const { width, height } = gl.canvas;
  if (width !== target.width || height !== target.height) target.resize(width, height);
};
// call fit() at the top of each frame
```

Checking each frame avoids racing a framebuffer made after `createContext` has already called `onResize`.

For a cheaper effect, use a fraction of the canvas size (`Math.ceil(width / 2)`). Bilinear filtering of the half-size texture blurs a little for free.

### Reading pixels back

```js
gl.bindFramebuffer(gl.FRAMEBUFFER, target.read.fb);
const out = new Uint8Array(4);
gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
```

This is slow, because it waits for the GPU, so avoid it every frame. Read float targets with `gl.RGBA, gl.FLOAT` into a `Float32Array`.
