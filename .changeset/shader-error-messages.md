---
"wtc-simplegl": patch
---

Clearer errors when setting up a program:

- Shader compile errors name the shader (vertex or fragment) and show the failing source lines with line numbers. If the source doesn't start with `#version 300 es`, the error says so.
- Link errors start with "Program failed to link".
- `createProgram` (and so `createRenderer`) throws a clear error when given a WebGL1 context or missing shader source, instead of failing later with "createVertexArray is not a function" or a GLSL syntax error about `undefined`.
- A compile failure caused by a lost context says so instead of throwing an empty error.
