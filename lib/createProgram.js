import { compileShader } from "./compileShader.js";

/**
 * Compiles both shaders and attaches them to a new program. The program is
 * returned unlinked so attribute locations can be bound first; call
 * `linkProgram` before using it.
 */
const createProgram = (gl, vertexSrc, fragmentSrc, attribs) => {
  // wtc-simplegl is WebGL2-only. texImage3D only exists on WebGL2 contexts,
  // and unlike instanceof this works for contexts from other frames.
  if (typeof gl?.texImage3D !== "function") {
    throw new Error('createProgram: requires a WebGL2 context (canvas.getContext("webgl2"))');
  }
  if (typeof vertexSrc !== "string" || typeof fragmentSrc !== "string") {
    throw new Error("createProgram: vertex and fragment shader sources are required (`vert` and `frag` in createRenderer)");
  }

  const v = compileShader(gl, vertexSrc, gl.VERTEX_SHADER);
  const f = compileShader(gl, fragmentSrc, gl.FRAGMENT_SHADER);

  const program = gl.createProgram();
  gl.attachShader(program, v);
  gl.attachShader(program, f);

  if (attribs) {
    const varyings = [];
    for (let i in attribs)
      if (attribs[i].component == "transformFeedback")
        varyings.push(attribs[i].varying);
    if (varyings.length)
      gl.transformFeedbackVaryings(program, varyings, gl.SEPARATE_ATTRIBS);
  }

  return program;
};

/**
 * Links a program created by `createProgram`. Throws with the link log on
 * failure. The shaders are freed once the program has linked.
 */
const linkProgram = (gl, program) => {
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = (gl.getProgramInfoLog(program) || "").replace(/\0/g, "").trim();
    gl.deleteProgram(program);
    throw new Error(`Program failed to link:\n${log}`);
  }

  for (const shader of gl.getAttachedShaders(program)) {
    gl.detachShader(program, shader);
    gl.deleteShader(shader);
  }

  return program;
};

export { createProgram, linkProgram };
