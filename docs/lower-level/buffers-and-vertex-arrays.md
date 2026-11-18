# Buffers and vertex arrays

Make buffers and vertex arrays directly, for geometry you manage yourself. {.lead}

## Buffers

`createBuffer` makes a buffer and uploads data into it:

```js
import { createBuffer } from 'wtc-simplegl'

const buffer = createBuffer(gl, new Float32Array([0, 0, 1, 0, 0, 1]))
const indices = createBuffer(gl, new Uint16Array([0, 1, 2]), gl.STATIC_DRAW, gl.ELEMENT_ARRAY_BUFFER)
```

The third argument is the usage, `gl.STATIC_DRAW` by default; use `gl.DYNAMIC_DRAW` for data you'll change. The fourth is the target. The buffer is left bound to that target.

Pass a buffer to a renderer as an attribute's `buffer`, and update it with `gl.bufferSubData`. The renderer won't delete a buffer you gave it, so free it with `gl.deleteBuffer` when you're done.

## Vertex arrays

`createVertexArray(gl, program, attributes)` is what `createRenderer` uses to set up attributes. It makes the vertex array, binds each attribute's location on the program (which must not be linked yet), and returns what it made:

```js
import { createProgram, createVertexArray, linkProgram } from 'wtc-simplegl'

const program = createProgram(gl, vert, frag)
const { vaos, locations, buffers } = createVertexArray(gl, program, {
  a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 }
})
linkProgram(gl, program)

gl.useProgram(program)
gl.bindVertexArray(vaos[0])
gl.drawArrays(gl.TRIANGLES, 0, 3)
```

With transform feedback attributes it makes two vertex arrays and two transform feedback objects, in `vaos` and `tfbs`, and lists each one's output buffers in `tfbBuffers`. `buffers` is every buffer it made from `data`, for freeing later.

Each attribute's location defaults to its position in the object. Set `index` to choose one.

## See also

- [Renderers and attributes](/core/renderers)
- API: [createBuffer](/api/functions/createBuffer), [createVertexArray](/api/functions/createVertexArray), [VertexArrayBindings](/api/interfaces/VertexArrayBindings)
