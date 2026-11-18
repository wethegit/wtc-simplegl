# The frame loop

Call a function every frame, with the time and the time since the last frame, and stop and start it. {.lead}

`loop` wraps `requestAnimationFrame`. It calls your function with `time`, the seconds the loop has run; `delta`, the seconds since the last frame; and `frame`, a count of frames:

```js
import { loop } from 'wtc-simplegl'

const animation = loop((time, delta, frame) => {
  quad.bindVAOs()
  quad.setUniforms({ u_time: time })
  quad.render()
})
```

## Stopping and starting

The loop starts straight away, unless you pass `autoStart: false`. It returns controls:

```js
animation.stop()
animation.start()
animation.running // true or false
```

`time` doesn't advance while the loop is stopped, so an animation carries on from where it was rather than jumping. The first frame after starting has a `delta` of 0.

A common use is pausing while the canvas is off screen:

```js
new IntersectionObserver(([entry]) => {
  entry.isIntersecting ? animation.start() : animation.stop()
}).observe(gl.canvas)
```

## Frame rate

Frames come as fast as the screen refreshes: 60 a second on most screens, but 120 or more on some. Anything that changes per frame, such as a fade or a simulation step, should be scaled by `delta`, so it runs at the same speed everywhere:

```js
// Keeps 15% of the old value after a second, whatever the frame rate
const fade = Math.pow(0.15, delta)
```

`delta` can be large after the tab has been in the background. Cap it for simulations that would jump: `Math.min(delta, 1 / 30)`.

## Stopping for good

Pass `signal`, and aborting it stops the loop so it can't be started again:

```js
const controller = new AbortController()
loop(draw, { signal: controller.signal })
// later
controller.abort()
```

## See also

- [Cleaning up](/core/cleaning-up)
- API: [loop](/api/functions/loop), [LoopOptions](/api/interfaces/LoopOptions), [Loop](/api/interfaces/Loop)
