# Context and canvas

Make a WebGL2 context, and keep the canvas's drawing buffer sized to the page and the screen's pixel density. {.lead}

A canvas has two sizes: how big it is on the page, set by CSS, and how many pixels it draws, set by its `width` and `height`. To look sharp they need to match, allowing for the device pixel ratio, and keep matching as the page resizes. `createContext` does that for you.

```js
import { createContext } from 'wtc-simplegl'

const gl = createContext({ canvas: document.querySelector('canvas') })
```

It returns a plain `WebGL2RenderingContext`, so everything in WebGL is still there. It throws if the browser can't make a WebGL2 context.

## Which canvas

- **Your own canvas.** Pass `canvas`, and size it with CSS. This is the usual choice, and the one to use in React.
- **A new canvas in an element.** Pass `container`, and a canvas that fills it is appended. Give the container a size.
- **A full-window canvas.** Pass nothing: a canvas is appended to the body, fixed to fill the window.

```js
createContext({ container: document.querySelector('.hero') })
```

## Sizing

The canvas's drawing buffer is its CSS content box, multiplied by the pixel ratio and rounded. By default the pixel ratio follows `devicePixelRatio`, capped at 2, and updates when it changes: when the page is zoomed, or the window moves to another display. A ratio over 2 costs a lot of pixels for little you can see.

```js
createContext({ canvas, dpr: 1 }) // fixed: cheaper, and softer on high-density screens
```

Resizing uses a `ResizeObserver`, so it follows the canvas's own size rather than the window's: a canvas in a sidebar that collapses resizes too. Set `autoResize: false` to size it yourself.

Changing a canvas's size clears it, so resizing between frames can flash. Draw every frame, or redraw in `onResize`.

## Reacting to a resize

`onResize` is called with the new size in device pixels, once when the context is made and after every resize. Use it for anything that depends on the size, such as framebuffers:

```js
let target
const gl = createContext({
  canvas,
  onResize(width, height) {
    target?.resize(width / 2, height / 2)
  }
})
target = createFrameBuffer(gl, { width: gl.canvas.width / 2, height: gl.canvas.height / 2 })
```

The first call happens inside `createContext`, before anything else exists, hence the `?.`.

## Context attributes

`attributes` is passed to `getContext`. The ones you're most likely to want:

| Attribute | Default | |
|---|---|---|
| `alpha` | `true` | A see-through canvas. Set it to `false` for an opaque one, which is a little faster. |
| `premultipliedAlpha` | `true` | The canvas expects colour multiplied by alpha. Keep this with `alpha`, and write `vec4(rgb * a, a)`. |
| `antialias` | `true` | Smooth edges on geometry. Not needed for full-screen shaders. |
| `depth` | `true` | A depth buffer for the canvas. Set it to `false` if you don't depth test on the canvas. |
| `preserveDrawingBuffer` | `false` | Keep the canvas's contents after it's shown, to read them back with `toDataURL`. |

## Stopping

Pass `signal`, an `AbortSignal`, and aborting it stops the resizing. If `createContext` made the canvas, it removes it as well. See [Cleaning up](/core/cleaning-up).

## See also

- [The frame loop](/core/loop)
- API: [createContext](/api/functions/createContext), [ContextOptions](/api/interfaces/ContextOptions)
