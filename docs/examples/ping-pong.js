import { createContext, createFrameBuffer, createRenderer } from 'wtc-simplegl'

// A dot paints into a pair of float framebuffers. Each frame reads the last
// one, turns it a little, fades it and draws the dot on top, leaving a
// curling trail. A second pass shows the result on the canvas.
const vert = /* glsl */ `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const step = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_previous;
uniform vec2 u_dot;
uniform float u_fade;
uniform float u_aspect;
in vec2 v_uv;
out vec4 colour;
void main() {
  // Turn and shrink the last frame about the centre, in square units
  vec2 p = (v_uv - 0.5) * vec2(u_aspect, 1.0);
  float a = 0.006;
  p = mat2(cos(a), sin(a), -sin(a), cos(a)) * p * 0.997;
  vec4 last = texture(u_previous, p / vec2(u_aspect, 1.0) + 0.5) * u_fade;

  vec2 d = (v_uv - u_dot) * vec2(u_aspect, 1.0);
  float spot = 1.0 - smoothstep(0.03, 0.04, length(d));
  vec3 rgb = mix(vec3(0.29, 0.62, 1.0), vec3(1.0, 0.45, 0.7), v_uv.x);
  // Premultiplied, like the canvas
  colour = mix(last, vec4(rgb, 1.0), spot);
}`

const show = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_result;
in vec2 v_uv;
out vec4 colour;
void main() {
  colour = texture(u_result, v_uv);
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

  const attributes = {
    a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 }
  }
  const stepper = createRenderer(gl, { vert, frag: step, attributes, count: 3 })
  const shower = createRenderer(gl, { vert, frag: show, attributes, count: 3 })

  // Half-float, so the fade reaches zero instead of leaving ghosts
  const feedback = createFrameBuffer(gl, { width: 1, height: 1, type: gl.HALF_FLOAT })
  const fit = () => {
    const { width, height } = gl.canvas
    if (width !== feedback.width || height !== feedback.height) feedback.resize(width, height)
  }

  return {
    frame(time, delta) {
      fit()
      // Step: read the last frame, draw the next into write, then swap
      gl.bindFramebuffer(gl.FRAMEBUFFER, feedback.write.fb)
      stepper.bindVAOs()
      stepper.setUniforms({
        u_previous: feedback.read,
        u_dot: [0.5 + 0.3 * Math.sin(time * 1.3), 0.5 + 0.3 * Math.sin(time * 1.7)],
        // The same fade per second at any frame rate
        u_fade: Math.pow(0.15, delta),
        u_aspect: feedback.width / feedback.height
      })
      stepper.render({ width: feedback.width, height: feedback.height })
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      feedback.swap()

      // Show: read is now the frame just drawn
      shower.bindVAOs()
      shower.setUniforms({ u_result: feedback.read })
      shower.render()
    },
    dispose() {
      ac.abort()
      stepper.delete()
      shower.delete()
      feedback.delete()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }
}
