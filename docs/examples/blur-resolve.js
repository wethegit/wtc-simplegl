import { createBlurResolve } from "./blur-resolve/blurResolve.js";

// The text comes into focus from left to right, shedding particles as it
// sharpens. Move the pointer through it to blow it out of focus again, and
// click to replay. The effect lives in ./blur-resolve/.
const params = {
  text: "Coming into focus",
  colour: "#eef0f7", // set from the theme each frame
  // intro
  duration: 2.6, // seconds for the front to cross the text
  spread: 0.5, // blur ramp length, × text width
  maxBlur: 0.55, // Gaussian sigma at full blur, × font size
  drift: 0.12, // unresolved letters sit this far right, × font size
  // pointer
  radius: 90, // CSS px
  strength: 1,
  push: 0.44, // × font size
  resolve: 0.935, // field kept per frame; higher resolves slower
  // particles
  particleColour: "#eef0f7", // the text's colour, set with it each frame
  count: 4500,
  emit: 0.2, // spawn chance per frame for a glyph pixel mid-resolve
  spawnAt: 0.05, // blur level the intro spawns at: 0 = just resolved, 1 = fully blurred
  spawnWidth: 0.3, // how wide a band of the resolve spawns
  size: 0.5,
  speed: 1,
  life: 113, // frames at 60Hz
  swirl: 0.96,
};

const font = {
  family: "IBM Plex Mono", // the docs' own font, already loaded
  weight: 600,
  uppercase: true,
  tracking: 0.02, // em
  leading: 1.0,
  fit: 0.86, // × canvas width
};

export default function (container) {
  const canvas = document.createElement("canvas");
  canvas.style.cursor = "crosshair";
  canvas.style.touchAction = "none";
  container.appendChild(canvas);

  const effect = createBlurResolve({ canvas, params, font });
  const dark = () => document.documentElement.classList.contains("dark");

  return {
    frame(time, delta) {
      // Light text and particles on the dark theme, dark on the light one
      params.colour = params.particleColour = dark() ? "#eef0f7" : "#0b0d12";
      effect.frame(time, delta);
    },
    dispose() {
      effect.destroy();
      canvas
        .getContext("webgl2")
        ?.getExtension("WEBGL_lose_context")
        ?.loseContext();
      canvas.remove();
    },
  };
}
