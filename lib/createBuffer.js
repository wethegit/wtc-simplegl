/**
 * Creates a buffer and uploads `data` to it. The buffer is left bound to
 * `type`.
 *
 * @param {WebGL2RenderingContext} gl The WebGL2 context.
 * @param {ArrayBufferView} data The contents.
 * @param {number} [usage=gl.STATIC_DRAW] How it will be used, e.g. `gl.DYNAMIC_DRAW`. Defaults to `gl.STATIC_DRAW`.
 * @param {number} [type=gl.ARRAY_BUFFER] The target to bind it to. Defaults to `gl.ARRAY_BUFFER`.
 * @returns {WebGLBuffer}
 *
 * @category Lower level
 */
const createBuffer = (
  gl,
  data,
  usage = gl.STATIC_DRAW,
  type = gl.ARRAY_BUFFER
) => {
  const buffer = gl.createBuffer();
  gl.bindBuffer(type, buffer);
  gl.bufferData(type, data, usage);
  return buffer;
};

export { createBuffer };
