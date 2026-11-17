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

// Returns a new object so the caller's attribute definitions aren't modified.
const parseAttributes = (attributes = {}) => {
  const parsed = {};
  for (const name of Object.keys(attributes)) {
    parsed[name] = { ...defaults, ...attributes[name] };
  }
  return parsed;
};

// Maps each uniform type to the gl call that sets it.
const createUniformSetters = (gl) => {
  const scalar = (one, many) => (l, v) =>
    typeof v === "number" || typeof v === "boolean" ? gl[one](l, v) : gl[many](l, v);
  const vec = (fn) => (l, v) => gl[fn](l, v);
  const mat = (fn) => (l, v) => gl[fn](l, false, v);

  const setters = {
    [gl.FLOAT]: scalar("uniform1f", "uniform1fv"),
    [gl.FLOAT_VEC2]: vec("uniform2fv"),
    [gl.FLOAT_VEC3]: vec("uniform3fv"),
    [gl.FLOAT_VEC4]: vec("uniform4fv"),
    [gl.INT]: scalar("uniform1i", "uniform1iv"),
    [gl.INT_VEC2]: vec("uniform2iv"),
    [gl.INT_VEC3]: vec("uniform3iv"),
    [gl.INT_VEC4]: vec("uniform4iv"),
    [gl.UNSIGNED_INT]: scalar("uniform1ui", "uniform1uiv"),
    [gl.UNSIGNED_INT_VEC2]: vec("uniform2uiv"),
    [gl.UNSIGNED_INT_VEC3]: vec("uniform3uiv"),
    [gl.UNSIGNED_INT_VEC4]: vec("uniform4uiv"),
    [gl.FLOAT_MAT2]: mat("uniformMatrix2fv"),
    [gl.FLOAT_MAT3]: mat("uniformMatrix3fv"),
    [gl.FLOAT_MAT4]: mat("uniformMatrix4fv"),
    [gl.FLOAT_MAT2x3]: mat("uniformMatrix2x3fv"),
    [gl.FLOAT_MAT2x4]: mat("uniformMatrix2x4fv"),
    [gl.FLOAT_MAT3x2]: mat("uniformMatrix3x2fv"),
    [gl.FLOAT_MAT3x4]: mat("uniformMatrix3x4fv"),
    [gl.FLOAT_MAT4x2]: mat("uniformMatrix4x2fv"),
    [gl.FLOAT_MAT4x3]: mat("uniformMatrix4x3fv"),
  };

  // Booleans and every sampler type are set as ints.
  setters[gl.BOOL] = setters[gl.INT];
  setters[gl.BOOL_VEC2] = setters[gl.INT_VEC2];
  setters[gl.BOOL_VEC3] = setters[gl.INT_VEC3];
  setters[gl.BOOL_VEC4] = setters[gl.INT_VEC4];
  for (const sampler of [
    gl.SAMPLER_2D, gl.SAMPLER_3D, gl.SAMPLER_CUBE, gl.SAMPLER_2D_ARRAY,
    gl.SAMPLER_2D_SHADOW, gl.SAMPLER_CUBE_SHADOW, gl.SAMPLER_2D_ARRAY_SHADOW,
    gl.INT_SAMPLER_2D, gl.INT_SAMPLER_3D, gl.INT_SAMPLER_CUBE, gl.INT_SAMPLER_2D_ARRAY,
    gl.UNSIGNED_INT_SAMPLER_2D, gl.UNSIGNED_INT_SAMPLER_3D,
    gl.UNSIGNED_INT_SAMPLER_CUBE, gl.UNSIGNED_INT_SAMPLER_2D_ARRAY,
  ]) setters[sampler] = setters[gl.INT];

  return setters;
};

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
  attributes = parseAttributes(attributes);
  const program = createProgram(gl, vert, frag, attributes);
  const bindings = createVertexArray(gl, program, attributes, attributesOffset);
  let tfbI = 0;

  linkProgram(gl, program);
  const uniforms = getActiveUniforms(gl, program);
  const setters = createUniformSetters(gl);

  return {
    program,
    uniforms,
    bindUniform(name, val) {
      if (val == null) return;
      if (!uniforms[name]) return;

      // Uniforms apply to the program in use, which may belong to another renderer.
      if (gl.getParameter(gl.CURRENT_PROGRAM) !== program) gl.useProgram(program);

      const { type, location } = uniforms[name];
      setters[type]?.(location, val);
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
