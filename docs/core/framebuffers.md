# Framebuffers

Draw into a texture instead of the canvas, for post-processing, blurs and effects that build up over time. {.lead}

A framebuffer is somewhere to draw other than the canvas. `createFrameBuffer` makes one with a texture to draw into, so the next pass can read what this one drew. Bind it, draw, and pass its target to the next renderer as a texture.

<Example src="framebuffers" :height="320" />

<<< @/examples/framebuffers.js

## Drawing into one

```js
import { createFrameBuffer } from 'wtc-simplegl'

const target = createFrameBuffer(gl, { width: 256, height: 256, singular: true })

// Into the target, at its size
gl.bindFramebuffer(gl.FRAMEBUFFER, target.read.fb)
scene.bindVAOs()
scene.render({ width: target.width, height: target.height })

// Back to the canvas, reading the target
gl.bindFramebuffer(gl.FRAMEBUFFER, null)
show.bindVAOs()
show.setUniforms({ u_image: target.read })
show.render()
```

Each target is a `RenderTarget`: `fb`, the framebuffer to bind, and `targetTexture`, the texture it draws into. Pass the whole target to `setUniforms` and its texture is used.

Pass the target's size to `render()`: it sets the viewport, which otherwise covers the canvas.

## Ping-pong

A shader can't read a texture while drawing into it. For an effect that reads its own last frame, such as a trail or a simulation, you need two: read from one, draw into the other, then swap. Leave out `singular` and you get both, as `read` and `write`:

```js
const feedback = createFrameBuffer(gl, { width, height, type: gl.HALF_FLOAT })

// Each frame
gl.bindFramebuffer(gl.FRAMEBUFFER, feedback.write.fb)
step.bindVAOs()
step.setUniforms({ u_previous: feedback.read })
step.render({ width: feedback.width, height: feedback.height })
gl.bindFramebuffer(gl.FRAMEBUFFER, null)
feedback.swap()
// feedback.read now holds the frame just drawn
```

Set the texture uniforms every frame: `read` and `write` trade places with each swap.

## Options

| Option | Default | |
|---|---|---|
| `width`, `height` | | Size in pixels. |
| `type` | `gl.UNSIGNED_BYTE` | `gl.HALF_FLOAT` or `gl.FLOAT` for float targets. |
| `format` | `gl.RGBA` | `gl.RG` or `gl.RED` for fewer channels with float types. |
| `singular` | `false` | Make `read` only. |
| `depth` | `false` | A depth buffer, for depth testing while drawing into the target. |
| `minFilter`, `magFilter` | `gl.LINEAR` | `gl.NEAREST` for exact texels or pixelated scaling. |
| `tiling` | `gl.CLAMP_TO_EDGE` | The wrap mode when the texture is read. |
| `data` | `null` | Initial contents. |

## Float targets

8-bit targets store 256 levels from 0 to 1. Effects that accumulate, fade slowly, or store positions and velocities need more: `type: gl.HALF_FLOAT` stores 16-bit floats, and `gl.FLOAT` 32-bit. The internal format and the extension needed to draw into them (`EXT_color_buffer_float`) are handled; if the device can't, `createFrameBuffer` throws.

`gl.HALF_FLOAT` is filterable everywhere and half the memory, so prefer it unless you need the precision. `gl.FLOAT` targets default to `gl.NEAREST` where they can't be filtered linearly.

## Resizing

`resize(width, height)` replaces the targets with new, empty ones. Call it from `createContext`'s `onResize`, or check the size before drawing:

```js
if (target.width !== gl.canvas.width / 2) target.resize(gl.canvas.width / 2, gl.canvas.height / 2)
```

The textures are new objects afterwards, which is another reason to pass `target.read` to `setUniforms` every frame rather than keeping its texture.

## Errors

If the combination of `format`, `internalFormat` and `type` can't be drawn into, `createFrameBuffer` throws, naming the reason, such as `FRAMEBUFFER_INCOMPLETE_ATTACHMENT`. Without the check, drawing into it would silently do nothing.

## Freeing them

`delete()` frees the framebuffers, their textures and depth buffers.

## See also

- [Textures](/core/textures)
- API: [createFrameBuffer](/api/functions/createFrameBuffer), [FrameBufferOptions](/api/interfaces/FrameBufferOptions), [FrameBuffer](/api/interfaces/FrameBuffer), [RenderTarget](/api/interfaces/RenderTarget)
