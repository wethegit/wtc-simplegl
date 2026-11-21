# Lower level (wtc-simplegl 1.1)

Docs: `/lower-level/shaders-and-programs`, `/lower-level/buffers-and-vertex-arrays`.

`createRenderer` is built from these functions. Use them directly when a renderer doesn't fit: indexed or instanced drawing, sharing one vertex array between programs, or wrapping a program you link yourself. Most programs never need them.

## Shaders and programs

```js
import { compileShader, createProgram, linkProgram, getActiveUniforms } from "./simplegl.js";

const program = createProgram(gl, vertSource, fragSource); // compiles both, attaches; NOT linked
// bind attribute locations here if you need fixed ones: gl.bindAttribLocation(program, 0, "a_position")
linkProgram(gl, program);                                   // links, throws with the log, frees the shaders
const uniforms = getActiveUniforms(gl, program);            // { name: { location, type, size } }
gl.useProgram(program);
gl.uniform1f(uniforms.u_time.location, time);
```

- `compileShader(gl, source, gl.VERTEX_SHADER | gl.FRAGMENT_SHADER)` throws `Vertex shader failed to compile:` with the log. It also shows the failing source lines marked `>` with two lines of context, and a hint when `#version 300 es` isn't the first line.
- `createProgram(gl, vert, frag, attributes?)` sets up transform feedback varyings from any attributes with `component: "transformFeedback"`. It throws if the context isn't WebGL2 or a source is missing.
- `linkProgram` throws `Program failed to link:` with the log.
- `getActiveUniforms` lists array uniforms under both `name[0]` and `name`, and leaves out members of uniform blocks.

## Buffers and vertex arrays

```js
import { createBuffer, createVertexArray } from "./simplegl.js";

const buffer = createBuffer(gl, new Float32Array(data), gl.STATIC_DRAW); // left bound to ARRAY_BUFFER

const program = createProgram(gl, vert, frag);
const bindings = createVertexArray(gl, program, {           // before linking: it binds locations
  a_position: { data: positions, size: 3 },
  a_normal:   { buffer: normalBuffer, size: 3 },
  indices:    { data: new Uint16Array(indices), buffertype: gl.ELEMENT_ARRAY_BUFFER },
});
linkProgram(gl, program);
// bindings = { vaos, tfbs, tfbBuffers, hasTFBs, locations, buffers }
```

- `vaos` has one vertex array, or two with transform feedback attributes. `locations` holds each attribute's location by name. `buffers` lists the buffers made from `data`, which are yours to delete.
- An `ELEMENT_ARRAY_BUFFER` attribute becomes the vertex array's index buffer instead of an attribute.

## Indexed drawing

A renderer's `render()` only calls `drawArrays`. With an index buffer, draw it yourself after `bindVAOs()`:

```js
const mesh = createRenderer(gl, {
  vert, frag,
  attributes: {
    a_position: { data: positions, size: 3 },
    indices:    { data: new Uint16Array(indices), buffertype: gl.ELEMENT_ARRAY_BUFFER },
  },
});

// Textures are bound by bindVAOs() and render(); without render(), set them first
mesh.setUniforms({ u_matrix: matrix, u_texture: texture });
mesh.bindVAOs();
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
```

## Instancing

Also by hand: set the divisor on the per-instance attributes while the renderer's vertex array is bound, then draw instanced.

```js
const sprites = createRenderer(gl, {
  vert, frag,
  attributes: {
    a_corner: { data: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), size: 2 },
    a_offset: { data: offsets, size: 2 },       // one per instance
  },
});
const offsetLocation = gl.getAttribLocation(sprites.program, "a_offset");

sprites.setUniforms({ u_size: 0.02 });          // before bindVAOs(), as above
sprites.bindVAOs();
gl.vertexAttribDivisor(offsetLocation, 1);      // stored in the vertex array, so once is enough
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, offsets.length / 2);
```

A renderer that reads a simulation's output with `from` can use the same divisor trick, so each particle is drawn as an instanced quad.

## Cleaning up by hand

Delete what you made: `gl.deleteProgram`, `gl.deleteVertexArray` for each of `bindings.vaos`, `gl.deleteTransformFeedback` for `bindings.tfbs`, and `gl.deleteBuffer` for `bindings.buffers` and your own buffers. A renderer's `delete()` does all of this for what it made.
