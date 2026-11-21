import { createContext, createRenderer } from 'wtc-simplegl'

// Particles simulated on the GPU. One renderer steps them with transform
// feedback; another draws them, reading the simulation's latest output.
const COUNT = 2000

const simulate = /* glsl */ `#version 300 es
in vec2 a_position;
in vec2 a_velocity;
out vec2 v_position;
out vec2 v_velocity;
uniform float u_delta;
void main() {
  // Each particle is pulled towards a ring of its own radius, and pushed round it
  vec2 p = a_position;
  float ring = 0.35 + 0.55 * fract(sin(float(gl_VertexID) * 12.9898) * 43758.5453);
  float r = max(length(p), 1e-4);
  vec2 pull = p / r * (ring - r) * 4.0;
  vec2 swirl = vec2(-p.y, p.x) / r * (0.6 + 0.6 * ring);
  v_velocity = (a_velocity + (pull + swirl) * u_delta) * pow(0.2, u_delta);
  v_position = p + v_velocity * u_delta;
  gl_Position = vec4(0.0);
}`

// The simulation draws nothing, but a program still needs a fragment shader
const nothing = /* glsl */ `#version 300 es
precision highp float;
out vec4 colour;
void main() { colour = vec4(0.0); }`

const vert = /* glsl */ `#version 300 es
in vec2 a_position;
in vec2 a_velocity;
uniform float u_aspect;
out float v_speed;
void main() {
  v_speed = length(a_velocity);
  gl_Position = vec4(a_position * vec2(1.0 / u_aspect, 1.0) * 0.8, 0.0, 1.0);
  gl_PointSize = 3.0;
}`

const frag = /* glsl */ `#version 300 es
precision highp float;
in float v_speed;
out vec4 colour;
void main() {
  float alpha = smoothstep(0.5, 0.2, length(gl_PointCoord - 0.5)) * 0.8;
  vec3 rgb = mix(vec3(0.29, 0.62, 1.0), vec3(1.0, 0.45, 0.7), clamp(v_speed, 0.0, 1.0));
  colour = vec4(rgb * alpha, alpha);
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

  // Start in a ring, still
  const positions = new Float32Array(COUNT * 2)
  for (let i = 0; i < COUNT; i++) {
    const a = Math.random() * Math.PI * 2
    const r = 0.6 + Math.random() * 0.5
    positions.set([Math.cos(a) * r, Math.sin(a) * r], i * 2)
  }

  const simulation = createRenderer(gl, {
    vert: simulate,
    frag: nothing,
    mode: gl.POINTS,
    count: COUNT,
    attributes: {
      a_position: { data: positions, size: 2, component: 'transformFeedback', varying: 'v_position', usage: gl.DYNAMIC_COPY },
      a_velocity: { data: new Float32Array(COUNT * 2), size: 2, component: 'transformFeedback', varying: 'v_velocity', usage: gl.DYNAMIC_COPY }
    }
  })

  const particles = createRenderer(gl, {
    vert,
    frag,
    mode: gl.POINTS,
    count: COUNT,
    attributes: {
      a_position: { from: simulation, size: 2 },
      a_velocity: { from: simulation, size: 2 }
    }
  })

  return {
    frame(time, delta) {
      // Step, without drawing anything
      gl.enable(gl.RASTERIZER_DISCARD)
      simulation.bindVAOs()
      simulation.setUniforms({ u_delta: Math.min(delta, 1 / 30) })
      simulation.render()
      gl.disable(gl.RASTERIZER_DISCARD)

      // Draw the result, adding up where particles overlap
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      particles.bindVAOs()
      particles.setUniforms({ u_aspect: gl.canvas.width / gl.canvas.height })
      particles.render()
      gl.disable(gl.BLEND)
    },
    dispose() {
      ac.abort()
      particles.delete()
      simulation.delete()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }
}
