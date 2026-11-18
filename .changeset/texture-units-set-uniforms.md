---
"wtc-simplegl": minor
---

Automatic texture units and `setUniforms`:

- Every sampler uniform gets its own texture unit when the renderer is created. Pass a texture, or a framebuffer target such as `fbo.read`, to `bindUniform` and it's bound to that unit whenever the renderer draws, so renderers don't interfere with each other's textures. Passing a unit number still works for textures bound by hand.
- New `renderer.setUniforms({ ... })` sets several uniforms at once, skipping names the shader doesn't use.
