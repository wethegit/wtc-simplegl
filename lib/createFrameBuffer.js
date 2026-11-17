// Float textures need a sized internal format, e.g. RGBA + FLOAT -> RGBA32F.
const floatFormats = { RGBA: ["RGBA32F", "RGBA16F"], RG: ["RG32F", "RG16F"], RED: ["R32F", "R16F"] };
const defaultInternalFormat = (gl, format, type) => {
  const name = Object.keys(floatFormats).find((f) => gl[f] === format);
  if (name && type === gl.FLOAT) return gl[floatFormats[name][0]];
  if (name && type === gl.HALF_FLOAT) return gl[floatFormats[name][1]];
  return gl.RGBA;
};

/**
 * Creates a render target, or a pair (`read` and `write`) that `swap()` flips
 * for ping-pong effects. Each target is `{ fb, targetTexture, depthBuffer }`.
 *
 * `type: gl.FLOAT` or `gl.HALF_FLOAT` makes a float target; the internal
 * format and the extension needed to render to it are handled. 32-bit float
 * targets default to NEAREST filtering where linear filtering isn't supported.
 * `depth: true` adds a depth buffer so depth testing works when drawing into it.
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
    minFilter = type === gl.FLOAT && !gl.getExtension("OES_texture_float_linear") ? gl.NEAREST : gl.LINEAR,
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
  };

  return framebuffer;
};

export { createFrameBuffer };
