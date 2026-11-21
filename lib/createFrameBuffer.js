import { defaultInternalFormat, canFilter } from "./textureFormats.js";

/**
 * @typedef {object} FrameBufferOptions Options for `createFrameBuffer`.
 * @property {number} width Width in pixels.
 * @property {number} height Height in pixels.
 * @property {number} [type=gl.UNSIGNED_BYTE] `gl.FLOAT` or `gl.HALF_FLOAT` for a float target. Defaults to `gl.UNSIGNED_BYTE`.
 * @property {number} [format=gl.RGBA] The texture format. Defaults to `gl.RGBA`.
 * @property {number} [internalFormat] The internal format. Picked for float types, e.g. `gl.RGBA16F`
 *   for `gl.HALF_FLOAT`; `gl.RGBA` otherwise.
 * @property {ArrayBufferView | null} [data=null] Initial pixels. Defaults to `null`.
 * @property {boolean} [singular=false] Only make `read`, with no `write` to swap with. Defaults to `false`.
 * @property {boolean} [depth=false] Add a depth buffer, for depth testing while drawing into it. Defaults to `false`.
 * @property {number} [minFilter] The minification filter. Defaults to `gl.LINEAR` (`gl.NEAREST` for
 *   32-bit float where linear filtering isn't supported).
 * @property {number} [magFilter=minFilter] The magnification filter. Defaults to `minFilter`.
 * @property {number} [tiling=gl.CLAMP_TO_EDGE] The wrap mode in both directions. Defaults to `gl.CLAMP_TO_EDGE`.
 * @property {boolean} [mips=false] Generate mipmaps. Defaults to `false`.
 */

/**
 * @typedef {object} RenderTarget A framebuffer and what it draws into.
 * @property {WebGLFramebuffer} fb Bind this to draw into the target.
 * @property {WebGLTexture} targetTexture The colour texture. A `RenderTarget` can also be passed
 *   to a renderer's `bindUniform` in its place.
 * @property {WebGLRenderbuffer | null} depthBuffer The depth buffer, with `depth: true`.
 */

/**
 * @typedef {object} FrameBuffer Render targets made by `createFrameBuffer`.
 * @property {number} width Width in pixels.
 * @property {number} height Height in pixels.
 * @property {RenderTarget} read The target to read from.
 * @property {RenderTarget | null} write The target to draw into; null with `singular`.
 * @property {() => void} swap Swaps `read` and `write`, after drawing into `write`.
 * @property {(width: number, height: number) => void} resize Replaces the targets with empty ones of
 *   the new size.
 * @property {() => void} delete Frees the framebuffers, their textures and depth buffers.
 */

/**
 * Creates a render target, or a pair (`read` and `write`) that `swap()` flips
 * for ping-pong effects.
 *
 * `type: gl.FLOAT` or `gl.HALF_FLOAT` makes a float target; the internal
 * format and the extension needed to render to it are handled. Throws if the
 * framebuffer is incomplete, naming the reason.
 *
 * @example
 * const feedback = createFrameBuffer(gl, { width: 512, height: 512, type: gl.HALF_FLOAT });
 * gl.bindFramebuffer(gl.FRAMEBUFFER, feedback.write.fb);
 * step.setUniforms({ u_previous: feedback.read });
 * step.render({ width: 512, height: 512 });
 * gl.bindFramebuffer(gl.FRAMEBUFFER, null);
 * feedback.swap();
 *
 * @param {WebGL2RenderingContext} gl The WebGL2 context.
 * @param {FrameBufferOptions} options See `FrameBufferOptions`.
 * @returns {FrameBuffer}
 *
 * @category Framebuffers
 */
const createFrameBuffer = (
  gl,
  {
    width,
    height,
    tiling = gl.CLAMP_TO_EDGE,
    type = gl.UNSIGNED_BYTE,
    format = gl.RGBA,
    internalFormat = defaultInternalFormat(gl, format, type),
    data = null,
    singular = false,
    depth = false,
    minFilter = canFilter(gl, type) ? gl.LINEAR : gl.NEAREST,
    magFilter = minFilter,
    mips = false,
  } = {}
) => {
  // wtc-simplegl is WebGL2-only. texImage3D only exists on WebGL2 contexts,
  // and unlike instanceof this works for contexts from other frames.
  if (typeof gl.texImage3D !== "function") {
    throw new Error("createFrameBuffer: requires a WebGL2 context (canvas.getContext(\"webgl2\"))");
  }

  // Rendering to float textures needs an extension, even in WebGL2.
  if (
    (type === gl.FLOAT || type === gl.HALF_FLOAT) &&
    !gl.getExtension("EXT_color_buffer_float") &&
    !(type === gl.HALF_FLOAT && gl.getExtension("EXT_color_buffer_half_float"))
  ) {
    throw new Error("createFrameBuffer: this device can't render to float textures (EXT_color_buffer_float)");
  }

  const deleteRendertarget = (target) => {
    if (!target) return;
    gl.deleteFramebuffer(target.fb);
    gl.deleteTexture(target.targetTexture);
    if (target.depthBuffer) gl.deleteRenderbuffer(target.depthBuffer);
  };
  const createRendertarget = ({ w = width, h = height, pixels = null } = {}) => {
    // Only the draw binding is used and restored, so a separately bound read
    // framebuffer is left alone and later draws aren't redirected.
    const prevFramebuffer = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);
    const prevTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);
    const prevRenderbuffer = gl.getParameter(gl.RENDERBUFFER_BINDING);

    const targetTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      internalFormat,
      w,
      h,
      0,
      format,
      type,
      pixels
    );

    // set the filtering so we don't need mips
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, tiling);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, tiling);

    // Create and bind the framebuffer
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, fb);

    // attach the texture as the first color attachment
    gl.framebufferTexture2D(
      gl.DRAW_FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      targetTexture,
      0
    );

    let depthBuffer = null;
    if (depth) {
      depthBuffer = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
      gl.framebufferRenderbuffer(gl.DRAW_FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
    }

    if (mips) gl.generateMipmap(gl.TEXTURE_2D);

    const status = gl.checkFramebufferStatus(gl.DRAW_FRAMEBUFFER);

    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, prevFramebuffer);
    gl.bindTexture(gl.TEXTURE_2D, prevTexture);
    gl.bindRenderbuffer(gl.RENDERBUFFER, prevRenderbuffer);

    const target = { fb, targetTexture, depthBuffer };
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      deleteRendertarget(target);
      const name = Object.keys(Object.getPrototypeOf(gl)).find((k) => k.startsWith("FRAMEBUFFER_") && gl[k] === status);
      throw new Error(`createFrameBuffer: framebuffer is incomplete (${name ?? status}). Check the format, internalFormat and type combination.`);
    }
    return target;
  };
  const framebuffer = {
    width,
    height,
    read: createRendertarget({ w: width, h: height, pixels: data }),
    write: singular
      ? null
      : createRendertarget({ w: width, h: height, pixels: data }),
    // Resized targets start empty: the initial `data` only fits the original size.
    resize(width, height) {
      deleteRendertarget(this.read);
      deleteRendertarget(this.write);
      this.width = width;
      this.height = height;
      this.read = createRendertarget({ w: width, h: height });
      this.write = singular ? null : createRendertarget({ w: width, h: height });
    },
    swap() {
      if (singular) return;
      const oldread = this.read;
      this.read = this.write;
      this.write = oldread;
    },
    /** Frees the framebuffers, their textures and depth buffers. */
    delete() {
      deleteRendertarget(this.read);
      deleteRendertarget(this.write);
      this.read = this.write = null;
    },
  };

  return framebuffer;
};

export { createFrameBuffer };
