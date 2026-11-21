# Shaders and programs

Compile shaders and link programs yourself, and read the errors when they don't. {.lead}

`createRenderer` is made of smaller functions, which are exported for when you want a program without its vertex array, or to control the order things happen in.

## Making a program

```js
import { createProgram, linkProgram, getActiveUniforms } from 'wtc-simplegl'

const program = createProgram(gl, vert, frag)
// Bind attribute locations here, before linking, if you need to
gl.bindAttribLocation(program, 0, 'a_position')
linkProgram(gl, program)

const uniforms = getActiveUniforms(gl, program)
gl.useProgram(program)
gl.uniform1f(uniforms.u_time.location, 0)
```

- `compileShader(gl, source, type)` compiles one shader.
- `createProgram(gl, vert, frag, attributes?)` compiles both and attaches them to a new program, unlinked, so attribute locations can still be bound. Given attributes with transform feedback outputs, it also tells the program which `varying`s to capture.
- `linkProgram(gl, program)` links it, and frees the shaders once they're linked.
- `getActiveUniforms(gl, program)` returns each active uniform's `location`, `type` and `size`, by name, with arrays under their plain name too.

## Errors

When a shader doesn't compile, the error names which shader failed, and shows the compiler's log with the source lines it points at:

```
Fragment shader failed to compile:
ERROR: 0:5: 'nope' : undeclared identifier

    3 | out vec4 o;
    4 | void main(){
>   5 |   o = vec4(nope);
    6 | }
```

If the source doesn't start with `#version 300 es`, the error says so: without it the shader is compiled as the older GLSL ES 1.00, and `in`, `out` and `texture()` don't exist.

When a program doesn't link, usually because the vertex shader's outputs don't match the fragment shader's inputs, the error starts with "Program failed to link" and has the log. The failed shader or program is deleted before the error is thrown.

`createProgram` also throws straight away if it's given a WebGL1 context or missing source, rather than failing later with a less helpful error.

## See also

- [Buffers and vertex arrays](/lower-level/buffers-and-vertex-arrays)
- API: [compileShader](/api/functions/compileShader), [createProgram](/api/functions/createProgram), [linkProgram](/api/functions/linkProgram), [getActiveUniforms](/api/functions/getActiveUniforms)
