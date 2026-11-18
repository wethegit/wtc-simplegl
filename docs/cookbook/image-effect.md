# An image effect

Load an image, scale it to cover the canvas, and distort it around the pointer. {.lead}

The image is loaded with `loadTexture`, drawn with a full-screen triangle, and read in the fragment shader at offset coordinates: rings of ripples spread from the pointer, and the red, green and blue are each read a little further out, so the colours split where the ripples are strongest.

<Example src="image-effect" :height="400" />

<<< @/examples/image-effect.js

## Loading

`loadTexture` returns a promise. The example starts drawing once it resolves, and passes the effect's `signal`, so if the example is disposed of before the image arrives, no texture is made:

```js
loadTexture(gl, url, { flipY: true, signal })
  .then((texture) => (image = texture))
  .catch(() => {}) // aborted, or failed to load
```

`flipY` puts the top of the image at the top of the texture.

## Covering the canvas

Like `background-size: cover`, the image fills the canvas and is cropped on the sides that don't fit. Shrink the texture coordinates on the axis where the image is relatively too big:

```js
const cover = aspect > imageAspect ? [1, imageAspect / aspect] : [aspect / imageAspect, 1]
```

```glsl
vec2 uv = (v_uv - 0.5) * u_cover + 0.5;
```

## The distortion

```glsl
vec2 d = (v_uv - u_pointer) * vec2(u_aspect, 1.0);
float r = length(d);
vec2 offset = d / r * sin(r * 50.0 - u_time * 6.0) * 0.012 * smoothstep(0.35, 0.0, r);

float red = texture(u_image, uv + offset * 1.6).r;
float green = texture(u_image, uv + offset).g;
float blue = texture(u_image, uv + offset * 0.4).b;
```

The ripples push each pixel towards or away from the pointer. Scaling the offset differently for each channel is what splits the colours. Change `sin` for noise to make it shimmer, or drop the time term for a still lens.

## See also

- [Textures](/core/textures)
- [Pointer, time and resolution](/cookbook/pointer-uniforms)
