import { createBuffer } from "./createBuffer.js";

/**
 * @typedef {object} FeedbackBuffer A transform feedback output buffer.
 * @property {number} i Its transform feedback binding index.
 * @property {WebGLBuffer} buffer The buffer.
 */

/**
 * @typedef {object} VertexArrayBindings What `createVertexArray` made.
 * @property {WebGLVertexArrayObject[]} vaos One vertex array, or two with transform feedback.
 * @property {WebGLTransformFeedback[]} tfbs With transform feedback: the object that writes into
 *   each vertex array's buffers.
 * @property {Record<string, FeedbackBuffer>[]} tfbBuffers With transform feedback: for each vertex
 *   array, its output buffers by attribute name.
 * @property {boolean} hasTFBs Whether any attribute is a transform feedback output.
 * @property {Record<string, number>} locations Each attribute's location, by name.
 * @property {WebGLBuffer[]} buffers The buffers made from attribute `data`.
 */

/**
 * Creates the vertex array(s) for a set of attribute definitions and binds
 * each attribute's location on `program`, which must not be linked yet.
 *
 * With transform feedback attributes it builds two vertex arrays and two
 * transform feedback objects that ping-pong: vertex array 0 reads the buffers
 * that transform feedback 0 writes, and the same for 1. Only the transform
 * feedback buffers are doubled; every other attribute shares one buffer.
 *
 * @param {WebGL2RenderingContext} gl The WebGL2 context.
 * @param {WebGLProgram} program An unlinked program, from `createProgram`.
 * @param {Record<string, import("./createRenderer.js").Attribute>} attributes
 * @param {number} [indexOffset=0] Added to every default attribute location.
 * @returns {VertexArrayBindings}
 *
 * @category Lower level
 */
const createVertexArray = (gl, program, attributes, indexOffset = 0) => {
  if (!attributes) return null;

  const names = Object.keys(attributes);
  const hasTFBs = names.some((n) => attributes[n].component === "transformFeedback");
  const shared = {};
  const vaos = [];
  const tfbs = [];
  const tfbBuffers = [];
  const locations = {};
  const created = []; // buffers made here from `data`, freed by createRenderer's delete()
  const make = (data, usage, buffertype) => {
    const buffer = createBuffer(gl, data, usage, buffertype);
    created.push(buffer);
    return buffer;
  };

  for (let copy = 0; copy < (hasTFBs ? 2 : 1); copy++) {
    const vao = gl.createVertexArray();
    vaos.push(vao);
    gl.bindVertexArray(vao);
    const feedback = {};

    names.forEach((name, i) => {
      const {
        size = 1,
        type = gl.FLOAT,
        normalize = false,
        stride = 0,
        offset = 0,
        data,
        usage = gl.STATIC_DRAW,
        buffertype = gl.ARRAY_BUFFER,
        index = null,
        component = "attribute",
      } = attributes[name];
      const isTF = component === "transformFeedback";

      if (isTF && !data) {
        throw new Error(
          `createVertexArray: transform feedback attribute "${name}" needs \`data\` (two buffers are made from it)`
        );
      }

      let buffer = attributes[name].buffer;
      if (!buffer && data) {
        buffer = isTF ? make(data, usage, buffertype) : (shared[name] ??= make(data, usage, buffertype));
      }

      // Index buffers belong to the VAO, not to an attribute location.
      if (buffertype === gl.ELEMENT_ARRAY_BUFFER) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        return;
      }

      const location = index === null || isNaN(index) ? i + indexOffset : index;
      if (copy === 0) gl.bindAttribLocation(program, location, name);
      locations[name] = location;
      gl.enableVertexAttribArray(location);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(location, size, type, normalize, stride, offset);

      if (isTF) feedback[name] = { i: Object.keys(feedback).length, buffer };
    });

    gl.bindVertexArray(null);

    if (hasTFBs) {
      const tfb = gl.createTransformFeedback();
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tfb);
      for (const { i, buffer } of Object.values(feedback)) {
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, i, buffer);
      }
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
      gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);
      tfbs.push(tfb);
      tfbBuffers.push(feedback);
    }
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return { vaos, tfbs, tfbBuffers, hasTFBs, locations, buffers: created };
};

export { createVertexArray };
