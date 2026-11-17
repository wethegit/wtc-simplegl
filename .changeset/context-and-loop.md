---
"wtc-simplegl": minor
---

Add `createContext` and `loop` to cut setup boilerplate.

- `createContext(options)` returns a WebGL2 context and keeps the canvas's pixel size matched to its CSS size and the device pixel ratio (capped at 2 by default, and updated on zoom or when moving to another display). With no options it creates a canvas that fills the window. Options: `canvas`, `container`, `dpr`, `autoResize`, `onResize(width, height, gl)`, `attributes` and `signal`.
- `loop(fn)` calls `fn(time, delta, frame)` every animation frame, in seconds, and returns `{ start, stop, running }`. Time spent stopped isn't counted, so animations resume where they left off.

```js
const gl = createContext();
loop((time) => {
  /* draw */
});
```
