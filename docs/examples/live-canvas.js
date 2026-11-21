import { createContext, createRenderer, createTexture, updateTexture } from 'wtc-simplegl'

// A 2D canvas, redrawn every frame, used as a texture: the same as a video.
// The shader curves it like an old screen and adds scanlines.
const vert = /* glsl */ `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const frag = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_screen;
uniform vec2 u_resolution;
in vec2 v_uv;
out vec4 colour;
void main() {
  // Bulge the picture out from the middle
  vec2 c = v_uv * 2.0 - 1.0;
  c *= 1.0 + dot(c, c) * 0.08;
  vec2 uv = c * 0.5 + 0.5;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  vec4 picture = texture(u_screen, uv);
  float scan = 0.75 + 0.25 * sin(gl_FragCoord.y * 3.14159 * 0.5);
  float vignette = smoothstep(1.6, 0.6, length(c));
  colour = picture * scan * vignette * inside;
}`

export default function (container) {
  const ac = new AbortController()
  const canvas = document.createElement('canvas')
  container.appendChild(canvas)
  const gl = createContext({
    canvas,
    signal: ac.signal,
    attributes: { alpha: true, premultipliedAlpha: true }
  })

  // The 2D canvas we draw on. Any image source works the same way: a video,
  // an ImageBitmap, another WebGL canvas.
  const screen = document.createElement('canvas')
  screen.width = 480
  screen.height = 270
  const ctx = screen.getContext('2d')
  const draw = (time) => {
    ctx.fillStyle = '#10111a'
    ctx.fillRect(0, 0, 480, 270)
    for (let i = 0; i < 6; i++) {
      const x = 240 + Math.sin(time * (0.7 + i * 0.13) + i) * 190
      const y = 135 + Math.cos(time * (0.9 + i * 0.11) + i * 2) * 100
      ctx.fillStyle = i % 2 ? '#4a9eff' : '#ff73b3'
      ctx.beginPath()
      ctx.arc(x, y, 18 + i * 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#eef0f7'
    ctx.font = '600 28px ui-monospace, monospace'
    ctx.fillText(time.toFixed(2).padStart(6, '0'), 20, 250)
  }
  draw(0)
  const texture = createTexture(gl, { img: screen, flipY: true, generateMips: false })

  const tv = createRenderer(gl, {
    vert,
    frag,
    count: 3,
    attributes: {
      a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 }
    }
  })

  return {
    frame(time) {
      draw(time)
      updateTexture(gl, texture, screen, { flipY: true })
      tv.bindVAOs()
      tv.setUniforms({ u_screen: texture, u_resolution: [gl.canvas.width, gl.canvas.height] })
      tv.render()
    },
    dispose() {
      ac.abort()
      tv.delete()
      gl.deleteTexture(texture)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }
}
