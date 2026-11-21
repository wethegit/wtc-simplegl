# Transform feedback (wtc-simplegl 1.1)

Docs: `/core/transform-feedback`. A complete page is in `../examples/particles.html`.

Transform feedback runs a simulation in the vertex shader. Each vertex, usually a particle, reads its state from attributes and writes its next state to `out` variables. Those outputs are captured into buffers, and next frame they're the inputs. Nothing goes back to JavaScript.

**Use it when** each item only needs its own state, as with particles, flocks that ignore their neighbours, or trails. **Use float framebuffers instead** (a ping-pong `createFrameBuffer` of `gl.HALF_FLOAT`, one texel per item) when items need to read each other: neighbour searches, cellular automata, fluids.

## The simulation renderer

```js
const COUNT = 10000;
const simulation = createRenderer(gl, {
  vert: simulate,           // reads a_position/a_velocity, writes v_position/v_velocity
  frag: nothing,            // required even though nothing is drawn
  mode: gl.POINTS,          // must be POINTS, LINES or TRIANGLES (it throws otherwise)
  count: COUNT,
  attributes: {
    a_position: { data: positions, size: 2, component: "transformFeedback", varying: "v_position", usage: gl.DYNAMIC_COPY },
    a_velocity: { data: velocities, size: 2, component: "transformFeedback", varying: "v_velocity", usage: gl.DYNAMIC_COPY },
    a_seed:     { data: seeds, size: 1 },   // a plain input: shared, never written
  },
});
```

```glsl
#version 300 es
in vec2 a_position;
in vec2 a_velocity;
in float a_seed;
out vec2 v_position;   // names must match each attribute's `varying`
out vec2 v_velocity;
uniform float u_delta;
void main() {
  v_velocity = a_velocity * pow(0.5, u_delta);
  v_position = a_position + v_velocity * u_delta;
  gl_Position = vec4(0.0);        // unused while RASTERIZER_DISCARD is on
}
```

```glsl
#version 300 es
precision highp float;
out vec4 colour;
void main() { colour = vec4(0.0); }
```

- Every transform feedback attribute **needs `data`**, which sets the initial state. Two buffers are made from it, and they ping-pong.
- Each `varying` must be an `out` that the vertex shader writes, with the same type as its attribute. Outputs are captured in separate buffers (`SEPARATE_ATTRIBS`), so their order doesn't matter.
- A `varying` the vertex shader doesn't declare as an `out` makes linking fail, with a message about transform feedback varyings. Check the spelling first.
- Use `usage: gl.DYNAMIC_COPY` for the outputs.

## Stepping

One `bindVAOs()` + `render()` is one step. `bindVAOs()` reads the latest buffers and selects the other set to write into.

```js
gl.enable(gl.RASTERIZER_DISCARD);    // simulate without drawing
simulation.bindVAOs();
simulation.setUniforms({ u_delta: Math.min(delta, 1 / 30), u_frame: frame });
simulation.render();
gl.disable(gl.RASTERIZER_DISCARD);   // turn it back off, or nothing else draws
```

- For several steps per frame, repeat the three calls.
- For a fixed timestep, accumulate `delta` and step while there's time left over, capped at a few steps.

## Drawing the result with a second renderer

```js
const particles = createRenderer(gl, {
  vert, frag,
  mode: gl.POINTS,
  count: COUNT,
  attributes: {
    a_position: { from: simulation, size: 2 },                         // reads the output of the same name
    a_speed:    { from: simulation, output: "a_velocity", size: 2 },   // or a differently named one
  },
});

// each frame, after stepping
gl.clearColor(0, 0, 0, 0);
gl.clear(gl.COLOR_BUFFER_BIT);
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   // premultiplied
particles.bindVAOs();                            // re-points `from` attributes at the latest output
particles.setUniforms({ u_aspect: gl.canvas.width / gl.canvas.height });
particles.render();
gl.disable(gl.BLEND);
```

- The `from` renderer has to exist first, and `size` and `type` must match the output.
- It throws if the named output doesn't exist.
- Points: set `gl_PointSize` in the vertex shader, and shape them with `gl_PointCoord` in the fragment shader. The largest size varies by device (`gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)`). For big sprites, draw instanced quads instead.

## Reading the output

`simulation.outputs` holds `{ a_position: WebGLBuffer, … }`, the buffers with the latest output.

```js
const values = new Float32Array(COUNT * 2);
gl.bindBuffer(gl.ARRAY_BUFFER, simulation.outputs.a_position);
gl.getBufferSubData(gl.ARRAY_BUFFER, 0, values);   // stalls until the GPU is done; avoid per frame
gl.bindBuffer(gl.ARRAY_BUFFER, null);
```

## Randomness and respawning

There's no random function in GLSL. Hash `gl_VertexID` with a per-frame uniform:

```glsl
uniform float u_frame;
float hash(float n) { return fract(sin(n) * 43758.5453); }
// …
float r = hash(float(gl_VertexID) * 12.9898 + u_frame * 78.233);
```

For lifetimes, carry `life` in a transform feedback attribute, count it down, and reset position, velocity and life when it reaches 0. A particle that is "dead" can be hidden in the draw shader with `gl_PointSize = 0.0`.

## Pitfalls

- Forgetting `gl.disable(gl.RASTERIZER_DISCARD)`: everything after it draws nothing, silently.
- Changing `count` means making the renderer again. The buffers have a fixed size.
- `delete()` frees both buffer sets and the transform feedback objects. Delete the drawing renderer too. It doesn't own the simulation's buffers, so either order is fine.
