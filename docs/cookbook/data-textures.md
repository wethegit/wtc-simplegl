# Lookups in a data texture

Send an array of numbers to a shader as a texture, update it every frame, and read exact values back with `texelFetch`. {.lead}

Uniform arrays are limited to a few hundred values, and their size is fixed in the shader. A texture can hold millions, and the shader can loop over as many as you tell it. Here 40 points move around, and the shader colours each pixel by its nearest point and draws lines where two cells meet.

<Example src="data-textures" :height="360" />

<<< @/examples/data-textures.js

## Packing the data

Each point is two floats, x and y, so the texture is `gl.RG` with `gl.FLOAT`: one texel per point, in a row.

```js
const points = new Float32Array(COUNT * 2)
const options = { width: COUNT, height: 1, format: gl.RG, type: gl.FLOAT }
const texture = createTexture(gl, { ...options, data: points })
```

`createTexture` picks the internal format, `gl.RG32F`, and leaves out mipmaps, which float textures can't have by default. Use `gl.RGBA` for four values per item, or `gl.RED` for one.

More than a few thousand items won't fit in one row; textures are limited to `gl.MAX_TEXTURE_SIZE` wide, at least 2048. Wrap them onto more rows, and work out the texel from the index in the shader:

```glsl
ivec2 texel = ivec2(i % 1024, i / 1024);
```

## Reading it

`texelFetch` takes whole texel coordinates and a mip level, and returns the stored value with no filtering or wrapping:

```glsl
vec2 point = texelFetch(u_points, ivec2(i, 0), 0).xy;
```

`texture()`, with coordinates from 0 to 1, would blend neighbouring texels unless the filter is `gl.NEAREST`. For data, `texelFetch` is clearer and always exact.

## Updating it

```js
updateTexture(gl, texture, points, options)
```

Pass the same `width`, `height`, `format` and `type` as when it was made. The size can change: upload more points with a bigger `width`, and update the count uniform to match.

Uploading a few thousand floats a frame is cheap. For data that's calculated from the last frame's data, it's usually better to do the calculation on the GPU, with [transform feedback](/core/transform-feedback) or [ping-pong framebuffers](/cookbook/ping-pong).

## See also

- [Textures](/core/textures#from-data)
- API: [createTexture](/api/functions/createTexture), [updateTexture](/api/functions/updateTexture)
