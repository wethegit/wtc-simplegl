// TO DO add support for data textures and preload textures, currently this only works for preloaded images and canvases
function createTexture(
  gl,
  {
    img,
    generateMips = true,
    target = gl.TEXTURE_2D,
    type = gl.UNSIGNED_BYTE,
    format = gl.RGBA,
    internalFormat = format,
    minFilter = generateMips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
    magFilter = gl.LINEAR,
    wrapS = gl.CLAMP_TO_EDGE,
    wrapT = gl.CLAMP_TO_EDGE,
    level = 0,
  } = {}
) {
  if (!img) {
    throw new Error(
      "createTexture: `img` is required (an image, canvas, video or ImageBitmap that has already loaded)"
    );
  }

  const texture = gl.createTexture();
  gl.bindTexture(target, texture);

  gl.texImage2D(target, level, internalFormat, format, type, img);

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
