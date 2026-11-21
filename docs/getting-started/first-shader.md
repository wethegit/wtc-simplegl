# Your first shader

Fill a canvas with a fragment shader that animates over time. {.lead}

Most effects start the same way: a context for the canvas, a renderer with your shaders and a triangle that covers the screen, and a uniform or two set every frame.

<Example src="first-shader" :height="360" />

<<< @/examples/first-shader.js

## The context

`createContext` makes a WebGL2 context for a canvas and keeps the canvas's drawing buffer the same size as it is on the page, in device pixels. Size the canvas with CSS, and `gl.canvas.width` and `gl.canvas.height` follow:

```js
const gl = createContext({ canvas: document.querySelector('canvas') })
```

With no `canvas`, it makes one that fills the window. [Context and canvas](/core/context) has the options.

## The renderer

`createRenderer` compiles the two shaders, links them into a program and sets up the attributes. Here there's one attribute, `a_position`, with three 2D points: a triangle twice the size of the screen, so it covers it with nothing wasted on a second triangle.

```js
const quad = createRenderer(gl, {
  vert,
  frag,
  attributes: {
    a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 }
  },
  count: 3
})
```

Each attribute's name matches an `in` in the vertex shader. `size` is the number of components per vertex, and `count` is the number of vertices to draw.

## Drawing a frame

Three calls draw it:

```js
quad.bindVAOs() // use the program and its vertex array
quad.setUniforms({ u_resolution: [gl.canvas.width, gl.canvas.height], u_time: time })
quad.render() // set the viewport to the canvas and draw
```

`setUniforms` looks each uniform up by name and calls the right `gl.uniform*` for its type, so a `vec2` takes an array of two numbers and a `float` takes a number. Names the shader doesn't use are skipped.

Outside the docs, call this every frame with `loop`:

```js
import { loop } from 'wtc-simplegl'

loop((time) => {
  quad.bindVAOs()
  quad.setUniforms({ u_resolution: [gl.canvas.width, gl.canvas.height], u_time: time })
  quad.render()
})
```

## The fragment shader

The shader works out where each pixel is from `gl_FragCoord`, in device pixels, and `u_resolution`. Dividing by the height keeps circles round on a wide canvas:

```glsl
vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y * 2.0;
```

This canvas is see-through, so the shader writes premultiplied colour: the RGB multiplied by the alpha. On an opaque canvas, write any colour with an alpha of 1.

## Where to go from here

- [Renderers and attributes](/core/renderers), for geometry of your own
- [Uniforms](/core/uniforms), for every type a uniform can be
- [Textures](/core/textures), to bring images in
