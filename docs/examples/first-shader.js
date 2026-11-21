import { createContext, createRenderer } from 'wtc-simplegl'

// A full-screen triangle coloured by a fragment shader. The canvas is
// see-through, so the shader writes premultiplied colour.
const vert = /* glsl */ `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const frag = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 colour;
void main() {
  // Centred, with y from -1 to 1
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y * 2.0;
  float rings = 0.5 + 0.5 * sin(length(p) * 12.0 - u_time * 2.0);
  float alpha = smoothstep(0.2, 0.8, rings) * smoothstep(1.4, 0.6, length(p));
  vec3 rgb = mix(vec3(0.29, 0.62, 1.0), vec3(1.0, 0.45, 0.7), 0.5 + 0.5 * p.x);
  colour = vec4(rgb * alpha, alpha);
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

  const quad = createRenderer(gl, {
    vert,
    frag,
    attributes: {
      // One triangle that covers the canvas
      a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 }
    },
    count: 3
  })

  return {
    frame(time) {
      quad.bindVAOs()
      quad.setUniforms({
        u_resolution: [gl.canvas.width, gl.canvas.height],
        u_time: time
      })
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
