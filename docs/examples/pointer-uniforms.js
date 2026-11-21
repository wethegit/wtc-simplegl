import { createContext, createRenderer } from 'wtc-simplegl'

// The pointer, time and resolution as uniforms, all in device pixels with y
// up, the same as gl_FragCoord. The pointer is eased towards where it is, and
// wanders on its own when it's off the canvas.
const vert = /* glsl */ `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const frag = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;
out vec4 colour;
void main() {
  // Distance from the pointer, as a fraction of the canvas height
  float d = length(gl_FragCoord.xy - u_pointer) / u_resolution.y;
  float rings = 0.5 + 0.5 * sin(d * 60.0 - u_time * 4.0);
  float alpha = smoothstep(0.4, 0.9, rings) * smoothstep(0.45, 0.0, d);
  vec3 rgb = mix(vec3(1.0, 0.45, 0.7), vec3(0.29, 0.62, 1.0), smoothstep(0.0, 0.4, d));
  colour = vec4(rgb * alpha, alpha);
}`

export default function (container) {
  const ac = new AbortController()
  const { signal } = ac
  const canvas = document.createElement('canvas')
  container.appendChild(canvas)
  const gl = createContext({
    canvas,
    signal,
    attributes: { alpha: true, premultipliedAlpha: true, antialias: true }
  })

  const quad = createRenderer(gl, {
    vert,
    frag,
    count: 3,
    attributes: {
      a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 }
    }
  })

  // Pointer events give CSS pixels from the top; the shader wants device
  // pixels from the bottom
  let target = null
  const toDevice = (e) => {
    const rect = canvas.getBoundingClientRect()
    const scale = gl.canvas.width / rect.width
    return [(e.clientX - rect.left) * scale, (rect.bottom - e.clientY) * scale]
  }
  canvas.addEventListener('pointermove', (e) => (target = toDevice(e)), { signal })
  canvas.addEventListener('pointerleave', () => (target = null), { signal })

  const pointer = [0, 0]
  return {
    frame(time, delta) {
      const { width, height } = gl.canvas
      // Off the canvas, wander in a figure of eight
      const [tx, ty] = target ?? [
        width * (0.5 + 0.3 * Math.sin(time * 0.7)),
        height * (0.5 + 0.25 * Math.sin(time * 1.4))
      ]
      // Ease towards it, at the same speed at any frame rate
      const ease = 1 - Math.pow(0.001, delta)
      pointer[0] += (tx - pointer[0]) * ease
      pointer[1] += (ty - pointer[1]) * ease

      quad.bindVAOs()
      quad.setUniforms({ u_resolution: [width, height], u_pointer: pointer, u_time: time })
      quad.render()
    },
    dispose() {
      ac.abort()
      quad.delete()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }
}
