/**
 * Uploads new contents to a texture made by `createTexture`, e.g. the current
 * frame of a video or a canvas that has been drawn to. Mipmaps are regenerated
 * if the texture's filtering uses them.
 *
 * Pass the same `format`, `internalFormat` and `type` the texture was made with
 * if they weren't the defaults.
 */
const updateTexture = (
  gl,
  texture,
  img,
  { type = gl.UNSIGNED_BYTE, format = gl.RGBA, internalFormat = format, level = 0 } = {}
) => {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, format, type, img);

  const minFilter = gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER);
  if (minFilter !== gl.NEAREST && minFilter !== gl.LINEAR) gl.generateMipmap(gl.TEXTURE_2D);

  return texture;
};

export { updateTexture };
