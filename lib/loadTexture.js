import { createTexture } from "./createTexture.js";

/**
 * Loads an image and resolves with a texture made from it. `options` are
 * passed to `createTexture`. Cross-origin images need CORS headers.
 *
 * @example
 * const texture = await loadTexture(gl, "noise.png", { wrapS: gl.REPEAT, wrapT: gl.REPEAT });
 */
const loadTexture = async (gl, url, options = {}) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  try {
    await img.decode();
  } catch {
    throw new Error(`loadTexture: couldn't load ${url}`);
  }
  return createTexture(gl, { ...options, img });
};

export { loadTexture };
