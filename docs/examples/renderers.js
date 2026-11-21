import { createContext, createRenderer } from 'wtc-simplegl'

// Two renderers: a triangle with a colour per vertex, drawn with render(),
// and a square from four vertices and an index buffer, drawn with
// gl.drawElements.
const vert = /* glsl */ `#version 300 es
in vec2 a_position;
in vec3 a_colour;
uniform vec2 u_offset;
uniform float u_aspect;
out vec3 v_colour;
void main() {
  v_colour = a_colour;
  gl_Position = vec4((a_position + u_offset) * vec2(1.0 / u_aspect, 1.0), 0.0, 1.0);
}`

const frag = /* glsl */ `#version 300 es
precision highp float;
in vec3 v_colour;
out vec4 colour;
void main() {
  colour = vec4(v_colour, 1.0);
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

  const triangle = createRenderer(gl, {
    vert,
    frag,
    count: 3,
    attributes: {
      a_position: { data: new Float32Array([0, 0.6, -0.55, -0.4, 0.55, -0.4]), size: 2 },
      a_colour: { data: new Float32Array([1, 0.45, 0.7, 0.29, 0.62, 1, 1, 0.8, 0.3]), size: 3 }
    }
  })

  const square = createRenderer(gl, {
    vert,
    frag,
    attributes: {
      a_position: { data: new Float32Array([-0.45, -0.45, 0.45, -0.45, 0.45, 0.45, -0.45, 0.45]), size: 2 },
      a_colour: { data: new Float32Array([0.29, 0.62, 1, 0.4, 0.9, 0.7, 1, 0.8, 0.3, 1, 0.45, 0.7]), size: 3 },
      // Two triangles that share a diagonal
      indices: { data: new Uint16Array([0, 1, 2, 0, 2, 3]), buffertype: gl.ELEMENT_ARRAY_BUFFER }
    }
  })

  return {
    frame(time) {
      const aspect = gl.canvas.width / gl.canvas.height
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      triangle.bindVAOs()
      triangle.setUniforms({ u_offset: [-0.8, Math.sin(time) * 0.1], u_aspect: aspect })
      triangle.render()

      square.bindVAOs()
      square.setUniforms({ u_offset: [0.8, Math.cos(time) * 0.1], u_aspect: aspect })
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0)
    },
    dispose() {
      ac.abort()
      triangle.delete()
      square.delete()
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      canvas.remove()
    }
  }
}
