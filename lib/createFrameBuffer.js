const createFrameBuffer = (
  gl,
  {
    width,
    height,
    tiling = gl.CLAMP_TO_EDGE,
    type = gl.UNSIGNED_BYTE,
    format = gl.RGBA,
    internalFormat = gl.RGBA,
    data = null,
    singular = false,
    minFilter = gl.LINEAR,
    magFilter = minFilter,
    mips = false,
  } = {}
) => {
  // wtc-simplegl is WebGL2-only. texImage3D only exists on WebGL2 contexts,
  // and unlike instanceof this works for contexts from other frames.
  if (typeof gl.texImage3D !== "function") {
    throw new Error("createFrameBuffer: requires a WebGL2 context (canvas.getContext(\"webgl2\"))");
  }

  const createRendertarget = ({ w = width, h = height, pixels = null } = {}) => {
    // Only the draw binding is used and restored, so a separately bound read
    // framebuffer is left alone and later draws aren't redirected.
    const prevFramebuffer = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);
    const prevTexture = gl.getParameter(gl.TEXTURE_BINDING_2D);

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

    if (mips) gl.generateMipmap(gl.TEXTURE_2D);

    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, prevFramebuffer);
    gl.bindTexture(gl.TEXTURE_2D, prevTexture);

    return { fb, targetTexture };
  };
  const deleteRendertarget = (target) => {
    if (!target) return;
    gl.deleteFramebuffer(target.fb);
    gl.deleteTexture(target.targetTexture);
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
