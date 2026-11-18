import { createContext, createRenderer, createTexture, updateTexture } from "wtc-simplegl";
import { drawText, GLYPH_TEXTURE_WIDTH } from "./text.js";
import { createBlurPyramid } from "./blur.js";
import { createField } from "./field.js";
import { createParticles } from "./particles.js";
import { screenVertex, triangle } from "./shaders/common.js";
import { compositeFragment, LEVELS } from "./shaders/screen.js";

const SIM_FRAME = 1 / 60;
const MAX_SIM_STEP = 3;
const START_DELAY = 0.3;

export const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/**
 * The whole effect on `canvas`, which should be sized with CSS. Call
 * `frame(time, delta)` every frame. `params` is read every frame, so changing
 * it takes effect immediately; call the returned functions for changes that
 * need rebuilding. `destroy()` frees everything, so this can live in a React
 * effect.
 */
export function createBlurResolve({ canvas, params, font }) {
  const ac = new AbortController();
  const { signal } = ac;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  let ready = false; // GL objects created
  let fontReady = false;
  let dpr = 1;

  const gl = createContext({
    canvas,
    signal,
    // See-through: the text and particles are drawn premultiplied
    attributes: { alpha: true, premultipliedAlpha: true, depth: false, antialias: false },
    onResize: (width, height) => {
      dpr = width / Math.max(1, canvas.clientWidth);
      if (ready) resize(width, height);
    },
  });

  // --- shared uniforms (device px throughout)
  const shared = {
    u_canvas: [gl.canvas.width, gl.canvas.height],
    u_front: 0,
    u_spread: 1,
    u_drift: 0,
    u_field: null,
    u_time: 0,
    u_dpr: dpr,
  };
  const composite = { u_maxBlur: 1, u_push: 0, u_fade: 0, levels: [] };
  const sim = { u_delta: 1, u_frame: 0, u_glyphCount: 0 };

  // --- text texture + glyph positions + blur pyramid
  // Filled with the text canvas once the font is in.
  const textTexture = createTexture(gl, { width: 1, height: 1, generateMips: false });
  const glyphTexture = createTexture(gl, {
    data: new Float32Array(GLYPH_TEXTURE_WIDTH * 2),
    width: GLYPH_TEXTURE_WIDTH,
    height: 1,
    format: gl.RG,
    type: gl.FLOAT,
    minFilter: gl.NEAREST,
    magFilter: gl.NEAREST,
  });
  const pyramid = createBlurPyramid(gl);
  const field = createField(gl);
  const compositeRenderer = createRenderer(gl, {
    vert: screenVertex,
    frag: compositeFragment,
    attributes: triangle,
    count: 3,
  });
  let particles = createParticles(gl, params.count);
  ready = true;

  // --- layout
  let layout = { x0: 0, x1: 1, fontSize: 100 };

  function rebuildText() {
    const { width, height } = gl.canvas;
    const t = drawText(params.text, width, height, font);
    layout = t;

    updateTexture(gl, textTexture, t.canvas, { flipY: true });
    updateTexture(gl, glyphTexture, t.glyphs, {
      width: GLYPH_TEXTURE_WIDTH,
      height: t.glyphRows,
      format: gl.RG,
      type: gl.FLOAT,
    });
    sim.u_glyphCount = t.glyphCount;

    composite.levels = pyramid.build(textTexture, width, height);
    applyLayoutParams();
  }

  function applyLayoutParams() {
    const width = layout.x1 - layout.x0;
    shared.u_spread = Math.max(1, width * params.spread);
    shared.u_drift = layout.fontSize * params.drift;
    composite.u_maxBlur = layout.fontSize * params.maxBlur;
    composite.u_push = layout.fontSize * params.push;
  }

  function resize(width, height) {
    shared.u_canvas = [width, height];
    shared.u_dpr = dpr;
    field.resize(width, height);
    if (fontReady) rebuildText();
  }
  resize(gl.canvas.width, gl.canvas.height);

  // --- intro timeline
  let introTime = -START_DELAY;
  function replay() {
    introTime = reducedMotion.matches ? Infinity : -START_DELAY;
  }

  function updateFront() {
    const t = Math.min(Math.max(introTime / params.duration, 0), 1);
    const eased = 1 - Math.pow(1 - t, 1.6);
    const { x0, x1 } = layout;
    // From "everything blurred" to "everything resolved"
    shared.u_front = x0 - shared.u_spread + (x1 - (x0 - shared.u_spread)) * eased;
    composite.u_fade = reducedMotion.matches ? 1 : Math.min(Math.max(introTime / 0.4, 0), 1);
  }

  // --- pointer
  const pointer = { x: 0, y: 0, px: 0, py: 0, active: false, fresh: true };
  function onPointer(e) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = (e.clientX - rect.left) * dpr;
    pointer.y = (rect.bottom - e.clientY) * dpr;
    if (pointer.fresh) {
      pointer.px = pointer.x;
      pointer.py = pointer.y;
      pointer.fresh = false;
    }
    pointer.active = true;
  }
  canvas.addEventListener("pointermove", onPointer, { signal });
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      pointer.fresh = true;
      onPointer(e);
    },
    { signal }
  );
  canvas.addEventListener(
    "pointerleave",
    () => {
      pointer.active = false;
      pointer.fresh = true;
    },
    { signal }
  );
  canvas.addEventListener("click", replay, { signal });

  function updateField(delta) {
    const f = field.uniforms;
    const moved = Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
    const radius = params.radius * dpr;
    f.u_canvas = [gl.canvas.width, gl.canvas.height];
    f.u_from = [pointer.px, pointer.py];
    f.u_to = [pointer.x, pointer.y];
    f.u_radius = radius;
    // A brisk flick (a fifth of the radius per frame) blows the letters fully
    f.u_strength =
      pointer.active && !reducedMotion.matches
        ? Math.min(moved / Math.max(delta, 0.25) / (radius * 0.2), 1) * params.strength
        : 0;
    f.u_decay = params.resolve;
    f.u_delta = delta;
    field.step();
    pointer.px = pointer.x;
    pointer.py = pointer.y;
    shared.u_field = field.texture;
  }

  // --- frame
  let frameCount = 0;
  function frame(_, seconds) {
    if (!fontReady) return;
    const dt = Math.min(seconds, 0.1);
    const delta = Math.min(dt / SIM_FRAME, MAX_SIM_STEP);

    introTime += dt;
    shared.u_time += dt;
    updateFront();
    updateField(delta);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    compositeRenderer.bindVAOs();
    compositeRenderer.setUniforms({
      ...shared,
      ...Object.fromEntries(composite.levels.map((tex, i) => [`u_l${i}`, tex])),
      u_maxBlur: composite.u_maxBlur,
      u_push: composite.u_push,
      u_fade: composite.u_fade,
      u_colour: hexToRgb(params.colour),
    });
    compositeRenderer.render();

    if (!reducedMotion.matches) {
      particles.step({
        ...shared,
        u_delta: delta,
        u_frame: frameCount++ % 1e6,
        u_glyphs: glyphTexture,
        u_glyphCount: sim.u_glyphCount,
        u_revealEmit: params.emit,
        u_fieldEmit: params.emit,
        u_spawnAt: params.spawnAt,
        u_spawnWidth: params.spawnWidth,
        u_speed: params.speed,
        u_life: params.life,
        u_noiseStrength: params.swirl,
        u_noiseSize: 1,
      });
      particles.draw({
        u_canvas: shared.u_canvas,
        u_dpr: shared.u_dpr,
        u_time: shared.u_time,
        u_size: params.size,
        u_opacity: 1,
        u_colour: hexToRgb(params.particleColour),
      });
    }
  }
  // --- start once the font is in, so the first layout uses it
  const fontSpec = `${font.weight} 100px "${font.family}"`;
  Promise.race([document.fonts.load(fontSpec, params.text), new Promise((r) => setTimeout(r, 3000))])
    .catch(() => {})
    .then(() => {
      if (signal.aborted) return;
      fontReady = true;
      rebuildText();
      replay();
    });
  // If the font arrives after the timeout, lay out again with it
  document.fonts.addEventListener("loadingdone", () => fontReady && rebuildText(), { signal });
  reducedMotion.addEventListener("change", replay, { signal });

  return {
    frame,
    replay,
    rebuildText,
    applyLayoutParams,
    /** Rebuilds the particles with `params.count`. */
    resetParticles() {
      particles.delete();
      particles = createParticles(gl, params.count);
    },
    destroy() {
      ac.abort();
      particles.delete();
      compositeRenderer.delete();
      pyramid.delete();
      field.delete();
      gl.deleteTexture(textTexture);
      gl.deleteTexture(glyphTexture);
    },
  };
}
