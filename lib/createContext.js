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
 * @param {number} [options.dpr] Fixed pixel ratio. By default follows devicePixelRatio,
 *   capped at 2, including when it changes (zoom, moving to another display).
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
  dpr,
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

  // CSS content-box size: the same box ResizeObserver reports.
  let cssWidth = 0;
  let cssHeight = 0;

  const resize = (force = false) => {
    const ratio = dpr ?? Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(cssWidth * ratio));
    const height = Math.max(1, Math.round(cssHeight * ratio));
    if (!force && canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    onResize?.(width, height, gl);
  };

  // Measure the content box up front so the context is sized before the first
  // ResizeObserver callback. Canvases that aren't rendered measure as 0.
  if (canvas.getClientRects().length) {
    const style = getComputedStyle(canvas);
    const px = (...props) => props.reduce((sum, p) => sum + (parseFloat(style[p]) || 0), 0);
    const borderBox = style.boxSizing === "border-box";
    cssWidth = px("width") - (borderBox ? px("paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth") : 0);
    cssHeight = px("height") - (borderBox ? px("paddingTop", "paddingBottom", "borderTopWidth", "borderBottomWidth") : 0);
  }
  resize(true);

  if (autoResize && !signal?.aborted) {
    const observer = new ResizeObserver(([entry]) => {
      ({ width: cssWidth, height: cssHeight } = entry.contentRect);
      resize();
    });
    observer.observe(canvas);
    signal?.addEventListener("abort", () => observer.disconnect());

    // A pixel ratio change on its own (moving to another display) doesn't
    // change the CSS size, so ResizeObserver won't report it.
    const watchRatio = () =>
      matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener(
        "change",
        () => {
          resize();
          watchRatio();
        },
        { once: true, signal }
      );
    if (dpr === undefined) watchRatio();
  }

  return gl;
};

export { createContext };
