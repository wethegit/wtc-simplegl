# Blur resolve

Text that comes into focus letter by letter, shedding particles as it sharpens, and blurs again where the pointer passes. {.lead}

This is the largest recipe, and uses most of the library: textures from a canvas and from data, single and ping-pong framebuffers at several sizes, eight samplers in one shader, and particles simulated with transform feedback and drawn by a second renderer. Move the pointer through the text to blow it apart; click to play the intro again.

<Example src="blur-resolve" :height="420" />

The effect is split into modules, in `examples/blur-resolve/`. The page's example only sets the options, and the colour of the text and particles for the current theme:

<<< @/examples/blur-resolve.js

## How it fits together

Each frame has four parts:

1. **The field** (`field.js`). The pointer's path this frame is splatted into a quarter-size ping-pong framebuffer: how blurred each spot should be, which way to push it, and how recently the pointer passed. It fades a little every frame, which is what lets the text resolve again.
2. **The composite** (`shaders/screen.js`). One full-screen pass draws the text. For each pixel it works out how blurred it should be, from the intro's progress and the field, and reads the right amount of blur from the pyramid.
3. **The simulation** (`particles.js`). Transform feedback steps every particle: live ones drift and flutter, and dead ones try a random point on the letters and spawn if that letter is resolving.
4. **The particles**, drawn as point sprites by a second renderer that reads the simulation's output.

The blur pyramid itself is only built when the text or the canvas size changes.

::: code-group

<<< @/examples/blur-resolve/blurResolve.js [blurResolve.js]

<<< @/examples/blur-resolve/blur.js [blur.js]

<<< @/examples/blur-resolve/field.js [field.js]

<<< @/examples/blur-resolve/particles.js [particles.js]

<<< @/examples/blur-resolve/text.js [text.js]

:::

## A blur pyramid

Blurring a large texture by a lot, every frame, is expensive. Instead, `blur.js` makes a pyramid once: level 0 is the text, and each level after it is half the size and about twice as blurred, made by a horizontal pass that also halves the resolution, then a vertical pass.

```js
const makeTarget = (width, height) =>
  createFrameBuffer(gl, { width, height, type: gl.HALF_FLOAT, singular: true })
```

The composite then picks a level per pixel, and blends between the two nearest, so any amount of blur costs two texture reads. The levels are eight samplers in one shader; each gets its own texture unit, so they're passed straight to `setUniforms`:

```js
...Object.fromEntries(composite.levels.map((tex, i) => [`u_l${i}`, tex]))
```

## The reveal

The intro is a front moving across the text. `reveal(x)` in `shaders/common.js` gives how blurred a point is, from 1 ahead of the front to 0 behind it. The same function is used by the composite and the particle spawner, so particles leave exactly where the letters are sharpening:

```glsl
float reveal(float x) {
  return smoothstep(u_front, u_front + u_spread, x);
}
```

## Particles from the letters

`text.js` draws the text on a 2D canvas, then collects points inside the letters into a float data texture, two floats per point:

```js
const glyphTexture = createTexture(gl, {
  data: new Float32Array(GLYPH_TEXTURE_WIDTH * 2),
  width: GLYPH_TEXTURE_WIDTH,
  height: 1,
  format: gl.RG,
  type: gl.FLOAT
})
```

Every particle starts dead. Each frame, a dead particle picks a random point from the texture with `texelFetch`, and spawns there with a chance set by how fast that letter is resolving. It sets off in a random direction with a little lift, then slows, drifts upwards and flutters in curl noise until its life runs out.

The simulation and the sprites are separate renderers. The sprites read the simulation's latest output with `from`:

```js
attributes: {
  a_position: { from: simulation, size: 2 },
  a_velocity: { from: simulation, size: 2 },
  a_properties: { from: simulation, size: 4 }
}
```

::: code-group

<<< @/examples/blur-resolve/shaders/screen.js [shaders/screen.js]

<<< @/examples/blur-resolve/shaders/particles.js [shaders/particles.js]

<<< @/examples/blur-resolve/shaders/common.js [shaders/common.js]

:::

## Cleaning up

`createBlurResolve` keeps every listener on one `AbortController`, and `destroy()` aborts it and deletes every renderer, framebuffer and texture it made. That makes it safe to create and destroy repeatedly, as this page does when you scroll away and back, and as a React component would. See [A React component](/cookbook/react#larger-effects).

## See also

- [Framebuffers](/core/framebuffers), [Transform feedback](/core/transform-feedback) and [Textures](/core/textures)
- [Feedback with ping-pong buffers](/cookbook/ping-pong), the field's technique on its own
