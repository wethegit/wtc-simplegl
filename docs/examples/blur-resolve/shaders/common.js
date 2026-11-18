// Full-screen triangle vertex shader shared by every screen pass.
export const screenVertex = /* glsl */ `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// The full-screen triangle's attributes, for createRenderer.
export const triangle = {
  position: { data: new Float32Array([-1, -1, 3, -1, -1, 3]), size: 2 },
  uv: { data: new Float32Array([0, 0, 2, 0, 0, 2]), size: 2 },
};

// Hash and simplex noise from the Zelda portal embers
// (https://www.shadertoy.com/view/4djSRW, https://www.shadertoy.com/view/XsX3zB)
export const noise = /* glsl */ `
#define MOD3 vec3(.1031, .11369, .13787)
vec3 hash33(vec3 p3) {
  p3 = fract(p3 * MOD3);
  p3 += dot(p3, p3.yxz + 19.19);
  return -1.0 + 2.0 * fract(vec3(
    (p3.x + p3.y) * p3.z,
    (p3.x + p3.z) * p3.y,
    (p3.y + p3.z) * p3.x
  ));
}

float simplexNoise(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;

  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);

  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);

  vec3 d1 = d0 - (i1 - 1.0 * K2);
  vec3 d2 = d0 - (i2 - 2.0 * K2);
  vec3 d3 = d0 - (1.0 - 3.0 * K2);

  vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
  vec4 n = h * h * h * h * vec4(
    dot(d0, hash33(i)),
    dot(d1, hash33(i + i1)),
    dot(d2, hash33(i + i2)),
    dot(d3, hash33(i + 1.0))
  );

  return dot(vec4(31.316), n);
}
`;

// Integer hash (PCG 3D) for per-particle, per-frame random numbers in 0..1.
export const pcg = /* glsl */ `
vec3 pcg3d(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return vec3(v) / float(0xffffffffu);
}
`;

// The blur the reveal front leaves at x, 1 = fully blurred. Shared by the
// composite and the particle spawner so particles leave exactly where the
// letters are resolving.
export const reveal = /* glsl */ `
uniform float u_front;
uniform float u_spread;
float reveal(float x) {
  return smoothstep(u_front, u_front + u_spread, x);
}
`;
