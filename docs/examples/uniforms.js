import { createContext, createRenderer } from 'wtc-simplegl'

// Uniforms of several types, set with setUniforms every frame: a float, a
// vec2, a vec3 array and an int.
const vert = /* glsl */ `#version 300 es
in vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const frag = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_palette[3];
uniform int u_bands;
out vec4 colour;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float wave = 0.5 + 0.5 * sin(uv.x * 6.283 + u_time) * 0.4 + uv.y * 0.6;
  // Pick a colour from the palette by band
  int band = int(floor(wave * float(u_bands))) % 3;
  float edge = fract(wave * float(u_bands));
  float alpha = smoothstep(0.0, 0.04, edge) * smoothstep(1.0, 0.96, edge);
  colour = vec4(u_palette[band] * alpha, alpha);
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
    count: 3,
    attributes: {
      a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 }
    }
  })

  // Set once: a uniform keeps its value until it's set again
  quad.setUniforms({
    u_palette: new Float32Array([0.29, 0.62, 1, 1, 0.45, 0.7, 1, 0.8, 0.3]),
    u_bands: 7
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
