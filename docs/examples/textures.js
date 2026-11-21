import { createContext, createRenderer, createTexture, updateTexture } from 'wtc-simplegl'

// Two textures in one shader: a checkerboard made from a typed array, and a
// canvas with a counter drawn on it, re-uploaded every second. Each sampler
// gets its own texture unit, so they're passed straight to setUniforms.
const vert = /* glsl */ `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const frag = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_checker;
uniform sampler2D u_label;
uniform float u_aspect;
in vec2 v_uv;
out vec4 colour;
void main() {
  vec2 p = v_uv * vec2(u_aspect, 1.0);
  vec4 checker = texture(u_checker, p * 2.0) * 0.35;
  // The label sits in the middle, at its own aspect ratio
  vec2 q = (v_uv - 0.5) * vec2(u_aspect, 1.0) * vec2(0.5, 1.0) + 0.5;
  vec4 label = all(greaterThan(q, vec2(0.0))) && all(lessThan(q, vec2(1.0))) ? texture(u_label, q) : vec4(0.0);
  colour = label + checker * (1.0 - label.a);
}`

export default function (container) {
  const ac = new AbortController()
  const canvas = document.createElement('canvas')
  container.appendChild(canvas)
  const gl = createContext({
    canvas,
    signal: ac.signal,
    attributes: { alpha: true, premultipliedAlpha: true, antialias: true }
  })

  // 2 × 2 texels, premultiplied blue and see-through, repeated
  const checker = createTexture(gl, {
    data: new Uint8Array([74, 158, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 74, 158, 255, 255]),
    width: 2,
    height: 2,
    minFilter: gl.NEAREST,
    magFilter: gl.NEAREST,
    wrapS: gl.REPEAT,
    wrapT: gl.REPEAT
  })

  // A 2D canvas to draw text on. flipY puts its top row at the top.
  const label = document.createElement('canvas')
  label.width = 512
  label.height = 256
  const ctx = label.getContext('2d')
  const draw = (n) => {
    ctx.clearRect(0, 0, 512, 256)
    ctx.fillStyle = '#ff73b3'
    ctx.font = '600 120px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(n), 256, 128)
  }
  draw(0)
  const text = createTexture(gl, { img: label, flipY: true, generateMips: false })

  const quad = createRenderer(gl, {
    vert,
    frag,
    count: 3,
    attributes: {
      a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 }
    }
  })

  let shown = 0
  return {
    frame(time) {
      const seconds = Math.floor(time)
      if (seconds !== shown) {
        shown = seconds
        draw(seconds)
        updateTexture(gl, text, label, { flipY: true })
      }
      quad.bindVAOs()
      quad.setUniforms({
        u_checker: checker,
        u_label: text,
        u_aspect: gl.canvas.width / gl.canvas.height
      })
      quad.render()
    },
    dispose() {
      ac.abort()
      quad.delete()
      gl.deleteTexture(checker)
      gl.deleteTexture(text)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }
}
