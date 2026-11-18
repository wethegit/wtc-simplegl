---
title: Introduction
---

# Introduction

wtc-simplegl is a small WebGL2 helper library. It takes care of the boilerplate around your shaders and otherwise stays out of the way. {.lead}

You write the GLSL, and make plain `gl` calls wherever you want to. wtc-simplegl handles the parts that are the same every time: compiling and linking programs, setting up vertex arrays, setting uniforms by their type, binding textures to units, keeping the canvas sized to the page, and freeing everything when you're done.

The whole library is one file, so it also works where you can't install packages. Copy `simplegl.js` into the project and import from it.

## What's in it

- **Setup.** `createContext` makes a WebGL2 context and keeps the canvas's pixel size in step with its CSS size and the device pixel ratio. `loop` calls a function every frame with the time and the time since the last frame.
- **Drawing.** `createRenderer` turns a vertex shader, a fragment shader and some attributes into something you can draw, with `setUniforms` that takes numbers, arrays, typed arrays and textures alike.
- **Textures.** `createTexture` from images, canvases, video or typed arrays; `loadTexture` from a URL; `updateTexture` for video frames and redrawn canvases.
- **Framebuffers.** `createFrameBuffer` for drawing into a texture: single targets, ping-pong pairs, float targets and depth.
- **Transform feedback.** Simulate on the GPU by marking attributes as outputs of the vertex shader, and draw the results with another renderer.
- **The pieces underneath.** `compileShader`, `createProgram`, `createBuffer` and the rest, for when you want more control.

## When to use it

wtc-simplegl suits full-screen shaders, image effects, generative graphics and GPU particles: work where you're writing the shaders yourself and want less code around them. It doesn't have a scene graph, cameras, geometry or lighting. For those, use [wtc-gl](https://wethegit.github.io/wtc-gl/docs/), which is built on the same ideas, or [three.js](https://threejs.org).

## A first look

```js
import { createContext, createRenderer, loop } from 'wtc-simplegl'

const gl = createContext() // a canvas that fills the window

const quad = createRenderer(gl, {
  vert: `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0, 1); }`,
  frag: `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 colour;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  colour = vec4(uv, 0.5 + 0.5 * sin(u_time), 1);
}`,
  attributes: {
    // One triangle that covers the screen
    a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 }
  },
  count: 3
})

loop((time) => {
  quad.bindVAOs()
  quad.setUniforms({ u_resolution: [gl.canvas.width, gl.canvas.height], u_time: time })
  quad.render()
})
```

Start with [installation](/getting-started/installation), then [your first shader](/getting-started/first-shader).
