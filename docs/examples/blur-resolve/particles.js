import { createRenderer } from "wtc-simplegl";
import { simulateVertex, simulateFragment, vertex, fragment } from "./shaders/particles.js";

/**
 * Embers that leave the letters as they resolve, simulated on the GPU
 * with transform feedback (as in the Zelda portal embers). Every particle
 * starts dead; dead particles try a random glyph pixel each frame and spawn
 * with a probability set by how fast that letter is resolving.
 */
export function createParticles(gl, count) {
  const position = new Float32Array(count * 2);
  const velocity = new Float32Array(count * 2);
  const properties = new Float32Array(count * 4);
  // age 1 >= lifespan 0: dead
  for (let i = 0; i < count; i++) properties[i * 4 + 2] = 1;

  const output = (data, size, varying) => ({
    data,
    size,
    varying,
    component: "transformFeedback",
    usage: gl.DYNAMIC_COPY,
  });
  const simulation = createRenderer(gl, {
    vert: simulateVertex,
    frag: simulateFragment,
    mode: gl.POINTS,
    count,
    attributes: {
      a_position: output(position, 2, "v_position"),
      a_velocity: output(velocity, 2, "v_velocity"),
      a_properties: output(properties, 4, "v_properties"),
    },
  });

  // Draws the simulation's latest output.
  const sprites = createRenderer(gl, {
    vert: vertex,
    frag: fragment,
    mode: gl.POINTS,
    count,
    attributes: {
      a_position: { from: simulation, size: 2 },
      a_velocity: { from: simulation, size: 2 },
      a_properties: { from: simulation, size: 4 },
    },
  });

  return {
    step(uniforms) {
      gl.enable(gl.RASTERIZER_DISCARD);
      simulation.bindVAOs();
      simulation.setUniforms(uniforms);
      simulation.render();
      gl.disable(gl.RASTERIZER_DISCARD);
    },
    draw(uniforms) {
      // Premultiplied "over", so they show on light and dark backgrounds
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      sprites.bindVAOs();
      sprites.setUniforms(uniforms);
      sprites.render();
      gl.disable(gl.BLEND);
    },
    delete() {
      sprites.delete();
      simulation.delete();
    },
  };
}
