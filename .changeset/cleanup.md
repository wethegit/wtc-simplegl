---
"wtc-simplegl": minor
---

Everything can be cleaned up, e.g. when a React component unmounts:

- New `renderer.delete()` frees its program, vertex arrays, transform feedback objects and the buffers made from attribute `data`. A deleted renderer does nothing.
- New `framebuffer.delete()` frees its framebuffers, textures and depth buffers.
- `loop` takes a `signal` that stops it for good.
- `createContext`'s `signal` also removes the canvas if `createContext` created it. A canvas you pass in is kept, with its context.
- `loadTexture` takes a `signal`; aborting it before the image loads rejects without making a texture.
