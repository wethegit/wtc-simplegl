---
"wtc-simplegl": patch
---

Fix framebuffers and textures:

- `createFrameBuffer` restores the previous framebuffer and texture bindings, so drawing after creating one no longer goes into the new framebuffer by mistake.
- `framebuffer.resize()` deletes the old textures and framebuffers instead of leaking them, keeps `singular` framebuffers to one target, and no longer re-uploads the original `data` (which no longer fits the new size).
- `createTexture` uses its `target` option for binding and upload, and throws a clear error when `img` is missing.
- `createTexture` now defaults to trilinear filtering (`LINEAR_MIPMAP_LINEAR`) when mipmaps are generated. The previous default, `NEAREST_MIPMAP_LINEAR`, made minified textures look blocky. Pass `minFilter` to keep the old look.
