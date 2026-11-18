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
  for (const sampler of Object.keys(samplerTargets(gl))) setters[sampler] = setters[gl.INT];

  return setters;
};

// The texture target each sampler type reads from.
const samplerTargets = (gl) => {
  const targets = {};
  const add = (target, types) => types.forEach((t) => (targets[gl[t]] = target));
  add(gl.TEXTURE_2D, ["SAMPLER_2D", "SAMPLER_2D_SHADOW", "INT_SAMPLER_2D", "UNSIGNED_INT_SAMPLER_2D"]);
  add(gl.TEXTURE_3D, ["SAMPLER_3D", "INT_SAMPLER_3D", "UNSIGNED_INT_SAMPLER_3D"]);
  add(gl.TEXTURE_CUBE_MAP, ["SAMPLER_CUBE", "SAMPLER_CUBE_SHADOW", "INT_SAMPLER_CUBE", "UNSIGNED_INT_SAMPLER_CUBE"]);
  add(gl.TEXTURE_2D_ARRAY, ["SAMPLER_2D_ARRAY", "SAMPLER_2D_ARRAY_SHADOW", "INT_SAMPLER_2D_ARRAY", "UNSIGNED_INT_SAMPLER_2D_ARRAY"]);
  return targets;
};

// A texture, a framebuffer target ({ targetTexture }) or a list of them, as
// opposed to a unit number or list of unit numbers.
const isTextureValue = (v) =>
  typeof v === "object" && !ArrayBuffer.isView(v) && !(Array.isArray(v) && typeof v[0] === "number");

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
  const hasTFBs = Object.values(attributes).some((a) => a.component === "transformFeedback");
  // WebGL2 can only capture transform feedback from these three modes.
  if (hasTFBs && ![gl.POINTS, gl.LINES, gl.TRIANGLES].includes(mode)) {
    throw new Error("createRenderer: transform feedback needs mode gl.POINTS, gl.LINES or gl.TRIANGLES");
  }
  const program = createProgram(gl, vert, frag, attributes);
  const bindings = createVertexArray(gl, program, attributes, attributesOffset);
  let tfbI = 0;
  let feedback = null;

  linkProgram(gl, program);
  const uniforms = getActiveUniforms(gl, program);
  const setters = createUniformSetters(gl);

  // Give every sampler its own texture unit (arrays get one per element), so
  // textures can be passed straight to bindUniform. They're bound to their
  // units when the renderer draws, since units are shared by all programs.
  const targets = samplerTargets(gl);
  const textures = []; // by unit: { target, texture }
  const previousProgram = gl.getParameter(gl.CURRENT_PROGRAM);
  gl.useProgram(program);
  let nextUnit = 0;
  for (const u of new Set(Object.values(uniforms))) {
    if (!(u.type in targets)) continue;
    u.unit = nextUnit;
    gl.uniform1iv(u.location, Array.from({ length: u.size }, (_, k) => nextUnit + k));
    nextUnit += u.size;
  }
  gl.useProgram(previousProgram);

  const bindTextures = () => {
    if (!textures.length) return;
    textures.forEach(({ target, texture }, unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(target, texture);
    });
    gl.activeTexture(gl.TEXTURE0);
  };

  const bindUniform = (name, val) => {
    if (val == null) return;
    const u = uniforms[name];
    if (!u) return;

    if (u.unit !== undefined && isTextureValue(val)) {
      [val].flat().slice(0, u.size).forEach((t, k) => {
        textures[u.unit + k] = { target: targets[u.type], texture: t?.targetTexture ?? t };
      });
      return;
    }
    // A unit number for a sampler means its textures are bound by hand.
    if (u.unit !== undefined) for (let k = 0; k < u.size; k++) delete textures[u.unit + k];

    // Uniforms apply to the program in use, which may belong to another renderer.
    if (gl.getParameter(gl.CURRENT_PROGRAM) !== program) gl.useProgram(program);
    setters[u.type]?.(u.location, val);
  };

  return {
    program,
    uniforms,
    bindUniform,
    /** Sets several uniforms at once: `setUniforms({ u_time: t, u_image: texture })`. */
    setUniforms(values) {
      for (const name in values) bindUniform(name, values[name]);
    },
    bindVAOs() {
      gl.useProgram(program);

      if(bindings.hasTFBs) {
        // Read from one set of buffers and write into the other, then swap.
        const next = (tfbI + 1) % 2;
        gl.bindVertexArray(bindings.vaos[tfbI]);
        feedback = bindings.tfbs[next];
        tfbI = next;
      } else {
        const vao = bindings.vaos[0];
        if (vao) gl.bindVertexArray(vao);
      }
      bindTextures();
    },
    render({ width = null, height = null, x = 0, y = 0 } = {}) {
      gl.viewport(x, y, width || gl.canvas.width, height || gl.canvas.height);
      bindTextures();
      if (!feedback) return gl.drawArrays(mode, offset, count);

      // Unbound afterwards: while bound, its buffers can't be used anywhere else.
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedback);
      gl.beginTransformFeedback(mode);
      gl.drawArrays(mode, offset, count);
      gl.endTransformFeedback();
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    },
  };
};

export { createRenderer };
