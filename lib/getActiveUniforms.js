/**
 * Returns `{ [name]: { location, type, size } }` for every active uniform.
 * Array uniforms are reported by WebGL as `name[0]`; they're available under
 * both `name[0]` and the plain `name`.
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
