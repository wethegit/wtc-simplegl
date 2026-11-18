import { createTexture } from "./createTexture.js";

/**
 * Loads an image and resolves with a texture made from it. `options` are
 * passed to `createTexture`. Cross-origin images need CORS headers.
 *
 * Pass `signal` to give up: if it's aborted before the image has loaded, no
 * texture is made and the promise rejects with the signal's reason.
 *
 * @example
 * const texture = await loadTexture(gl, "noise.png", { wrapS: gl.REPEAT, wrapT: gl.REPEAT });
 */
const loadTexture = async (gl, url, { signal, ...options } = {}) => {
  signal?.throwIfAborted();
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  try {
    await img.decode();
  } catch {
    signal?.throwIfAborted();
    throw new Error(`loadTexture: couldn't load ${url}`);
  }
  signal?.throwIfAborted();
  return createTexture(gl, { ...options, img });
};

export { loadTexture };
