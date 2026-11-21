# Cookbook

Complete effects, each a working example you can take apart and adapt. {.lead}

Every recipe runs live on its page, with its source underneath. They're written to be copied: each is a module that sets up an effect in an element, draws a frame when asked, and frees everything when it's done, which is the same shape as a React effect or a component's mount and unmount.

- **[Feedback with ping-pong buffers](/cookbook/ping-pong).** Draw each frame on top of the last, for trails and smears, with a pair of float framebuffers.
- **[Pointer, time and resolution](/cookbook/pointer-uniforms).** The uniforms most effects start from, with the pointer in the same units as `gl_FragCoord`.
- **[An image effect](/cookbook/image-effect).** Load an image, scale it to cover the canvas, and ripple it around the pointer.
- **[Lookups in a data texture](/cookbook/data-textures).** Send an array of points to the shader as a float texture, and read it back with `texelFetch`.
- **[Video and live canvases](/cookbook/live-canvas).** Use a video, or a 2D canvas you draw on, as a texture that changes every frame.
- **[A React component](/cookbook/react).** Any of these, as a component that cleans up after itself.
