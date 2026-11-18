import { createContext, createRenderer, createTexture, updateTexture } from 'wtc-simplegl'

// Cells around 40 moving points. The points' positions are uploaded into a
// float texture every frame, and the shader reads them all with texelFetch to
// find the nearest two.
const COUNT = 40

const vert = /* glsl */ `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const frag = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D u_points; // COUNT × 1, RG32F: each texel is a point, 0–1
uniform int u_count;
uniform float u_aspect;
in vec2 v_uv;
out vec4 colour;
void main() {
  vec2 p = v_uv * vec2(u_aspect, 1.0);
  float nearest = 1e9, second = 1e9;
  int which = 0;
  for (int i = 0; i < u_count; i++) {
    vec2 point = texelFetch(u_points, ivec2(i, 0), 0).xy * vec2(u_aspect, 1.0);
    float d = distance(p, point);
    if (d < nearest) { second = nearest; nearest = d; which = i; }
    else if (d < second) { second = d; }
  }
  // Lines where two cells meet, and a dot at each point
  float edge = 1.0 - smoothstep(0.0, 0.006, second - nearest);
  float centre = 1.0 - smoothstep(0.006, 0.01, nearest);
  float shade = fract(float(which) * 0.618);
  vec3 rgb = mix(vec3(0.29, 0.62, 1.0), vec3(1.0, 0.45, 0.7), shade);
  float alpha = max(max(edge, centre), 0.12);
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

  // Two floats per point: x and y
  const points = new Float32Array(COUNT * 2)
  const seeds = Array.from({ length: COUNT }, () => [Math.random(), Math.random(), 0.2 + Math.random()])
  const options = { width: COUNT, height: 1, format: gl.RG, type: gl.FLOAT }
  const texture = createTexture(gl, { ...options, data: points })

  const cells = createRenderer(gl, {
    vert,
    frag,
    count: 3,
    attributes: {
      a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 }
    }
  })
  cells.setUniforms({ u_count: COUNT })

  return {
    frame(time) {
      // Move each point in a slow loop about where it started
      seeds.forEach(([x, y, speed], i) => {
        points[i * 2] = x + 0.08 * Math.sin(time * speed + i)
        points[i * 2 + 1] = y + 0.08 * Math.cos(time * speed * 0.8 + i * 2)
      })
      updateTexture(gl, texture, points, options)

      cells.bindVAOs()
      cells.setUniforms({ u_points: texture, u_aspect: gl.canvas.width / gl.canvas.height })
      cells.render()
    },
    dispose() {
      ac.abort()
      cells.delete()
      gl.deleteTexture(texture)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }
}
