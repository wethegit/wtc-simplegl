import { reveal } from "./common.js";

export const LEVELS = 8;

/**
 * One direction of a 9-tap Gaussian (sigma = 2 texels of the target). The
 * horizontal pass also halves the resolution, so each pyramid level is about
 * twice as blurred as the one before it.
 */
export const blurFragment = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D u_source;
uniform vec2 u_step; // one target texel along the blur direction, in uv
in vec2 v_uv;
out vec4 colour;
void main() {
  const float w0 = 0.2042;
  const float w1 = 0.1802;
  const float w2 = 0.1238;
  const float w3 = 0.0663;
  const float w4 = 0.0276;
  float a = texture(u_source, v_uv).a * w0;
  a += (texture(u_source, v_uv + u_step).a + texture(u_source, v_uv - u_step).a) * w1;
  a += (texture(u_source, v_uv + u_step * 2.0).a + texture(u_source, v_uv - u_step * 2.0).a) * w2;
  a += (texture(u_source, v_uv + u_step * 3.0).a + texture(u_source, v_uv - u_step * 3.0).a) * w3;
  a += (texture(u_source, v_uv + u_step * 4.0).a + texture(u_source, v_uv - u_step * 4.0).a) * w4;
  colour = vec4(a);
}
`;

/**
 * Mouse disturbance, ping-ponged at quarter resolution.
 *  r  blur amount, decays back to 0 (the letters resolving back in)
 *  gb push direction, radial from the pointer's path, in units of u_push
 *  a  how recently the pointer splatted here; holds particles back while the
 *     letters are still being blown apart
 */
export const fieldFragment = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D b_prev;
uniform vec2 u_canvas;    // device px
uniform vec2 u_from;      // pointer last frame, device px, Y up
uniform vec2 u_to;        // pointer this frame
uniform float u_radius;   // device px
uniform float u_strength; // 0..1 for this frame's stroke
uniform float u_decay;    // per 60Hz frame
uniform float u_delta;    // 60Hz frames this frame covers
in vec2 v_uv;
out vec4 colour;
void main() {
  vec4 prev = texture(b_prev, v_uv);
  vec2 p = v_uv * u_canvas;

  // Distance to the pointer's path this frame
  vec2 ab = u_to - u_from;
  float t = clamp(dot(p - u_from, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  vec2 closest = u_from + ab * t;
  vec2 away = p - closest;
  float d = length(away);
  float splat = exp(-d * d / (u_radius * u_radius)) * u_strength;
  vec2 dir = d > 1e-3 ? away / d : vec2(0.0);

  float decay = pow(u_decay, u_delta);
  float amount = prev.r * decay;
  amount += splat * (1.0 - amount);
  vec2 push = prev.gb * decay + dir * splat * smoothstep(0.0, u_radius * 0.6, d);
  float len = length(push);
  if (len > 1.0) push /= len;
  float recent = prev.a * pow(0.88, u_delta) + splat;

  colour = vec4(amount, push, min(recent, 1.0));
}
`;

/**
 * The headline: picks a blur level per pixel from the reveal front and the
 * mouse field, and offsets the lookup for drift and the push.
 */
export const compositeFragment = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D u_l0;
uniform sampler2D u_l1;
uniform sampler2D u_l2;
uniform sampler2D u_l3;
uniform sampler2D u_l4;
uniform sampler2D u_l5;
uniform sampler2D u_l6;
uniform sampler2D u_l7;
uniform sampler2D u_field;
uniform vec2 u_canvas;    // device px
uniform float u_maxBlur;  // device px, Gaussian sigma at full blur
uniform float u_drift;    // device px unresolved letters sit to the right
uniform float u_push;     // device px the mouse pushes letters out
uniform float u_fade;     // intro opacity
uniform vec3 u_colour;
in vec2 v_uv;
out vec4 colour;

${reveal}

float level(int i, vec2 uv) {
  if (i <= 0) return texture(u_l0, uv).a;
  if (i == 1) return texture(u_l1, uv).a;
  if (i == 2) return texture(u_l2, uv).a;
  if (i == 3) return texture(u_l3, uv).a;
  if (i == 4) return texture(u_l4, uv).a;
  if (i == 5) return texture(u_l5, uv).a;
  if (i == 6) return texture(u_l6, uv).a;
  return texture(u_l7, uv).a;
}

void main() {
  vec2 p = v_uv * u_canvas;
  vec4 field = texture(u_field, v_uv);
  float r = reveal(p.x);
  float m = clamp(field.r, 0.0, 1.0);
  float b = max(r, m);

  vec2 source = p - vec2(u_drift * r, 0.0) - field.gb * u_push;
  vec2 uv = source / u_canvas;

  // Level k (k >= 1) has a sigma of about 2^(k + 1) px; level 0 is sharp.
  float sigma = b * u_maxBlur;
  float l = sigma < 4.0 ? sigma / 4.0 : log2(sigma / 4.0) + 1.0;
  l = clamp(l, 0.0, ${LEVELS - 1}.0);
  int i = int(floor(l));
  float a = mix(level(i, uv), level(min(i + 1, ${LEVELS - 1}), uv), fract(l));

  a = clamp(a * u_fade * mix(1.0, 0.8, b), 0.0, 1.0);
  // Premultiplied, over a see-through canvas
  colour = vec4(u_colour * a, a);
}
`;
