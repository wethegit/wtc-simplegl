# Pointer, time and resolution

Get the pointer, the time and the canvas's size into a shader, in the units the shader works in. {.lead}

Most effects start from the same three uniforms. The catch is units: pointer events give CSS pixels from the top left, while `gl_FragCoord` is in device pixels from the bottom left. Convert once, in JavaScript, and the shader can compare them directly.

<Example src="pointer-uniforms" :height="360" />

<<< @/examples/pointer-uniforms.js

## The pointer

```js
const toDevice = (e) => {
  const rect = canvas.getBoundingClientRect()
  const scale = gl.canvas.width / rect.width
  return [(e.clientX - rect.left) * scale, (rect.bottom - e.clientY) * scale]
}
```

`scale` is the canvas's pixel ratio, worked out from the canvas rather than `devicePixelRatio`, so it's right whatever `dpr` the context uses. Measuring from `rect.bottom` flips y.

In the shader, the pointer and `gl_FragCoord.xy` are then the same kind of thing:

```glsl
float d = length(gl_FragCoord.xy - u_pointer) / u_resolution.y;
```

Dividing by the height makes distances a fraction of the canvas, so the effect looks the same at any size.

For coordinates from 0 to 1 instead, divide by the rect's size and skip `scale`, as the [image effect](/cookbook/image-effect) does.

## Easing

Following the pointer exactly looks mechanical. Ease towards it instead, by the same fraction per second at any frame rate:

```js
const ease = 1 - Math.pow(0.001, delta)
pointer[0] += (target[0] - pointer[0]) * ease
pointer[1] += (target[1] - pointer[1]) * ease
```

The smaller the number, the faster it catches up.

## Listening

Pointer events, rather than mouse events, cover mouse, pen and touch. Add them with the effect's `signal`, so they're removed with everything else. On touch screens, `touch-action: none` on the canvas stops dragging from scrolling the page.

## Time and resolution

`time` from `loop` (or `<Example>`) is in seconds. `[gl.canvas.width, gl.canvas.height]` is the resolution in device pixels, which matches `gl_FragCoord`. Set both every frame; the size changes when the canvas resizes.

## See also

- [Uniforms](/core/uniforms)
- [The frame loop](/core/loop)
