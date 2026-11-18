/**
 * Runs `fn` every animation frame.
 *
 * `time` is the seconds the loop has been running, not counting time spent
 * stopped, so animations resume where they left off. `delta` is the seconds
 * since the previous frame.
 *
 * @param {(time: number, delta: number, frame: number) => void} fn
 * @param {object} [options]
 * @param {boolean} [options.autoStart=true] Start immediately.
 * @param {AbortSignal} [options.signal] Stops the loop for good when aborted.
 * @returns {{ start(): void, stop(): void, readonly running: boolean }}
 */
const loop = (fn, { autoStart = true, signal } = {}) => {
  let raf = null;
  let last = 0;
  let time = 0;
  let frame = 0;

  const tick = (now) => {
    raf = requestAnimationFrame(tick);
    // The first frame after starting has no previous frame to measure from.
    const delta = last ? (now - last) / 1000 : 0;
    last = now;
    time += delta;
    fn(time, delta, frame++);
  };

  const controls = {
    start() {
      if (raf !== null || signal?.aborted) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    },
    stop() {
      if (raf === null) return;
      cancelAnimationFrame(raf);
      raf = null;
    },
    get running() {
      return raf !== null;
    },
  };

  signal?.addEventListener("abort", () => controls.stop(), { once: true });
  if (autoStart) controls.start();
  return controls;
};

export { loop };
