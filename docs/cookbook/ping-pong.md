# Feedback with ping-pong buffers

Draw each frame on top of the last one, for trails, smears and simple simulations that build up over time. {.lead}

A feedback effect reads the frame it drew last time, changes it a little, and draws something new on top. A shader can't read a texture while drawing into it, so it needs two framebuffers: read from one, draw into the other, then swap them for the next frame. `createFrameBuffer` makes the pair, as `read` and `write`, and `swap()` trades them.

Here a dot moves across the canvas. Every frame turns the last frame slightly about the centre, fades it, and paints the dot over it, so the dot leaves a curling trail.

<Example src="ping-pong" :height="360" />

<<< @/examples/ping-pong.js

## The two passes

Each frame has two draws, both full-screen triangles:

1. **Step**, into the framebuffer. It reads the previous frame, `feedback.read`, and writes the next one into `feedback.write`.
2. **Show**, onto the canvas. Without it you'd never see the framebuffer's contents.

```js
gl.bindFramebuffer(gl.FRAMEBUFFER, feedback.write.fb)
stepper.bindVAOs()
stepper.setUniforms({ u_previous: feedback.read })
stepper.render({ width: feedback.width, height: feedback.height })
gl.bindFramebuffer(gl.FRAMEBUFFER, null)
feedback.swap()

shower.bindVAOs()
shower.setUniforms({ u_result: feedback.read })
shower.render()
```

After `swap()`, `read` holds the frame just drawn, which is why both uniforms are set from `read`. Set them every frame: the two targets trade places on every swap.

## The step shader

The effect lives in how the last frame is read. This one turns, shrinks and fades it, then mixes in the dot:

```glsl
vec2 p = (v_uv - 0.5) * vec2(u_aspect, 1.0);
p = mat2(cos(a), sin(a), -sin(a), cos(a)) * p * 0.997;
vec4 last = texture(u_previous, p / vec2(u_aspect, 1.0) + 0.5) * u_fade;
```

The turn is done in square units, so it stays round on a wide canvas. Offset the coordinates to make it drift, sample through noise to make it smoke, or blur it to make it spread.

## Fading properly

- **Use float targets.** With 8-bit textures, a fade that multiplies by 0.97 never reaches zero: 10/255 × 0.97 rounds back to 10/255, so faint ghosts stay for good. `type: gl.HALF_FLOAT` fades smoothly to nothing.
- **Fade per second, not per frame.** A 120 Hz screen draws twice as many frames as a 60 Hz one. `Math.pow(0.15, delta)` keeps 15% after a second at any frame rate.

## Sizing

The example keeps the framebuffers the size of the canvas, checking before each frame. `resize` makes new, empty targets, so the trail starts again. Feedback effects are often soft, so half the canvas's size costs a quarter of the pixels and is hard to tell apart.

## See also

- [Framebuffers](/core/framebuffers)
- API: [createFrameBuffer](/api/functions/createFrameBuffer), [FrameBuffer](/api/interfaces/FrameBuffer)
