// Draws the headline into a 2D canvas the size of the drawing buffer, and
// collects the glyph pixels particles can spawn from.
//
// All sizes are device pixels. Glyph positions are Y up (origin bottom-left)
// to match gl_FragCoord and the particle simulation.

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

export const GLYPH_TEXTURE_WIDTH = 1024;

function fontString(size, { family, weight }) {
  return `${weight} ${size}px "${family}"`;
}

// Split words into `lines` rows with the narrowest widest row.
function balance(words, lines, measure) {
  if (lines <= 1 || words.length <= 1) return [words.join(" ")];
  let best = null;
  let bestWidth = Infinity;
  // Words are few, so trying every split point recursively is cheap.
  const tryFrom = (start, remaining, acc) => {
    if (remaining === 1) {
      const rows = [...acc, words.slice(start).join(" ")];
      const widest = Math.max(...rows.map(measure));
      if (widest < bestWidth) {
        bestWidth = widest;
        best = rows;
      }
      return;
    }
    for (let end = start + 1; end <= words.length - remaining + 1; end++) {
      tryFrom(end, remaining - 1, [...acc, words.slice(start, end).join(" ")]);
    }
  };
  tryFrom(0, lines, []);
  return best;
}

/**
 * Lay out and draw the text.
 * @returns {{ canvas, fontSize, x0, x1, glyphs: Float32Array, glyphCount, glyphRows }}
 */
export function drawText(text, width, height, font) {
  canvas.width = width;
  canvas.height = height;

  const content = font.uppercase ? text.toUpperCase() : text;
  const words = content.trim().split(/\s+/).filter(Boolean);

  // Measure at 100px, then scale to fit.
  ctx.font = fontString(100, font);
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${font.tracking * 100}px`;
  const measureAt100 = (s) => ctx.measureText(s).width || 1;

  const maxWidth = width * font.fit;
  const maxSize = height * 0.32;
  const minSize = height * 0.09;

  let rows = [words.join(" ")];
  let size = Math.min(maxSize, (maxWidth / measureAt100(rows[0])) * 100);
  for (let lines = 2; size < minSize && lines <= Math.min(4, words.length); lines++) {
    rows = balance(words, lines, measureAt100);
    const widest = Math.max(...rows.map(measureAt100));
    size = Math.min(maxSize, (maxWidth / widest) * 100, (height * 0.8) / (lines * font.leading));
  }

  ctx.clearRect(0, 0, width, height);
  ctx.font = fontString(size, font);
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${font.tracking * size}px`;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Centre on the cap height so the text sits optically in the middle.
  const capHeight = ctx.measureText("H").actualBoundingBoxAscent;
  const lineHeight = size * font.leading;
  const block = (rows.length - 1) * lineHeight + capHeight;
  let baseline = height / 2 - block / 2 + capHeight;

  let x0 = Infinity;
  let x1 = -Infinity;
  for (const row of rows) {
    // letterSpacing adds trailing space after the last glyph; trim it off.
    const w = ctx.measureText(row).width - (font.tracking * size || 0);
    const left = (width - w) / 2;
    ctx.fillText(row, left, baseline);
    x0 = Math.min(x0, left);
    x1 = Math.max(x1, left + w);
    baseline += lineHeight;
  }

  // Glyph pixels on a grid, flipped to Y up.
  const stride = Math.max(2, Math.round(size / 120));
  const { data } = ctx.getImageData(0, 0, width, height);
  const points = [];
  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      if (data[(y * width + x) * 4 + 3] > 128) points.push(x, height - y);
    }
  }
  const glyphCount = points.length / 2;
  const glyphRows = Math.max(1, Math.ceil(glyphCount / GLYPH_TEXTURE_WIDTH));
  const glyphs = new Float32Array(GLYPH_TEXTURE_WIDTH * glyphRows * 2);
  glyphs.set(points);

  return { canvas, fontSize: size, x0, x1, glyphs, glyphCount, glyphRows };
}
