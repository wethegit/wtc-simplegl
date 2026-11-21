// Float textures need a sized internal format, e.g. RGBA + FLOAT -> RGBA32F.
const floatFormats = { RGBA: ["RGBA32F", "RGBA16F"], RG: ["RG32F", "RG16F"], RED: ["R32F", "R16F"] };

/** The internal format to use for `format` and `type` when none is given. */
const defaultInternalFormat = (gl, format, type, fallback = gl.RGBA) => {
  const name = Object.keys(floatFormats).find((f) => gl[f] === format);
  if (name && type === gl.FLOAT) return gl[floatFormats[name][0]];
  if (name && type === gl.HALF_FLOAT) return gl[floatFormats[name][1]];
  return fallback;
};

/** Whether textures of `type` can use LINEAR filtering. 32-bit float needs an extension. */
const canFilter = (gl, type) => type !== gl.FLOAT || !!gl.getExtension("OES_texture_float_linear");

/**
 * Uploads an image source, or `data` (a typed array or null) of `width` x
 * `height`, to the TEXTURE_2D bound now. Pixel store state it changes is
 * restored afterwards.
 */
const uploadTexture = (gl, { img, data, width, height, level, internalFormat, format, type, flipY }) => {
  const prevFlip = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
  const prevAlign = gl.getParameter(gl.UNPACK_ALIGNMENT);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
  if (img) {
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, format, type, img);
  } else {
    // Rows of typed array data are tightly packed.
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, 0, format, type, data ?? null);
  }
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, prevFlip);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, prevAlign);
};

export { defaultInternalFormat, canFilter, uploadTexture };
