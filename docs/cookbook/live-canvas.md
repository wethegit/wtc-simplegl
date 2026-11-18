# Video and live canvases

Use something that changes every frame, such as a video or a 2D canvas you draw on, as a texture. {.lead}

`updateTexture` uploads the current contents of an image source into an existing texture. Call it each frame and the texture follows the source. The example draws moving shapes and a timer on a 2D canvas, then shows it through a shader that curves it like an old screen.

<Example src="live-canvas" :height="360" />

<<< @/examples/live-canvas.js

## A 2D canvas

Make the texture once, then upload into it after each redraw:

```js
const texture = createTexture(gl, { img: screen, flipY: true, generateMips: false })

// Each frame
draw(time)
updateTexture(gl, texture, screen, { flipY: true })
```

`generateMips: false` skips making mipmaps on every upload, which you don't need if the texture isn't drawn much smaller than it is. Pass the same `flipY` to both.

Only upload when the canvas has changed. A timer that ticks once a second needs one upload a second, not sixty.

## A video

A `<video>` works the same way. Wait until it has a frame, then upload every frame while it plays:

```js
const video = document.createElement('video')
video.src = '/clip.mp4'
video.muted = true // needed to autoplay
video.loop = true
video.playsInline = true
await video.play()

const texture = createTexture(gl, { img: video, flipY: true, generateMips: false })

loop(() => {
  updateTexture(gl, texture, video, { flipY: true })
  tv.bindVAOs()
  tv.setUniforms({ u_screen: texture })
  tv.render()
})
```

Videos from another origin need CORS headers and `video.crossOrigin = 'anonymous'`, or the browser refuses to upload them.

To upload only when there's a new frame, rather than every frame, use `video.requestVideoFrameCallback` where it's available.

## See also

- [Textures](/core/textures#updating)
- API: [updateTexture](/api/functions/updateTexture)
