import { createContext, createRenderer, loadTexture } from 'wtc-simplegl'
import hills from './assets/hills.svg?url'

// An image, scaled to cover the canvas, that ripples and splits into its red,
// green and blue around the pointer.
const vert = /* glsl */ `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const frag = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_image;
uniform vec2 u_cover;   // scales uvs so the image covers the canvas
uniform vec2 u_pointer; // 0–1, y up
uniform float u_aspect;
uniform float u_time;
in vec2 v_uv;
out vec4 colour;
void main() {
  vec2 uv = (v_uv - 0.5) * u_cover + 0.5;

  // Ripples spreading from the pointer, fading with distance
  vec2 d = (v_uv - u_pointer) * vec2(u_aspect, 1.0);
  float r = length(d);
  float strength = smoothstep(0.35, 0.0, r);
  vec2 dir = r > 0.0 ? d / r : vec2(0.0);
  vec2 offset = dir * sin(r * 50.0 - u_time * 6.0) * 0.012 * strength;

  // Read each channel a little further out than the last
  float red = texture(u_image, uv + offset * 1.6).r;
  float green = texture(u_image, uv + offset).g;
  float blue = texture(u_image, uv + offset * 0.4).b;
  colour = vec4(red, green, blue, 1.0);
}`

export default function (container) {
  const ac = new AbortController()
  const { signal } = ac
  const canvas = document.createElement('canvas')
  container.appendChild(canvas)
  const gl = createContext({ canvas, signal })

  const quad = createRenderer(gl, {
    vert,
    frag,
    count: 3,
    attributes: {
      a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 }
    }
  })

  // Loads in the background; aborting the signal gives up, so an example
  // that's disposed of before the image arrives doesn't leak a texture
  let image = null
  loadTexture(gl, hills, { flipY: true, signal })
    .then((texture) => (image = texture))
    .catch(() => {})
  const imageAspect = 1200 / 800

  const pointer = [0.5, 0.5]
  let target = null
  canvas.addEventListener(
    'pointermove',
    (e) => {
      const rect = canvas.getBoundingClientRect()
      target = [(e.clientX - rect.left) / rect.width, (rect.bottom - e.clientY) / rect.height]
    },
    { signal }
  )
  canvas.addEventListener('pointerleave', () => (target = null), { signal })

  return {
    frame(time, delta) {
      if (!image) return
      const aspect = gl.canvas.width / gl.canvas.height
      const [tx, ty] = target ?? [0.5 + 0.3 * Math.sin(time * 0.5), 0.45 + 0.15 * Math.sin(time * 0.8)]
      const ease = 1 - Math.pow(0.002, delta)
      pointer[0] += (tx - pointer[0]) * ease
      pointer[1] += (ty - pointer[1]) * ease

      quad.bindVAOs()
      quad.setUniforms({
        u_image: image,
        // Crop whichever way the image is too big for the canvas
        u_cover: aspect > imageAspect ? [1, imageAspect / aspect] : [aspect / imageAspect, 1],
        u_pointer: pointer,
        u_aspect: aspect,
        u_time: time
      })
      quad.render()
    },
    dispose() {
      ac.abort()
      quad.delete()
      if (image) gl.deleteTexture(image)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }
}
