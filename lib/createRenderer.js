import { createProgram, linkProgram } from "./createProgram.js";
import { getActiveUniforms } from "./getActiveUniforms.js";
import { createVertexArray } from "./createVertexArray.js";

const defaults = {
  size: 1,
  type: 5126,             // gl.FLOAT
  normalize: false,
  stride: 0,
  offset: 0,
  buffer: null,
  data: null,
  usage: 35044,           // gl.STATIC_DRAW
  buffertype: 34962,      // gl.ARRAY_BUFFER
  index: null,
  component: 'attribute'
};

const parseAttributes = (attributes) => {
  const names = Object.keys(attributes);
  for (let i = 0; i < names.length; i++) {
    attributes[names[i]] = {...defaults, ...attributes[names[i]]}
  }
}

const createRenderer = (
  gl,
  {
    vert,
    frag,
    attributes,
    count,
    offset = 0,
    mode = gl.TRIANGLES,
    attributesOffset = 0
  } = {}
) => {
  parseAttributes(attributes);
  window.attributes = attributes;
  const program = createProgram(gl, vert, frag, attributes);
  const bindings = createVertexArray(gl, program, attributes, attributesOffset);
  let tfbI = 0;

  linkProgram(gl)
  const uniforms = getActiveUniforms(gl, program);

  return {
    uniforms,
    bindUniform(name, val) {
      if (val === undefined) return;
      if (!uniforms[name]) return;
      // if(!uniforms.changed) return;

      const { type, location } = uniforms[name];

      switch (type) {
        case 5126:
          // FLOAT
          if (val instanceof Array) {
            return gl.uniform1fv(location, val);
          } else if (typeof val === "number") {
            gl.uniform1f(location, val);
          }
          return null;
        case 35664:
          // FLOAT_VEC2
          return gl.uniform2fv(location, val);
        case 35665:
          // FLOAT_VEC3
          return gl.uniform3fv(location, val);
        case 35666:
          // FLOAT_VEC4
          return gl.uniform4fv(location, val);
        case 35670: // BOOL
        case 5124: // INT
        case 35678: // SAMPLER_2D
        case 35680:
          // SAMPLER_CUBE
          return val.length
            ? gl.uniform1iv(location, val)
            : gl.uniform1i(location, val);
        case 35671: // BOOL_VEC2
        case 35667:
          // INT_VEC2
          return gl.uniform2iv(location, val);
        case 35672: // BOOL_VEC3
        case 35668:
          // INT_VEC3
          return gl.uniform3iv(location, val);
        case 35673: // BOOL_VEC4
        case 35669:
          // INT_VEC4
          return gl.uniform4iv(location, val);
        case 35674:
          // FLOAT_MAT2
          return gl.uniformMatrix2fv(location, false, val);
        case 35675:
          // FLOAT_MAT3
          return gl.uniformMatrix3fv(location, false, val);
        case 35676:
          if (val === null) return;
          // FLOAT_MAT4
          return gl.uniformMatrix4fv(location, false, val);
      }
    },
    bindVAOs() {
      gl.useProgram(program);

      if(bindings.hasTFBs) {
        const i = (tfbI + 1) % 2;
        const source = bindings.vaos[tfbI];
        const feedbk = bindings.tfbs[i];
        const buffer = bindings.tfbBuffers[i];
  
        gl.bindVertexArray(source);
        gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedbk);
  
        for (let i in buffer) {
          const b = buffer[i];
          gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, b.i, b.buffer);
        }
  
        tfbI = i;
      } else {
        const vao = bindings.vaos[0];
        if (vao) gl.bindVertexArray(vao);
      }
    },
    render({ width = null, height = null, x = 0, y = 0 } = {}) {
      gl.viewport(x, y, width || gl.canvas.width, height || gl.canvas.height);
      if (bindings.hasTFBs) gl.beginTransformFeedback(mode);
      gl.drawArrays(mode, offset, count);
      if (bindings.hasTFBs) gl.endTransformFeedback();
    },
  };
};

export { createRenderer };
