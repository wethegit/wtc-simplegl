import { noise, pcg, reveal } from "./common.js";

/**
 * Particle simulation, run by the TransformFeedback with rasterisation off.
 * Adapted from the Zelda portal embers: same curl eddies and rate-independent
 * damping, but particles live on the letters, are blown out to the right, and
 * die by age.
 *
 * Space is canvas device px, Y up. Velocities are px per 60Hz frame and ages
 * count 60Hz frames; u_delta is how many such frames this frame covers.
 *
 * a_properties: x = density (drag + drive), y = size class, z = age,
 * w = lifespan. A particle with age >= lifespan is dead and waits to spawn.
 */
export const simulateVertex = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;

in vec2 a_position;
in vec2 a_velocity;
in vec4 a_properties;

out vec2 v_position;
out vec2 v_velocity;
out vec4 v_properties;

uniform float u_time;
uniform float u_delta;
uniform float u_frame;
uniform float u_dpr;
uniform vec2 u_canvas;

uniform sampler2D u_glyphs;     // RG32F glyph pixel positions
uniform float u_glyphCount;
uniform sampler2D u_field;      // mouse disturbance
uniform float u_drift;          // device px, as in the composite

uniform float u_revealEmit;     // spawn rate at the reveal front
uniform float u_fieldEmit;      // spawn rate where the mouse blur resolves
uniform float u_spawnAt;       // blur level the intro spawns at (0 = just resolved, 1 = fully blurred)
uniform float u_spawnWidth;    // width of the band around it
uniform float u_speed;
uniform float u_life;           // mean lifespan, 60Hz frames
uniform float u_noiseStrength;
uniform float u_noiseSize;

#define GLYPH_TEXTURE_WIDTH 1024
#define CURL_STRENGTH 0.05

${noise}
${pcg}
${reveal}

vec2 curlNoise(vec2 p, float z) {
  const float e = 0.1;
  float n0 = simplexNoise(vec3(p, z));
  float nx = simplexNoise(vec3(p + vec2(e, 0.0), z));
  float ny = simplexNoise(vec3(p + vec2(0.0, e), z));
  return vec2(ny - n0, n0 - nx) / e;
}

void main() {
  float age = a_properties.z;
  float life = a_properties.w;
  v_properties = a_properties;
  v_position = a_position;
  v_velocity = a_velocity;

  if (age < life) {
    v_position = a_position + a_velocity * u_delta;

    float density = a_properties.x;
    float noiseTime = u_time * 0.6;
    float px = 1.0 / u_dpr;

    // A little lift, so they rise as they slow; curl eddies make them
    // flutter on the way.
    vec2 eddy = curlNoise(v_position * px * 0.006 / u_noiseSize, noiseTime + density * 3.0);
    vec2 wind = vec2(0.0, 0.03) * density * u_speed * u_dpr;

    float damping = pow(0.955 + 0.03 * density, u_delta);
    vec2 force = eddy * CURL_STRENGTH * u_dpr * u_noiseStrength * u_speed + wind;
    v_velocity = a_velocity * damping + force * u_delta;

    v_properties.z = age + u_delta;

    float margin = 80.0 * u_dpr;
    if (any(greaterThan(v_position, u_canvas + margin)) || any(lessThan(v_position, vec2(-margin)))) {
      v_properties.z = life;
    }
  } else if (u_glyphCount > 0.0) {
    vec3 h1 = pcg3d(uvec3(gl_VertexID, uint(u_frame), 17u));
    vec3 h2 = pcg3d(uvec3(gl_VertexID, uint(u_frame), 91u));
    vec3 h3 = pcg3d(uvec3(gl_VertexID, uint(u_frame), 53u));

    int index = min(int(h1.x * u_glyphCount), int(u_glyphCount) - 1);
    vec2 glyph = texelFetch(u_glyphs, ivec2(index % GLYPH_TEXTURE_WIDTH, index / GLYPH_TEXTURE_WIDTH), 0).xy;

    // How hard the letter here is resolving right now
    float r = reveal(glyph.x);
    vec4 field = texture(u_field, glyph / u_canvas);
    float settling = clamp(field.r, 0.0, 1.0) * (1.0 - clamp(field.a * 3.0, 0.0, 1.0));
    // A band around u_spawnAt on the reveal ramp, kept off the fully
    // blurred and fully resolved ends so finished letters stop emitting.
    float band = exp(-pow((r - u_spawnAt) / u_spawnWidth, 2.0)) *
      smoothstep(0.0, 0.02, r) * smoothstep(1.0, 0.98, r);
    float rate = band * u_revealEmit + settling * u_fieldEmit;

    if (h1.y < rate * u_delta) {
      // Spawn where the letter is drawn, which drift shifts right
      v_position = glyph + vec2(u_drift * r, 0.0) + (h2.xy - 0.5) * 3.0 * u_dpr;

      // Off in any direction, a little upwards, and outwards where the
      // pointer pushed the letters
      float angle = h3.x * 6.2831853;
      float launch = mix(0.5, 3.0, h3.y * h3.y) * u_speed * u_dpr;
      vec2 kick = field.gb * 4.0 * u_speed * u_dpr * settling;
      v_velocity = vec2(cos(angle), sin(angle)) * launch + vec2(0.0, 0.6) * u_speed * u_dpr + kick;

      v_properties.x = 0.4 + 0.6 * h2.x;
      v_properties.y = 0.15 + 0.85 * h2.y * h2.y;
      v_properties.z = 0.0;
      v_properties.w = u_life * mix(0.6, 1.4, h1.z);
    }
  }

  gl_Position = vec4(0.0);
}
`;

// The simulation draws nothing, but a program still needs a fragment shader
export const simulateFragment = /* glsl */ `#version 300 es
precision highp float;
out vec4 colour;
void main() { colour = vec4(0.0); }
`;

/** Point sprite placement; the embers' look without depth, bokeh or scroll. */
export const vertex = /* glsl */ `#version 300 es

in vec2 a_position;
in vec2 a_velocity;
in vec4 a_properties;

uniform vec2 u_canvas;
uniform float u_dpr;
uniform float u_size;
uniform float u_opacity;

out float o_roundness;
out vec2 o_position;
out float o_life;
out mat2 o_rot;
out float o_transparency;
out float o_heat;

#define PI 3.141592653589793
// Sprites below this (device px) shimmer, so they are held here and faded
#define MIN_POINT_SIZE 2.0

${noise}

void main() {
  float age = a_properties.z;
  float lifespan = a_properties.w;
  float alive = age < lifespan ? 1.0 : 0.0;
  float k = clamp(age / max(lifespan, 1.0), 0.0, 1.0);

  // Hot as it leaves the letter, cooling to dark green as it goes
  float heat = 1.0 - smoothstep(0.0, 0.85, k);
  float life = 1.0 - k;

  vec3 seed = abs(hash33(vec3(a_properties.xy * 1024.0, 3.0)));
  float phase = seed.y * 2.0 * PI;
  float flicker = 0.8 + 0.2 * (
    0.6 * sin(age * 0.35 * mix(0.15, 0.35, seed.y) + phase) +
    0.4 * sin(age * 0.35 * 0.53 + phase * 3.0)
  );

  float heading = atan(a_velocity.x, a_velocity.y);
  float s = sin(heading);
  float c = cos(heading);
  o_rot = mat2(c, s, -s, c);
  o_roundness = life;
  o_position = a_position / u_canvas * 2.0 - 1.0;
  o_life = alive * smoothstep(0.0, 3.0, age) * smoothstep(1.0, 0.65, k);
  o_heat = heat;
  o_transparency = u_opacity * flicker;

  float pointSize = alive * mix(1.0, 0.5, k) * 20.0 * a_properties.y * u_size * u_dpr;
  o_life *= smoothstep(0.0, MIN_POINT_SIZE * 1.5, pointSize);
  gl_PointSize = alive > 0.5 ? max(pointSize, MIN_POINT_SIZE) : 0.0;

  gl_Position = alive > 0.5 ? vec4(o_position, 0.0, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}
`;

/**
 * The embers' sprite: a core stretched along the heading with a noisy edge,
 * over a soft round glow, all in u_colour (the text's colour). The glow
 * fades as a particle cools. Output is premultiplied.
 */
export const fragment = /* glsl */ `#version 300 es
precision highp float;

in float o_roundness;
in vec2 o_position;
in float o_life;
in mat2 o_rot;
in float o_transparency;
in float o_heat;

out vec4 colour;

uniform float u_time;
uniform vec3 u_colour;

${noise}

void main() {
  vec2 uv = gl_PointCoord.xy - 0.5;
  vec2 uvGlow = uv;

  // Stretch and roughen the core as the particle ages (roundness falls)
  uv *= o_rot;
  uv += step(o_roundness, 0.9) * (simplexNoise(vec3(uv * 1.5 + o_position * 2.2, u_time * 2.1)) * 0.08 - 0.04);
  uv *= vec2(1.0 + 10.0 * smoothstep(0.99, 0.5, o_roundness), 1.0);

  uvGlow *= o_rot;
  uvGlow *= vec2(1.0 + 10.0 * (1.0 - o_roundness), 1.0);

  float core = clamp(smoothstep(0.5, o_roundness * 0.25, length(uv)), 0.0, 1.0);
  float glow = clamp(smoothstep(0.5, 0.0, length(uvGlow)), 0.0, 1.0) * 0.5 * o_heat;

  float fade = o_transparency * o_life;
  float coreAlpha = core * fade;
  float glowAlpha = glow * fade;

  float alpha = coreAlpha + glowAlpha * (1.0 - coreAlpha);
  colour = vec4(u_colour * alpha, alpha);
}
`;
