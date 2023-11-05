import { createBuffer } from "./createBuffer.js";

const createVertexArray = (gl, program, attributes, indexOffset=0) => {
  if (!attributes) return null;

  const vao = gl.createVertexArray();
  const names = Object.keys(attributes);

  gl.bindVertexArray(vao);

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
    } = attributes[names[i]];

    if (data && !buffer) buffer = createBuffer(gl, data, usage, buffertype);

    // const location = gl.getAttribLocation(program, names[i]);
    const location = isNaN(index) ? i+indexOffset : index;

    gl.bindAttribLocation(program, location, names[i]);
    gl.enableVertexAttribArray(location);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(location, size, type, normalize, stride, offset);
  }
  
  gl.bindVertexArray(null);

  return vao;
};

export { createVertexArray };
