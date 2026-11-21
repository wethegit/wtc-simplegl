# Transform feedback

Run a simulation on the GPU: the vertex shader writes each vertex's new state into buffers the next frame reads. {.lead}

Particles are the usual case. Each particle's position and velocity are attributes; the vertex shader works out where it goes next and writes the result out. Next frame, those outputs are the inputs. Nothing is read back to JavaScript, so it's fast for tens of thousands of particles.

<Example src="transform-feedback" :height="360" />

<<< @/examples/transform-feedback.js

## The simulation

Mark each attribute the shader updates with `component: "transformFeedback"`, and name the vertex shader output that updates it as `varying`:

```js
const simulation = createRenderer(gl, {
  vert: simulate,
  frag: nothing,
  mode: gl.POINTS,
  count,
  attributes: {
    a_position: {
      data: positions,
      size: 2,
      component: "transformFeedback",
      varying: "v_position",
      usage: gl.DYNAMIC_COPY,
    },
    a_velocity: {
      data: velocities,
      size: 2,
      component: "transformFeedback",
      varying: "v_velocity",
      usage: gl.DYNAMIC_COPY,
    },
  },
});
```

```glsl
in vec2 a_position;
in vec2 a_velocity;
out vec2 v_position;
out vec2 v_velocity;
```

Every transform feedback attribute gets two buffers from its `data`. Each frame reads one set and writes the other, and they swap, so `bindVAOs()` then `render()` is one step. Attributes that aren't outputs share a single buffer.

`mode` must be `gl.POINTS`, `gl.LINES` or `gl.TRIANGLES`, which are the only modes WebGL2 can capture. A program needs a fragment shader even if it draws nothing.

## Stepping without drawing

Turn the rasteriser off while stepping, so the simulation's points aren't drawn:

```js
gl.enable(gl.RASTERIZER_DISCARD);
simulation.bindVAOs();
simulation.setUniforms({ u_delta: delta });
simulation.render();
gl.disable(gl.RASTERIZER_DISCARD);
```

Or leave it on, and give the simulation a fragment shader that draws the particles too. Separate programs keep each shader simpler.

## Drawing the results

A second renderer can read the simulation's output with `from`. Each attribute reads the output of the same name, and follows it as the buffers swap:

```js
const particles = createRenderer(gl, {
  vert,
  frag,
  mode: gl.POINTS,
  count,
  attributes: {
    a_position: { from: simulation, size: 2 },
    a_velocity: { from: simulation, size: 2 },
  },
});
```

Use `output` when the names differ: `a_centre: { from: simulation, output: 'a_position', size: 2 }`.

## Reading the output

`simulation.outputs` holds the buffers with the latest output, by attribute name. To read one back in JavaScript, which is slow and worth avoiding every frame:

```js
const values = new Float32Array(count * 2);
gl.bindBuffer(gl.ARRAY_BUFFER, simulation.outputs.a_position);
gl.getBufferSubData(gl.ARRAY_BUFFER, 0, values);
gl.bindBuffer(gl.ARRAY_BUFFER, null);
```

## Randomness

The vertex shader can't call a random number generator, but it has `gl_VertexID`, the index of the vertex. Hash it with the frame number for a different value per particle per frame:

```glsl
float random = fract(sin(float(gl_VertexID) * 12.9898 + u_frame * 78.233) * 43758.5453);
```

## See also

- [Renderers and attributes](/core/renderers)
- API: [Attribute](/api/interfaces/Attribute), [Renderer](/api/interfaces/Renderer)
