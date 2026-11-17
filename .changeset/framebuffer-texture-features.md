---
"wtc-simplegl": minor
---

Framebuffer and texture features:

- `createFrameBuffer({ type: gl.FLOAT })` and `gl.HALF_FLOAT` make float render targets. The sized internal format (e.g. `RGBA32F`) and the `EXT_color_buffer_float` extension are handled, and 32-bit float targets fall back to `NEAREST` filtering where linear filtering of them isn't supported.
- `createFrameBuffer({ depth: true })` adds a depth buffer so depth testing works when drawing into the target. Depth buffers are freed on `resize`.
- `createFrameBuffer` throws a clear error if the framebuffer is incomplete, naming the reason, instead of drawing nothing.
- New `loadTexture(gl, url, options)` loads an image and resolves with a texture.
- New `updateTexture(gl, texture, source)` uploads new contents, such as a video frame, and regenerates mipmaps if the texture uses them.
