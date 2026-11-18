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

/**
 * @typedef {object} Attribute One vertex attribute, keyed by its name in the
 *   vertex shader. Give it `data`, an existing `buffer`, or `from` another
 *   renderer's transform feedback output.
 * @property {ArrayBufferView} [data] Values to upload into a new buffer.
 * @property {WebGLBuffer} [buffer] An existing buffer to read from instead.
 * @property {number} [size=1] Components per vertex, 1 to 4. Defaults to `1`.
 * @property {number} [type=gl.FLOAT] The type of each component. Defaults to `gl.FLOAT`.
 * @property {boolean} [normalize=false] Map integer types to 0–1 (or −1–1). Defaults to `false`.
 * @property {number} [stride=0] Bytes between consecutive vertices; 0 means tightly packed. Defaults to `0`.
 * @property {number} [offset=0] Bytes to the first component. Defaults to `0`.
 * @property {number} [usage=gl.STATIC_DRAW] How a buffer made from `data` will be used. Defaults to `gl.STATIC_DRAW`.
 * @property {number} [buffertype=gl.ARRAY_BUFFER] `gl.ELEMENT_ARRAY_BUFFER` makes this the index buffer. Defaults to `gl.ARRAY_BUFFER`.
 * @property {number} [index] The attribute location. Defaults to the attribute's position in `attributes`.
 * @property {"attribute" | "transformFeedback"} [component="attribute"] `"transformFeedback"` makes
 *   this an output of the vertex shader as well as an input; see `varying`. Defaults to `"attribute"`.
 * @property {string} [varying] For transform feedback: the vertex shader output that updates this attribute.
 * @property {Renderer} [from] Read another renderer's transform feedback output of the same name.
 * @property {string} [output] With `from`: the name of the output to read, if it's different.
 */

/**
 * @typedef {object} RendererOptions Options for `createRenderer`.
 * @property {string} vert GLSL ES 3.00 vertex shader source.
 * @property {string} frag GLSL ES 3.00 fragment shader source.
 * @property {Record<string, Attribute>} [attributes] The vertex attributes, by name.
 * @property {number} [count] Number of vertices to draw.
 * @property {number} [offset=0] First vertex to draw. Defaults to `0`.
 * @property {number} [mode=gl.TRIANGLES] Primitive type. Transform feedback needs
 *   `gl.POINTS`, `gl.LINES` or `gl.TRIANGLES`. Defaults to `gl.TRIANGLES`.
 * @property {number} [attributesOffset=0] Added to every default attribute location.
 */

/**
 * @typedef {object} RenderOptions The viewport to draw into. Defaults to the whole canvas.
 * @property {number} [x=0] Left edge, in device pixels. Defaults to `0`.
 * @property {number} [y=0] Bottom edge, in device pixels. Defaults to `0`.
 * @property {number} [width] Width; the canvas width by default.
 * @property {number} [height] Height; the canvas height by default.
 */

/**
 * @typedef {object} Renderer A program with its vertex arrays and uniforms, made by `createRenderer`.
 * @property {WebGLProgram} program The linked program.
 * @property {Record<string, import("./getActiveUniforms.js").ActiveUniform>} uniforms The program's
 *   active uniforms, by name.
 * @property {(name: string, value: any) => void} bindUniform Sets a uniform. Numbers, arrays and typed
 *   arrays all work, and array uniforms can be set by their plain name. For a sampler, pass a texture or
 *   a framebuffer target: it's bound to the sampler's own texture unit when the renderer draws. A unit
 *   number still works for textures bound by hand. Names the shader doesn't use are ignored.
 * @property {(values: Record<string, any>) => void} setUniforms `bindUniform` for several uniforms at once.
 * @property {Record<string, WebGLBuffer>} outputs With transform feedback: the buffers holding the
 *   latest output, by attribute name.
 * @property {() => void} bindVAOs Uses the program and binds its vertex array and textures. Call before
 *   drawing.
 * @property {(options?: RenderOptions) => void} render Sets the viewport and draws.
 * @property {() => void} delete Frees the program, vertex arrays, transform feedback objects and the
 *   buffers made from attribute `data`. The renderer does nothing afterwards.
 */

/**
 * Compiles and links a program from `vert` and `frag`, sets up its vertex
 * array and looks up its uniforms.
 *
 * @example
 * const quad = createRenderer(gl, {
 *   vert, frag, count: 3,
 *   attributes: { a_position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 } },
 * });
 * quad.bindVAOs();
 * quad.setUniforms({ u_time: time });
 * quad.render();
 *
 * @param {WebGL2RenderingContext} gl The WebGL2 context.
 * @param {RendererOptions} options See `RendererOptions`.
 * @returns {Renderer}
 *
 * @category Drawing
 */
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
  // Attributes read from another renderer's transform feedback outputs start
  // on its current buffers and follow them as it swaps.
  const followers = Object.entries(attributes).filter(([, a]) => a.from);
  for (const [name, a] of followers) {
    a.output ??= name;
    a.buffer = a.from.outputs?.[a.output];
    if (!a.buffer) {
      throw new Error(`createRenderer: attribute "${name}" reads output "${a.output}", which the \`from\` renderer doesn't have`);
    }
  }

  const program = createProgram(gl, vert, frag, attributes);
  const bindings = createVertexArray(gl, program, attributes, attributesOffset);
  let tfbI = 0;
  let feedback = null;
  let feedbackIndex = 0;
  let written = 0; // buffer set holding the latest transform feedback output

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
  // A deleted program can still be current, but can't be made current again.
  gl.useProgram(gl.isProgram(previousProgram) ? previousProgram : null);

  const bindTextures = () => {
    if (!textures.length) return;
    textures.forEach(({ target, texture }, unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(target, texture);
    });
    gl.activeTexture(gl.TEXTURE0);
  };

  let deleted = false;

  const bindUniform = (name, val) => {
    if (val == null || deleted) return;
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
    /**
     * With transform feedback attributes: `{ [name]: buffer }` holding the
     * latest output, for reading back or for another renderer's
     * `{ from: renderer }` attributes.
     */
    get outputs() {
      if (!bindings.hasTFBs) return {};
      return Object.fromEntries(
        Object.entries(bindings.tfbBuffers[written]).map(([name, { buffer }]) => [name, buffer])
      );
    },
    bindVAOs() {
      if (deleted) return;
      gl.useProgram(program);

      let vao = bindings.vaos[0];
      if(bindings.hasTFBs) {
        // Read from one set of buffers and write into the other, then swap.
        const next = (tfbI + 1) % 2;
        vao = bindings.vaos[tfbI];
        gl.bindVertexArray(vao);
        feedback = bindings.tfbs[next];
        feedbackIndex = next;
        tfbI = next;
      } else if (vao) {
        gl.bindVertexArray(vao);
      }

      // Point followed attributes at their source's latest output.
      for (const [name, a] of followers) {
        const buffer = a.from.outputs[a.output];
        a.bound ??= new Map(bindings.vaos.map((v) => [v, a.buffer]));
        if (a.bound.get(vao) === buffer) continue;
        a.bound.set(vao, buffer);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(bindings.locations[name], a.size, a.type, a.normalize, a.stride, a.offset);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
      }

      bindTextures();
    },
    render({ width = null, height = null, x = 0, y = 0 } = {}) {
      if (deleted) return;
      gl.viewport(x, y, width || gl.canvas.width, height || gl.canvas.height);
      bindTextures();
      if (!feedback) return gl.drawArrays(mode, offset, count);

      // Unbound afterwards: while bound, its buffers can't be used anywhere else.
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedback);
      gl.beginTransformFeedback(mode);
      gl.drawArrays(mode, offset, count);
      gl.endTransformFeedback();
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      written = feedbackIndex;
    },
    /**
     * Frees the program, vertex arrays, transform feedback objects and the
     * buffers made from attribute `data`. Buffers and textures passed in are
     * left alone. The renderer does nothing afterwards.
     */
    delete() {
      if (deleted) return;
      deleted = true;
      bindings.vaos.forEach((v) => gl.deleteVertexArray(v));
      bindings.tfbs.forEach((t) => gl.deleteTransformFeedback(t));
      bindings.buffers.forEach((b) => gl.deleteBuffer(b));
      if (gl.getParameter(gl.CURRENT_PROGRAM) === program) gl.useProgram(null);
      gl.deleteProgram(program);
      textures.length = 0;
    },
  };
};

export { createRenderer };
