import { createFrameBuffer, createRenderer } from "wtc-simplegl";
import { screenVertex, triangle } from "./shaders/common.js";
import { blurFragment, LEVELS } from "./shaders/screen.js";

/**
 * A blur pyramid of the text texture: level 0 is the text itself, each level
 * after it is half the size and about twice as blurred. Built on the GPU once
 * per text change; the composite blends between levels per pixel.
 */
export function createBlurPyramid(gl) {
  const blur = createRenderer(gl, { vert: screenVertex, frag: blurFragment, attributes: triangle, count: 3 });

  let targets = [];
  const makeTarget = (width, height) =>
    createFrameBuffer(gl, { width, height, type: gl.HALF_FLOAT, singular: true });

  function free() {
    for (const { across, level } of targets) {
      across.delete();
      level.delete();
    }
    targets = [];
  }

  // Horizontal pass, halving the resolution on the way, or vertical pass at
  // the level's own resolution.
  function pass(source, target, step) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.read.fb);
    blur.bindVAOs();
    blur.setUniforms({ u_source: source, u_step: step });
    blur.render({ width: target.width, height: target.height });
  }

  /** Rebuild from `texture` (width × height device px); returns LEVELS textures. */
  function build(texture, width, height) {
    if (targets[0]?.width !== Math.ceil(width / 2) || targets[0]?.height !== Math.ceil(height / 2)) {
      free();
      for (let k = 1; k < LEVELS; k++) {
        const w = Math.max(1, Math.ceil(width / 2 ** k));
        const h = Math.max(1, Math.ceil(height / 2 ** k));
        targets.push({ width: w, height: h, across: makeTarget(w, h), level: makeTarget(w, h) });
      }
    }

    let source = texture;
    for (const t of targets) {
      pass(source, t.across, [1 / t.width, 0]);
      pass(t.across.read, t.level, [0, 1 / t.height]);
      source = t.level.read.targetTexture;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return [texture, ...targets.map((t) => t.level.read.targetTexture)];
  }

  return {
    build,
    delete() {
      free();
      blur.delete();
    },
  };
}
