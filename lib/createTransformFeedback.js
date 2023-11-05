import { createBuffer } from "./createBuffer";

// The major issue with this function is that it necessarily assumes that you're only going to have transform feedbacks for an object
// This is because you can only bind one VAO at a time, and because the TFB VAO gets bound *after* the attributes, it means that
// they're overridden. I'll need to work out a more elegant solution to this later on.

const createTransformFeedback = (gl, program, transformFeedbacks, indexOffset=0) => {
  if (!transformFeedbacks) return null;

  const vaos = [gl.createVertexArray(), gl.createVertexArray()];
  const tfbs = [gl.createTransformFeedback(), gl.createTransformFeedback()];
  const tfbBuffers = [];
  const names = Object.keys(transformFeedbacks);

  vaos.forEach((vao, i) => {
    gl.bindVertexArray(vao);

    const buffers = [];
    const bufferRef = {};

    for (let i = 0; i < names.length; i++) {
      let {
        size = 1,
        type = gl.FLOAT,
        normalize = false,
        stride = 0,
        offset = 0,
        buffer,
        data,
        usage = gl.STATIC_DRAW,
        buffertype = gl.ARRAY_BUFFER,
        index = null
      } = transformFeedbacks[names[i]];

      if (data && !buffer) buffer = createBuffer(gl, data, usage, buffertype);

      bufferRef[names[i]] = { i, buffer };
      
      // const location = gl.getAttribLocation(program, names[i]);
      const location = isNaN(index) ? i+indexOffset : index;

      gl.bindAttribLocation(program, location, names[i]);
      gl.enableVertexAttribArray(location);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(location, size, type, normalize, stride, offset);

      buffers.push(buffer);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // TO DO Try putting these inside the loop
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tfbs[i]);
    buffers.forEach((b, i) => {
      gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, i, b);
    });

    gl.bindVertexArray(null);

    tfbBuffers.push(bufferRef);
  });

  return { vaos, tfbs, tfbBuffers };
};

export { createTransformFeedback };
