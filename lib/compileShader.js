// Shows the source lines named in a log like "ERROR: 0:12: 'x' : undeclared
// identifier", with a little context, marking the failing lines with ">".
const excerpt = (source, log) => {
  const failing = new Set([...log.matchAll(/ERROR: \d+:(\d+):/g)].map((m) => +m[1]));
  return source
    .split("\n")
    .map((line, i) => [i + 1, line])
    .filter(([n]) => [...failing].some((f) => Math.abs(f - n) <= 2))
    .map(([n, line]) => `${failing.has(n) ? ">" : " "}${String(n).padStart(4)} | ${line}`)
    .join("\n");
};

/**
 * Compiles a shader. On failure throws an error naming the shader type, with
 * the compiler log and the source lines it points at.
 *
 * @param {WebGL2RenderingContext} gl The WebGL2 context.
 * @param {string} source GLSL ES 3.00 source.
 * @param {number} type `gl.VERTEX_SHADER` or `gl.FRAGMENT_SHADER`.
 * @returns {WebGLShader}
 *
 * @category Lower level
 */
const compileShader = (gl, source, type) => {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);

  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = (gl.getShaderInfoLog(shader) || "").replace(/\0/g, "").trim();
    gl.deleteShader(shader);
    if (gl.isContextLost()) throw new Error("compileShader: the WebGL context was lost");

    const kind = type === gl.VERTEX_SHADER ? "Vertex" : "Fragment";
    const hint = /^\s*#version 300 es/.test(source)
      ? ""
      : '\n\nWebGL2 shaders need "#version 300 es" as their very first line.';
    throw new Error(`${kind} shader failed to compile:\n${log}\n\n${excerpt(source, log)}${hint}`);
  }

  return shader;
};

export { compileShader };
