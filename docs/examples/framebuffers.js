import { createContext, createFrameBuffer, createRenderer } from 'wtc-simplegl'

// Draws a spinning shape into a small framebuffer, then draws that
// framebuffer onto the canvas with NEAREST filtering, so it's pixelated.
const vert = /* glsl */ `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const shape = /* glsl */ `#version 300 es
precision highp float;
uniform float u_time;
uniform float u_aspect;
in vec2 v_uv;
out vec4 colour;
void main() {
  vec2 p = (v_uv - 0.5) * vec2(u_aspect, 1.0) * 2.0;
  float a = u_time * 0.6;
  p = mat2(cos(a), sin(a), -sin(a), cos(a)) * p;
  // A rounded square outline
  float d = length(max(abs(p) - 0.45, 0.0)) - 0.1;
  float alpha = smoothstep(0.05, 0.0, abs(d) - 0.06);
  vec3 rgb = mix(vec3(0.29, 0.62, 1.0), vec3(1.0, 0.45, 0.7), v_uv.x);
  colour = vec4(rgb * alpha, alpha);
}`

const show = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_image;
in vec2 v_uv;
out vec4 colour;
void main() {
  colour = texture(u_image, v_uv);
}`

const SCALE = 1 / 8

export default function (container) {
  const ac = new AbortController()
  const canvas = document.createElement('canvas')
  container.appendChild(canvas)
  const gl = createContext({
    canvas,
    signal: ac.signal,
    attributes: { alpha: true, premultipliedAlpha: true }
  })

  const attributes = {
    a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 }
  }
  const draw = createRenderer(gl, { vert, frag: shape, attributes, count: 3 })
  const present = createRenderer(gl, { vert, frag: show, attributes, count: 3 })

  // One target, kept at an eighth of the canvas's size
  const target = createFrameBuffer(gl, {
    width: 1,
    height: 1,
    singular: true,
    minFilter: gl.NEAREST
  })
  const fit = () => {
    const width = Math.max(1, Math.round(gl.canvas.width * SCALE))
    const height = Math.max(1, Math.round(gl.canvas.height * SCALE))
    if (width !== target.width || height !== target.height) target.resize(width, height)
  }

  return {
    frame(time) {
      fit()

      // Into the framebuffer, at its own size
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.read.fb)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      draw.bindVAOs()
      draw.setUniforms({ u_time: time, u_aspect: target.width / target.height })
      draw.render({ width: target.width, height: target.height })

      // Then onto the canvas
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      present.bindVAOs()
      present.setUniforms({ u_image: target.read })
      present.render()
    },
    dispose() {
      ac.abort()
      draw.delete()
      present.delete()
      target.delete()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }
}
