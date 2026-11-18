# Cleaning up

Free what an effect made when it goes away, so a page or an app can create and remove effects without leaking GPU memory. {.lead}

Buffers, textures, programs and framebuffers live on the GPU, outside JavaScript's garbage collector. Dropping your last reference to a renderer doesn't free its program or buffers; they stay until they're deleted or the context is lost. That matters in single-page apps, where effects come and go with routes and components.

## What to call

| Made with | Free with | What it frees |
|---|---|---|
| `createRenderer` | `renderer.delete()` | Its program, vertex arrays, transform feedback objects, and the buffers made from attribute `data`. Buffers you passed in are left alone. |
| `createFrameBuffer` | `framebuffer.delete()` | Its framebuffers, their textures and depth buffers. |
| `createTexture`, `loadTexture` | `gl.deleteTexture(texture)` | The texture. |
| `createBuffer` | `gl.deleteBuffer(buffer)` | The buffer. |
| `createContext` | abort its `signal` | Stops resizing, and removes the canvas if `createContext` made it. |
| `loop` | abort its `signal` | Stops the loop for good. |

A deleted renderer does nothing if it's called again, so a frame that was already on its way can't throw.

## One signal for everything

`createContext`, `loop` and `loadTexture` all take an `AbortSignal`. Use one `AbortController` per effect, and listeners and loops stop together:

```js
const controller = new AbortController()
const { signal } = controller

const gl = createContext({ canvas, signal })
const quad = createRenderer(gl, { vert, frag, attributes, count: 3 })
const image = await loadTexture(gl, url, { signal })
canvas.addEventListener('pointermove', onPointer, { signal })
loop(draw, { signal })

function destroy() {
  controller.abort()
  quad.delete()
  gl.deleteTexture(image)
}
```

An aborted `loadTexture` rejects without making a texture, so an image that finishes loading after the effect has gone doesn't leak.

## In React

Make everything in an effect, and free it in the effect's cleanup:

```jsx
import { useEffect, useRef } from 'react'
import { createContext, createRenderer, loop } from 'wtc-simplegl'

function Shader({ vert, frag }) {
  const ref = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    const gl = createContext({ canvas: ref.current, signal: controller.signal })
    const quad = createRenderer(gl, {
      vert,
      frag,
      attributes: { a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 } },
      count: 3
    })

    loop(
      (time) => {
        quad.bindVAOs()
        quad.setUniforms({ u_time: time, u_resolution: [gl.canvas.width, gl.canvas.height] })
        quad.render()
      },
      { signal: controller.signal }
    )

    return () => {
      controller.abort()
      quad.delete()
    }
  }, [vert, frag])

  return <canvas ref={ref} style={{ display: 'block', width: '100%', height: '100%' }} />
}
```

This is safe under StrictMode, which runs each effect, cleans it up and runs it again straight away. The canvas is yours, so `createContext` leaves it in place, and `getContext` hands the same context back the second time. Don't lose the context in the cleanup: the second run would get a lost one.

## Losing the context

Browsers limit how many WebGL contexts a page can have, typically 16, and drop the oldest when there are too many. If you make a canvas per effect and throw it away, lose its context when you're done, so it doesn't count against the limit:

```js
gl.getExtension('WEBGL_lose_context')?.loseContext()
canvas.remove()
```

Only do this for a canvas you're discarding. A lost context can't be used again.

## See also

- API: [Renderer](/api/interfaces/Renderer), [FrameBuffer](/api/interfaces/FrameBuffer)
