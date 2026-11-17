import { createBuffer } from "./createBuffer.js";

/**
 * Creates the vertex array(s) for a set of parsed attribute definitions and
 * binds each attribute's location on `program`, which must not be linked yet.
 *
 * With transform feedback attributes it builds two VAOs and two transform
 * feedback objects that ping-pong: VAO 0 reads the buffers that transform
 * feedback 0 writes, and the same for 1. Only the transform feedback buffers
 * are doubled; every other attribute shares one buffer.
 *
 * `tfbBuffers[n][name]` is `{ i, buffer }`, where `i` is the buffer's
 * transform feedback binding index.
 */
const createVertexArray = (gl, program, attributes, indexOffset = 0) => {
  if (!attributes) return null;

  const names = Object.keys(attributes);
  const hasTFBs = names.some((n) => attributes[n].component === "transformFeedback");
  const shared = {};
  const vaos = [];
  const tfbs = [];
  const tfbBuffers = [];

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
        buffer = isTF ? createBuffer(gl, data, usage, buffertype) : (shared[name] ??= createBuffer(gl, data, usage, buffertype));
      }

      // Index buffers belong to the VAO, not to an attribute location.
      if (buffertype === gl.ELEMENT_ARRAY_BUFFER) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        return;
      }

      const location = index === null || isNaN(index) ? i + indexOffset : index;
      if (copy === 0) gl.bindAttribLocation(program, location, name);
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

  return { vaos, tfbs, tfbBuffers, hasTFBs };
};

export { createVertexArray };
