/**
 * @typedef {object} ActiveUniform One of a program's uniforms.
 * @property {WebGLUniformLocation} location Its location.
 * @property {number} type Its type, e.g. `gl.FLOAT_VEC3` or `gl.SAMPLER_2D`.
 * @property {number} size Its length if it's an array, otherwise 1.
 * @property {number} [unit] For a sampler in a renderer: the first texture unit it reads.
 */

/**
 * Returns every active uniform of a linked program, by name. Array uniforms
 * are reported by WebGL as `name[0]`; they're available under both `name[0]`
 * and the plain `name`. Members of uniform blocks are left out.
 *
 * @param {WebGL2RenderingContext} gl The WebGL2 context.
 * @param {WebGLProgram} program
 * @returns {Record<string, ActiveUniform>}
 *
 * @category Lower level
 */
const getActiveUniforms = (gl, program) => {
  const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  const uniforms = {};
  for (let i = 0; i < numUniforms; i++) {
    const { name, type, size } = gl.getActiveUniform(program, i);
    const location = gl.getUniformLocation(program, name);
    // Members of uniform blocks have no location and can't be set this way.
    if (location === null) continue;
    uniforms[name] = { location, type, size };
    if (name.endsWith("[0]")) uniforms[name.slice(0, -3)] = uniforms[name];
  }

  return uniforms;
};

export { getActiveUniforms };
