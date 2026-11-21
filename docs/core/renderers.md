# Renderers and attributes

A renderer is a program with its vertex array: the shaders, the attributes they read, and what to draw. {.lead}

`createRenderer` compiles a vertex and a fragment shader, links them, and makes a vertex array from the attributes you give it. It's the piece almost everything else is built around.

<Example src="renderers" :height="320" />

<<< @/examples/renderers.js

## Making one

```js
import { createRenderer } from 'wtc-simplegl'

const triangle = createRenderer(gl, {
  vert,
  frag,
  attributes: {
    a_position: { data: new Float32Array([0, 0.6, -0.55, -0.4, 0.55, -0.4]), size: 2 },
    a_colour: { data: new Float32Array([1, 0.45, 0.7, 0.29, 0.62, 1, 1, 0.8, 0.3]), size: 3 }
  },
  count: 3
})
```

| Option | Default | |
|---|---|---|
| `vert`, `frag` | | GLSL ES 3.00 source. |
| `attributes` | `{}` | The vertex attributes, by name. |
| `count` | | Number of vertices to draw. |
| `offset` | `0` | The first vertex to draw. |
| `mode` | `gl.TRIANGLES` | The primitive: `gl.POINTS`, `gl.LINES`, `gl.LINE_STRIP`, `gl.TRIANGLE_STRIP` and so on. |

If a shader doesn't compile or the program doesn't link, `createRenderer` throws with the log and the source lines it points at. See [Shaders and programs](/lower-level/shaders-and-programs#errors).

## Attributes

Each attribute's name matches an `in` in the vertex shader. Give it `data`, a typed array that's uploaded into a new buffer, and `size`, the components per vertex:

```js
a_uv: { data: new Float32Array([0, 0, 1, 0, 0, 1]), size: 2 }
```

The rest of the options match `gl.vertexAttribPointer`, and default to WebGL's usual values:

| Option | Default | |
|---|---|---|
| `size` | `1` | Components per vertex, 1 to 4. |
| `type` | `gl.FLOAT` | The type of each component. |
| `normalize` | `false` | Map integer types to 0–1, e.g. colours in a `Uint8Array`. |
| `stride`, `offset` | `0` | For several attributes in one interleaved buffer, in bytes. |
| `usage` | `gl.STATIC_DRAW` | `gl.DYNAMIC_DRAW` for data you'll change. |
| `buffer` | | An existing buffer to read, instead of `data`. |
| `index` | the attribute's position | Its location, if a shader needs a particular one. |

## Drawing

Bind, set uniforms, render:

```js
triangle.bindVAOs()
triangle.setUniforms({ u_time: time })
triangle.render()
```

`bindVAOs()` makes the renderer's program current and binds its vertex array, and its textures; `render()` sets the viewport and draws `count` vertices with `gl.drawArrays`. With no arguments the viewport is the whole canvas. Pass a size to draw into part of it, or into a [framebuffer](/core/framebuffers) of a different size:

```js
renderer.render({ width: target.width, height: target.height })
renderer.render({ x: 0, y: 0, width: gl.canvas.width / 2, height: gl.canvas.height })
```

`render()` doesn't clear. Call `gl.clear` yourself, once per frame, before the first draw.

## Indexed drawing

An attribute with `buffertype: gl.ELEMENT_ARRAY_BUFFER` becomes the vertex array's index buffer, so shapes can share vertices. A square is four vertices and six indices:

```js
const square = createRenderer(gl, {
  vert,
  frag,
  attributes: {
    a_position: { data: new Float32Array([-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5]), size: 2 },
    indices: { data: new Uint16Array([0, 1, 2, 0, 2, 3]), buffertype: gl.ELEMENT_ARRAY_BUFFER }
  }
})

square.bindVAOs()
gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
```

`render()` always draws with `drawArrays`, so draw indexed geometry with `gl.drawElements` after `bindVAOs()`. Set the viewport yourself if nothing else has: `gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)`.

## Changing data

To change an attribute's values after the renderer is made, keep the buffer and upload into it. Make the buffer yourself with `createBuffer` and pass it as `buffer`:

```js
import { createBuffer } from 'wtc-simplegl'

const positions = new Float32Array(count * 2)
const buffer = createBuffer(gl, positions, gl.DYNAMIC_DRAW)
const points = createRenderer(gl, { vert, frag, mode: gl.POINTS, count, attributes: { a_position: { buffer, size: 2 } } })

// Each frame, after changing positions
gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions)
```

For data that changes every frame, consider simulating it on the GPU with [transform feedback](/core/transform-feedback) instead.

## Several renderers

Each renderer has its own program and remembers its own uniforms and textures, so several can share a canvas: bind and render each in turn. `bindUniform` and `setUniforms` work on a renderer even when another one's program is current.

## See also

- [Uniforms](/core/uniforms)
- [Transform feedback](/core/transform-feedback), for attributes the GPU updates
- API: [createRenderer](/api/functions/createRenderer), [RendererOptions](/api/interfaces/RendererOptions), [Attribute](/api/interfaces/Attribute), [Renderer](/api/interfaces/Renderer)
