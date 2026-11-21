---
"wtc-simplegl": minor
---

Data textures and `flipY`:

- `createTexture` can make a texture from a typed array: pass `width`, `height` and `data` instead of `img`, or leave out `data` for an empty texture. Rows don't need to be 4-byte aligned.
- `updateTexture` accepts a typed array with `width` and `height`, which may differ from before.
- Float types get a sized internal format (e.g. `RG32F`), skip mipmaps by default, and use `NEAREST` filtering where 32-bit float can't be filtered linearly.
- New `flipY` option on both, so an image's top row ends up at texture coordinate y = 1.
- Pixel store settings changed for an upload are restored afterwards.
