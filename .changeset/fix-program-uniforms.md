---
"wtc-simplegl": patch
---

Fix programs and uniforms:

- `createRenderer` no longer throws when `attributes` is omitted, no longer modifies the attributes object you pass in, and no longer writes `window.attributes`.
- `createProgram` no longer shares the program through a module-level variable, and `linkProgram(gl, program)` is now exported so programs made with `createProgram` can be linked. Shaders are freed after linking or a failed compile.
- `bindUniform` switches to the renderer's program when another one is in use, instead of setting the uniform on the wrong program.
- `float[]` uniforms accept `Float32Array` values (they were silently ignored).
- Array uniforms can be set by their plain name (`u_values`) as well as `u_values[0]`.
- Adds the missing WebGL2 uniform types: `uint`/`uvec*`, non-square matrices, and 3D, array, shadow and integer samplers.
- The renderer now also returns its `program`.
