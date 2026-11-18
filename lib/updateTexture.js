import { defaultInternalFormat, uploadTexture } from "./textureFormats.js";

/**
 * Uploads new contents to a texture made by `createTexture`: an image source,
 * such as the current frame of a video or a canvas that has been drawn to, or
 * a typed array with `width` and `height` (which may differ from before).
 * Mipmaps are regenerated if the texture's filtering uses them.
 *
 * Pass the same `format`, `type` and `flipY` the texture was made with if they
 * weren't the defaults.
 */
const updateTexture = (
  gl,
  texture,
  source,
  {
    width,
    height,
    flipY = false,
    type = gl.UNSIGNED_BYTE,
    format = gl.RGBA,
    internalFormat = defaultInternalFormat(gl, format, type, format),
    level = 0,
  } = {}
) => {
  const isData = source == null || ArrayBuffer.isView(source);
  if (isData && !(width > 0 && height > 0)) {
    throw new Error("updateTexture: typed array data needs `width` and `height`");
  }

  gl.bindTexture(gl.TEXTURE_2D, texture);
  uploadTexture(gl, {
    img: isData ? null : source,
    data: isData ? source : null,
    width,
    height,
    level,
    internalFormat,
    format,
    type,
    flipY,
  });

  const minFilter = gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER);
  if (minFilter !== gl.NEAREST && minFilter !== gl.LINEAR) gl.generateMipmap(gl.TEXTURE_2D);

  return texture;
};

export { updateTexture };
