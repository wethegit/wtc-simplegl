---
"wtc-simplegl": patch
---

Fix vertex arrays and transform feedback:

- Transform feedback outputs are written to the right buffers when other attributes come before them. They were rebound every frame using the attribute's position instead of its varying index.
- `render()` binds the transform feedback object only while drawing, so its buffers can be read or drawn from afterwards without a GL error.
- Only transform feedback attributes get two buffers. Other attributes are shared between the two vertex arrays instead of being uploaded twice.
- `createRenderer` throws a clear error when transform feedback is used with a mode other than `gl.POINTS`, `gl.LINES` or `gl.TRIANGLES`, and when a transform feedback attribute has no `data`.
- `ELEMENT_ARRAY_BUFFER` attributes are bound as the vertex array's index buffer instead of as a vertex attribute.
- The vertex array is no longer left bound after creation, so later buffer binds can't change it.
