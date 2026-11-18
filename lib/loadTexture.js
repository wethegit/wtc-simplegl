import { createTexture } from "./createTexture.js";

/**
 * @typedef {object} LoadSignal The `signal` option of `loadTexture`.
 * @property {AbortSignal} [signal] Gives up when aborted: no texture is made, and the promise
 *   rejects with the signal's reason.
 */

/**
 * @typedef {import("./createTexture.js").TextureOptions & LoadSignal} LoadTextureOptions
 *   Options for `loadTexture`: `createTexture`'s options (`img` comes from the URL), and a `signal`.
 */

/**
 * Loads an image and resolves with a texture made from it. `options` are
 * passed to `createTexture`. Cross-origin images need CORS headers.
 *
 * Pass `signal` to give up: if it's aborted before the image has loaded, no
 * texture is made and the promise rejects with the signal's reason.
 *
 * @example
 * const texture = await loadTexture(gl, "noise.png", { wrapS: gl.REPEAT, wrapT: gl.REPEAT });
 *
 * @param {WebGL2RenderingContext} gl The WebGL2 context.
 * @param {string} url
 * @param {LoadTextureOptions} [options] See `LoadTextureOptions`.
 * @returns {Promise<WebGLTexture>}
 *
 * @category Textures
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
