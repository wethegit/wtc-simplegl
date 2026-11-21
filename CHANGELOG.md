# wtc-simplegl

## 1.1.0

### Minor Changes

- 3b63087: Everything can be cleaned up, e.g. when a React component unmounts:
  
  - New `renderer.delete()` frees its program, vertex arrays, transform feedback objects and the buffers made from attribute `data`. A deleted renderer does nothing.
  - New `framebuffer.delete()` frees its framebuffers, textures and depth buffers.
  - `loop` takes a `signal` that stops it for good.
  - `createContext`'s `signal` also removes the canvas if `createContext` created it. A canvas you pass in is kept, with its context.
  - `loadTexture` takes a `signal`; aborting it before the image loads rejects without making a texture.
- 7d006b3: Add `createContext` and `loop` to cut setup boilerplate.
  
  - `createContext(options)` returns a WebGL2 context and keeps the canvas's pixel size matched to its CSS size and the device pixel ratio (capped at 2 by default, and updated on zoom or when moving to another display). With no options it creates a canvas that fills the window. Options: `canvas`, `container`, `dpr`, `autoResize`, `onResize(width, height, gl)`, `attributes` and `signal`.
  - `loop(fn)` calls `fn(time, delta, frame)` every animation frame, in seconds, and returns `{ start, stop, running }`. Time spent stopped isn't counted, so animations resume where they left off.
  
  ```js
  const gl = createContext();
  loop((time) => {
    /* draw */
  });
  ```
- 73083d1: Data textures and `flipY`:
  
  - `createTexture` can make a texture from a typed array: pass `width`, `height` and `data` instead of `img`, or leave out `data` for an empty texture. Rows don't need to be 4-byte aligned.
  - `updateTexture` accepts a typed array with `width` and `height`, which may differ from before.
  - Float types get a sized internal format (e.g. `RG32F`), skip mipmaps by default, and use `NEAREST` filtering where 32-bit float can't be filtered linearly.
  - New `flipY` option on both, so an image's top row ends up at texture coordinate y = 1.
  - Pixel store settings changed for an upload are restored afterwards.
- 51a3b61: Framebuffer and texture features:
  
  - `createFrameBuffer({ type: gl.FLOAT })` and `gl.HALF_FLOAT` make float render targets. The sized internal format (e.g. `RGBA32F`) and the `EXT_color_buffer_float` extension are handled, and 32-bit float targets fall back to `NEAREST` filtering where linear filtering of them isn't supported.
  - `createFrameBuffer({ depth: true })` adds a depth buffer so depth testing works when drawing into the target. Depth buffers are freed on `resize`.
  - `createFrameBuffer` throws a clear error if the framebuffer is incomplete, naming the reason, instead of drawing nothing.
  - New `loadTexture(gl, url, options)` loads an image and resolves with a texture.
  - New `updateTexture(gl, texture, source)` uploads new contents, such as a video frame, and regenerates mipmaps if the texture uses them.
- 4011c31: The package now includes `dist/simplegl.js`, the whole library as one ES module file for copying into projects that can't install packages. It's available from unpkg and jsDelivr and attached to each GitHub release. Also adds a README.
- 7488ccc: Automatic texture units and `setUniforms`:
  
  - Every sampler uniform gets its own texture unit when the renderer is created. Pass a texture, or a framebuffer target such as `fbo.read`, to `bindUniform` and it's bound to that unit whenever the renderer draws, so renderers don't interfere with each other's textures. Passing a unit number still works for textures bound by hand.
  - New `renderer.setUniforms({ ... })` sets several uniforms at once, skipping names the shader doesn't use.
- 7531ac6: Draw transform feedback results with another program:
  
  - `renderer.outputs` gives the buffers holding a transform feedback renderer's latest output, by attribute name.
  - An attribute declared as `{ from: simulation }` reads the simulation's output of the same name (or `output: "a_name"`), following it each frame as the buffers swap.

### Patch Changes

- bfaa8c6: Declare the package as ES modules (`"type": "module"`) and publish only `lib/`, leaving the demo pages out of the npm tarball. Releases are now published from CI with npm trusted publishing and provenance.
- 281659f: Fix framebuffers and textures:
  
  - `createFrameBuffer` and `createTexture` now throw a clear error when given a WebGL1 context. The library already required WebGL2 (`createRenderer` uses vertex arrays and transform feedback); these two just failed less obviously.
  - `createFrameBuffer` restores the previous draw framebuffer and texture bindings, so drawing after creating one no longer goes into the new framebuffer by mistake. The read framebuffer binding is left untouched.
  - `framebuffer.resize()` deletes the old textures and framebuffers instead of leaking them, keeps `singular` framebuffers to one target, and no longer re-uploads the original `data` (which no longer fits the new size).
  - `createTexture` throws a clear error when `img` is missing, or when `target` isn't `gl.TEXTURE_2D` (other targets never uploaded correctly).
  - `createTexture` now defaults to trilinear filtering (`LINEAR_MIPMAP_LINEAR`) when mipmaps are generated. The previous default, `NEAREST_MIPMAP_LINEAR`, made minified textures look blocky. Pass `minFilter` to keep the old look.
- d626be4: Fix programs and uniforms:
  
  - `createRenderer` no longer throws when `attributes` is omitted, no longer modifies the attributes object you pass in, and no longer writes `window.attributes`.
  - `createProgram` no longer shares the program through a module-level variable, and `linkProgram(gl, program)` is now exported so programs made with `createProgram` can be linked. Shaders are freed after linking or a failed compile.
  - `bindUniform` switches to the renderer's program when another one is in use, instead of setting the uniform on the wrong program.
  - `float[]` uniforms accept `Float32Array` values (they were silently ignored).
  - Array uniforms can be set by their plain name (`u_values`) as well as `u_values[0]`.
  - Adds the missing WebGL2 uniform types: `uint`/`uvec*`, non-square matrices, and 3D, array, shadow and integer samplers.
  - The renderer now also returns its `program`.
- 3afc549: Fix vertex arrays and transform feedback:
  
  - Transform feedback outputs are written to the right buffers when other attributes come before them. They were rebound every frame using the attribute's position instead of its varying index.
  - `render()` binds the transform feedback object only while drawing, so its buffers can be read or drawn from afterwards without a GL error.
  - Only transform feedback attributes get two buffers. Other attributes are shared between the two vertex arrays instead of being uploaded twice.
  - `createRenderer` throws a clear error when transform feedback is used with a mode other than `gl.POINTS`, `gl.LINES` or `gl.TRIANGLES`, and when a transform feedback attribute has no `data`.
  - `ELEMENT_ARRAY_BUFFER` attributes are bound as the vertex array's index buffer instead of as a vertex attribute.
  - The vertex array is no longer left bound after creation, so later buffer binds can't change it.
- 99d54a7: Every export now has JSDoc with types, which editors show as you type and the new API reference is generated from. Option objects and return values are documented as named types (`RendererOptions`, `Renderer`, `FrameBuffer` and so on).
- 142f1d7: Clearer errors when setting up a program:
  
  - Shader compile errors name the shader (vertex or fragment) and show the failing source lines with line numbers. If the source doesn't start with `#version 300 es`, the error says so.
  - Link errors start with "Program failed to link".
  - `createProgram` (and so `createRenderer`) throws a clear error when given a WebGL1 context or missing shader source, instead of failing later with "createVertexArray is not a function" or a GLSL syntax error about `undefined`.
  - A compile failure caused by a lost context says so instead of throwing an empty error.
