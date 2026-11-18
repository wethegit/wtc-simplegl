# Textures

Bring images, canvases, video and arrays of numbers into a shader. {.lead}

A texture is an image on the GPU that shaders sample. `createTexture` makes one from anything WebGL can upload: an image or `ImageBitmap` that has loaded, a canvas, a video, or a typed array of pixels. Pass it to a renderer like any other uniform.

<Example src="textures" :height="320" />

<<< @/examples/textures.js

## From an image

`createTexture` needs an image that has already loaded. `loadTexture` loads one from a URL and makes the texture:

```js
import { loadTexture } from 'wtc-simplegl'

const photo = await loadTexture(gl, '/images/photo.jpg', { flipY: true })
```

Images from another origin need CORS headers. `loadTexture` asks for them (`crossOrigin = "anonymous"`), and rejects with the URL if the image can't load.

## Which way up

Texture coordinates start at the bottom: `y = 0` is the bottom row. Images and canvases start at the top. `flipY: true` flips them on upload, so the top of the image is at the top of the texture. Use it for images you'll show the right way up; leave it off for data, and for textures you'll only ever read in shader coordinates.

## From data

Pass `width`, `height` and `data`, a typed array, instead of `img`. This is how to get lookup tables, positions and other numbers into a shader:

```js
const positions = createTexture(gl, {
  data: new Float32Array(1024 * rows * 2),
  width: 1024,
  height: rows,
  format: gl.RG,
  type: gl.FLOAT
})
```

Leave out `data` for an empty texture. Float types (`gl.FLOAT` and `gl.HALF_FLOAT`) get the sized internal format they need, such as `gl.RG32F` here, and don't make mipmaps. Rows don't need to be a multiple of 4 bytes.

For exact values, read data textures with `texelFetch` in the shader, which takes whole texel coordinates and ignores filtering:

```glsl
vec2 p = texelFetch(u_positions, ivec2(i % 1024, i / 1024), 0).xy;
```

## Options

| Option | Default | |
|---|---|---|
| `flipY` | `false` | Flip on upload. |
| `wrapS`, `wrapT` | `gl.CLAMP_TO_EDGE` | `gl.REPEAT` to tile, `gl.MIRRORED_REPEAT` to tile mirrored. |
| `minFilter` | trilinear with mipmaps, else `gl.LINEAR` | `gl.NEAREST` for crisp pixels. |
| `magFilter` | `gl.LINEAR` | `gl.NEAREST` for crisp pixels when scaled up. |
| `generateMips` | `true` for 8-bit textures | Mipmaps keep a texture smooth when it's drawn small. |
| `format`, `type`, `internalFormat` | `gl.RGBA`, `gl.UNSIGNED_BYTE` | For data, and float textures. |

32-bit float textures can't be filtered linearly on every device, so they default to `gl.NEAREST` where they can't.

## Updating

`updateTexture` uploads new contents into an existing texture: the current frame of a video, a canvas you've drawn on, or new data. Mipmaps are made again if the texture uses them:

```js
import { updateTexture } from 'wtc-simplegl'

// Each frame
updateTexture(gl, texture, video, { flipY: true })
```

Pass the same `flipY`, `format` and `type` as when it was made. For data, pass `width` and `height`; they can differ from before.

## In a shader

Every sampler uniform gets its own texture unit when the renderer is made. Pass the texture to `setUniforms` and it's bound to that unit whenever the renderer draws:

```js
renderer.setUniforms({ u_image: photo, u_noise: noise })
```

Because each renderer binds its own textures as it draws, renderers don't interfere with each other's units. A [framebuffer target](/core/framebuffers) can be passed in place of a texture, as can an array of textures for a sampler array.

To bind textures yourself, set the sampler to a unit number instead, and bind it with `gl.activeTexture` and `gl.bindTexture`.

## Freeing them

Textures are plain `WebGLTexture`s, so free them with `gl.deleteTexture(texture)`.

## See also

- [Framebuffers](/core/framebuffers), to draw into a texture
- API: [createTexture](/api/functions/createTexture), [loadTexture](/api/functions/loadTexture), [updateTexture](/api/functions/updateTexture), [TextureOptions](/api/interfaces/TextureOptions)
