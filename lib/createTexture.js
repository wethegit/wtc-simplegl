import { defaultInternalFormat, canFilter, uploadTexture } from "./textureFormats.js";

/**
 * Creates a 2D texture from an image source (`img`: an image, canvas, video
 * or ImageBitmap that has already loaded), or from `data` of `width` x
 * `height` pixels: a typed array, or null for an empty texture.
 *
 * Float types (`gl.FLOAT`, `gl.HALF_FLOAT`) get a sized internal format, e.g.
 * RG + FLOAT -> RG32F. Mipmaps default on only for `gl.UNSIGNED_BYTE`
 * textures, and 32-bit float textures default to NEAREST filtering where
 * linear filtering of them isn't supported.
 *
 * `flipY` flips the image on upload, so row 0 of an image or canvas lands at
 * the bottom, where texture coordinate y = 0 is.
 *
 * @example
 * const glyphs = createTexture(gl, {
 *   data: new Float32Array(1024 * rows * 2), width: 1024, height: rows,
 *   format: gl.RG, type: gl.FLOAT,
 * });
 */
function createTexture(
  gl,
  {
    img,
    data,
    width,
    height,
    flipY = false,
    target = gl.TEXTURE_2D,
    type = gl.UNSIGNED_BYTE,
    format = gl.RGBA,
    internalFormat = defaultInternalFormat(gl, format, type, format),
    generateMips = type === gl.UNSIGNED_BYTE,
    minFilter = generateMips ? gl.LINEAR_MIPMAP_LINEAR : canFilter(gl, type) ? gl.LINEAR : gl.NEAREST,
    magFilter = canFilter(gl, type) ? gl.LINEAR : gl.NEAREST,
    wrapS = gl.CLAMP_TO_EDGE,
    wrapT = gl.CLAMP_TO_EDGE,
    level = 0,
  } = {}
) {
  // wtc-simplegl is WebGL2-only. texImage3D only exists on WebGL2 contexts,
  // and unlike instanceof this works for contexts from other frames.
  if (typeof gl.texImage3D !== "function") {
    throw new Error("createTexture: requires a WebGL2 context (canvas.getContext(\"webgl2\"))");
  }

  // texImage2D with one image only fills a plain 2D texture; cube maps and
  // 3D/array textures need per-face or texImage3D uploads.
  if (target !== gl.TEXTURE_2D) {
    throw new Error("createTexture: only `target: gl.TEXTURE_2D` is supported");
  }
  if (!img && !(width > 0 && height > 0)) {
    throw new Error(
      "createTexture: pass `img` (an image, canvas, video or ImageBitmap that has already loaded), or `width` and `height` with optional `data`"
    );
  }

  const texture = gl.createTexture();
  gl.bindTexture(target, texture);

  uploadTexture(gl, { img, data, width, height, level, internalFormat, format, type, flipY });

  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magFilter);
  gl.texParameteri(target, gl.TEXTURE_WRAP_S, wrapS);
  gl.texParameteri(target, gl.TEXTURE_WRAP_T, wrapT);

  if (generateMips) {
    gl.generateMipmap(target);
  }

  return texture;
}

export { createTexture };
