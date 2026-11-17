/**
 * Creates a WebGL2 context and keeps the canvas's pixel size in step with its
 * CSS size.
 *
 * With no options it creates a canvas that fills the window. Pass `canvas` to
 * use your own (size it with CSS), or `container` to append a new canvas that
 * fills that element.
 *
 * @param {object} [options]
 * @param {HTMLCanvasElement} [options.canvas] Existing canvas to use.
 * @param {HTMLElement} [options.container=document.body] Where a new canvas is appended.
 * @param {number} [options.dpr] Pixel ratio. Defaults to devicePixelRatio, capped at 2.
 * @param {boolean} [options.autoResize=true] Resize the canvas when its CSS size changes.
 * @param {(width: number, height: number, gl: WebGL2RenderingContext) => void} [options.onResize]
 *   Called with the new pixel size, once on creation and after every resize.
 * @param {WebGLContextAttributes} [options.attributes] Passed to getContext.
 * @param {AbortSignal} [options.signal] Stops resizing when aborted.
 * @returns {WebGL2RenderingContext}
 */
const createContext = ({
  canvas,
  container = document.body,
  dpr = Math.min(window.devicePixelRatio || 1, 2),
  autoResize = true,
  onResize,
  attributes,
  signal,
} = {}) => {
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.style.cssText =
      container === document.body
        ? "display:block;position:fixed;inset:0;width:100%;height:100%"
        : "display:block;width:100%;height:100%";
    container.appendChild(canvas);
  }

  const gl = canvas.getContext("webgl2", attributes);
  if (!gl) throw new Error("createContext: WebGL2 is not available");

  const resize = (cssWidth, cssHeight, force = false) => {
    const width = Math.max(1, Math.round(cssWidth * dpr));
    const height = Math.max(1, Math.round(cssHeight * dpr));
    if (!force && canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    onResize?.(width, height, gl);
  };

  const { width, height } = canvas.getBoundingClientRect();
  resize(width, height, true);

  if (autoResize) {
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      resize(width, height);
    });
    observer.observe(canvas);
    signal?.addEventListener("abort", () => observer.disconnect());
  }

  return gl;
};

export { createContext };
