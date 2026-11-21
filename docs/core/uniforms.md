# Uniforms

Set a shader's uniforms by name, with numbers, arrays, typed arrays or textures, whatever their GLSL type. {.lead}

When a renderer is made, it asks the program for its active uniforms and their types. `setUniforms` then calls the right `gl.uniform*` for each: `uniform1f` for a `float`, `uniform3fv` for a `vec3`, `uniformMatrix4fv` for a `mat4`, and so on. You don't look up locations or pick functions.

<Example src="uniforms" :height="320" />

<<< @/examples/uniforms.js

## Setting them

```js
renderer.setUniforms({
  u_time: time,
  u_resolution: [gl.canvas.width, gl.canvas.height],
  u_colour: [0.29, 0.62, 1],
  u_matrix: new Float32Array(16)
})
```

`setUniforms` is `bindUniform` for several at once; `renderer.bindUniform('u_time', time)` sets one. A uniform keeps its value until it's set again, so set constants once and only what changes each frame.

Names the shader doesn't use are skipped without an error. GLSL compilers remove uniforms that don't affect the output, so a uniform you've declared but not used yet isn't there to set. It also means one object of shared values can go to every renderer, and each takes what it needs:

```js
const shared = { u_time: time, u_resolution: [gl.canvas.width, gl.canvas.height] }
background.setUniforms(shared)
particles.setUniforms({ ...shared, u_size: 3 })
```

`null` and `undefined` values are skipped too.

## Types

| GLSL | Value |
|---|---|
| `float`, `int`, `uint`, `bool` | A number (or `true`/`false` for `bool`). |
| `vec2`–`vec4`, `ivec*`, `uvec*`, `bvec*` | An array or typed array of 2–4 numbers. |
| `mat2`–`mat4`, `mat2x3` and the other non-square matrices | An array or `Float32Array`, column by column. |
| An array, such as `vec3 u_palette[3]` | One flat array or typed array with every element in order. |
| `sampler2D` and the other samplers | A texture or framebuffer target. See [Textures](/core/textures#in-a-shader). |

Arrays can be set by their plain name: WebGL reports `vec3 u_palette[3]` as `u_palette[0]`, and wtc-simplegl answers to both.

Matrices aren't transposed, so they're in column-major order, as GLSL and most matrix libraries expect.

## Which program

Uniforms belong to a program, and WebGL sets them on whichever program is current. `bindUniform` makes its renderer's program current first if it isn't, so you can set uniforms on any renderer at any time, in any order.

## Uniform blocks

Uniforms in a uniform block (`uniform Settings { ... }`) aren't in `renderer.uniforms` and can't be set this way: they come from a buffer. Bind one with `gl.uniformBlockBinding` and `gl.bindBufferBase(gl.UNIFORM_BUFFER, ...)`, using `renderer.program`.

## Reading what's there

`renderer.uniforms` holds every active uniform, by name, with its `location`, `type` and `size`:

```js
console.log(Object.keys(renderer.uniforms)) // which uniforms survived compilation
```

## See also

- [Textures](/core/textures)
- [Pointer, time and resolution](/cookbook/pointer-uniforms), for the uniforms most effects use
- API: [Renderer](/api/interfaces/Renderer), [ActiveUniform](/api/interfaces/ActiveUniform)
