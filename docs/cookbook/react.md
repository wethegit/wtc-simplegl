# A React component

Wrap an effect in a component that sets it up on mount and frees everything on unmount, including under StrictMode. {.lead}

Every example in these docs has the same shape: a function that takes an element, sets up an effect in it, and returns `frame` and `dispose`. That maps straight onto React: set up in an effect, draw in a loop, and dispose in the cleanup.

## The component

```jsx
import { useEffect, useRef } from 'react'
import { createContext, createRenderer, loop } from 'wtc-simplegl'

const vert = /* glsl */ `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`

export function Shader({ frag, uniforms }) {
  const canvas = useRef(null)
  // Read the latest uniforms each frame without restarting the effect
  const latest = useRef(uniforms)
  latest.current = uniforms

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const gl = createContext({ canvas: canvas.current, signal })
    const quad = createRenderer(gl, {
      vert,
      frag,
      attributes: { a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 } },
      count: 3
    })

    loop(
      (time) => {
        quad.bindVAOs()
        quad.setUniforms({
          u_time: time,
          u_resolution: [gl.canvas.width, gl.canvas.height],
          ...latest.current
        })
        quad.render()
      },
      { signal }
    )

    return () => {
      controller.abort()
      quad.delete()
    }
  }, [frag])

  return <canvas ref={canvas} style={{ display: 'block', width: '100%', height: '100%' }} />
}
```

```jsx
<Shader frag={plasma} uniforms={{ u_colour: [0.29, 0.62, 1] }} />
```

## Why it's written this way

- **The canvas is yours.** Passing `canvas` means `createContext` sizes it but never removes it, and React owns it in the DOM.
- **One `AbortController`.** Aborting it stops the resizing and the loop, and removes any listeners added with the same `signal`. `delete()` frees the GPU side.
- **StrictMode.** In development, React runs each effect, cleans it up and runs it again straight away. The second run calls `getContext` on the same canvas, which hands back the same context, so everything is made again on it. Don't lose the context in the cleanup, or the second run gets a dead one.
- **Uniforms through a ref.** Props that change often, such as a colour from a slider, shouldn't restart the effect. Keep them in a ref that the loop reads. Restart only for what needs rebuilding: here, a new fragment shader.
- **No per-frame state.** Nothing calls `setState` in the loop. Re-rendering React sixty times a second would cost far more than the drawing.

## Larger effects

For something with more moving parts, write the effect as a plain module, as the [Blur resolve](/cookbook/blur-resolve) recipe does, with a function that takes a canvas and returns `frame` and `destroy`. The component then only connects it:

```jsx
useEffect(() => {
  const effect = createBlurResolve({ canvas: canvas.current, params, font })
  const animation = loop((time, delta) => effect.frame(time, delta))
  return () => {
    animation.stop()
    effect.destroy()
  }
}, [])
```

Keeping the WebGL out of the component also makes it usable outside React: the docs' examples, a CodePen, or a plain page.

## Pausing off screen

Effects below the fold don't need to draw. Stop the loop while the canvas is out of view:

```js
const animation = loop(draw, { signal })
const observer = new IntersectionObserver(([entry]) =>
  entry.isIntersecting ? animation.start() : animation.stop()
)
observer.observe(canvas.current)
signal.addEventListener('abort', () => observer.disconnect())
```

## See also

- [Cleaning up](/core/cleaning-up)
- [The frame loop](/core/loop)
