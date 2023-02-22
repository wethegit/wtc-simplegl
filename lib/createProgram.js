import { compileShader } from "./compileShader.js";

const createProgram = (gl, vertexSrc, fragmentSrc, tfbs) => {
  const v = compileShader(gl, vertexSrc, gl.VERTEX_SHADER);
  const f = compileShader(gl, fragmentSrc, gl.FRAGMENT_SHADER);

  const program = gl.createProgram();
  gl.attachShader(program, v);
  gl.attachShader(program, f);

  if (tfbs) {
    const varyings = [];
    for (let i in tfbs) varyings.push(tfbs[i].varying);
    gl.transformFeedbackVaryings(program, varyings, gl.SEPARATE_ATTRIBS);
  }

  gl.linkProgram(program);

  // Error logging
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const progLog = gl.getProgramInfoLog(program);
    throw new Error(progLog);
  }

  return program;
};

export { createProgram };
