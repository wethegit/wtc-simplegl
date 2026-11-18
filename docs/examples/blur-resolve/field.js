import { createFrameBuffer, createRenderer } from "wtc-simplegl";
import { screenVertex, triangle } from "./shaders/common.js";
import { fieldFragment } from "./shaders/screen.js";

const SCALE = 0.25;
const size = (n) => Math.max(1, Math.round(n * SCALE));

/**
 * The mouse disturbance field: the pointer's path splats blur and an outward
 * push into a quarter-resolution ping-pong buffer, which decays each frame so
 * the letters resolve back in.
 */
export function createField(gl) {
  const uniforms = {
    u_canvas: [1, 1],
    u_from: [0, 0],
    u_to: [0, 0],
    u_radius: 1,
    u_strength: 0,
    u_decay: 0.97,
    u_delta: 1,
  };

  const field = createRenderer(gl, { vert: screenVertex, frag: fieldFragment, attributes: triangle, count: 3 });
  const buffer = createFrameBuffer(gl, { width: 1, height: 1, type: gl.HALF_FLOAT });

  return {
    uniforms,
    get texture() {
      return buffer.read.targetTexture;
    },
    /** Device px of the canvas; the field is a quarter of that. */
    resize(width, height) {
      buffer.resize(size(width), size(height));
    },
    step() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.write.fb);
      field.bindVAOs();
      field.setUniforms({ ...uniforms, b_prev: buffer.read });
      field.render({ width: buffer.width, height: buffer.height });
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      buffer.swap();
    },
    delete() {
      buffer.delete();
      field.delete();
    },
  };
}
