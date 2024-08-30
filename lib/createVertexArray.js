import { createBuffer } from "./createBuffer.js";

const filterByComponent = (o, c) => {
  return Object.entries(o).reduce((acc, [key, value]) => {
    if (value.component == c) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

const runBindings = (gl, program, attributes, indexOffset, hasTFBs = false) => {
  let vaos, tfbs, tfbBuffers;
  if(hasTFBs) {
    vaos = [gl.createVertexArray(), gl.createVertexArray()];
    tfbs = [gl.createTransformFeedback(), gl.createTransformFeedback()];
    tfbBuffers = [];
  } else {
    vaos = [gl.createVertexArray()];
  }
  
  const names = Object.keys(attributes);
  
  vaos.forEach((vao, i) => {
    gl.bindVertexArray(vao);

    // Used only in transform feedbacks
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
        index = null,
        component = 'attribute'
      } = attributes[names[i]];
  
      if (data && !buffer) buffer = createBuffer(gl, data, usage, buffertype);
      
      if(component == 'transformFeedback') bufferRef[names[i]] = { i, buffer };
  
      // const location = gl.getAttribLocation(program, names[i]);
      const location = isNaN(index)||index===null ? i+indexOffset : index;

      gl.bindAttribLocation(program, location, names[i]);
      gl.enableVertexAttribArray(location);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(location, size, type, normalize, stride, offset);
      
      if(component == 'transformFeedback') buffers.push(buffer);
    }

    if(hasTFBs) {
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
  
      // TO DO Try putting these inside the loop
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tfbs[i]);
      buffers.forEach((b, i) => {
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, i, b);
      });
  
      gl.bindVertexArray(null);
  
      tfbBuffers.push(bufferRef);
    }
  });
  return { vaos, tfbs, tfbBuffers, hasTFBs };
}

const createVertexArray = (gl, program, attributes, indexOffset=0) => {
  if (!attributes) return null;

  const tfbs = filterByComponent(attributes, 'transformFeedback');

  const hasTFBs = Object.keys(tfbs).length > 0;

  const bindings = runBindings(gl, program, attributes, indexOffset, hasTFBs);

  return bindings;
  
};

export { createVertexArray };
