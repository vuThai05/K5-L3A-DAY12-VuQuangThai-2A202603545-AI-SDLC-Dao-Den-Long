import { BenchmarkWorld, frameMetrics } from './benchmark.js';
import { createScene } from './scene.js';
const params = new URLSearchParams(location.search), duration = Number(params.get('duration') ?? 30), seed = Number(params.get('seed') ?? 42);
const token = params.get('token'), game = new BenchmarkWorld(seed), status = document.getElementById('status');
let view, previous, firstFrame, measurementStart, accumulator = 0, samples = [], done = false;
async function report(value) {
  done = true;
  if (token) await fetch(`/benchmark-result/${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
  else { const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bench.json'; a.click(); URL.revokeObjectURL(a.href); }
  status.textContent = value.error ?? `Đã đo ${value.frames} khung. File bench.json đã được ghi.`;
}
try {
  view = createScene(document.getElementById('world'), { benchmark: true }); view.load(game);
  function frame(now) {
    if (done) return;
    if (document.hidden) { report({ error: 'Benchmark lost foreground visibility. Keep its window visible and rerun.' }); return; }
    const dt = previous === undefined ? 0 : (now - previous) / 1000; previous = now;
    if (firstFrame !== undefined) { accumulator += dt; while (accumulator >= 1 / 60) { game.step(); accumulator -= 1 / 60; } }
    view.update(game, dt, firstFrame === undefined ? 0 : (now - firstFrame) / 1000, 0, false);
    if (firstFrame === undefined) firstFrame = now;
    if (now - firstFrame >= 3000) {
      if (measurementStart === undefined) { measurementStart = now; samples = []; status.hidden = true; }
      else {
        if (now - measurementStart < duration * 1000 && dt > 0) samples.push(dt * 1000);
        if (now - measurementStart >= duration * 1000) {
          const result = { contract_version: '1.3', ...frameMetrics(samples), load_ms: performance.timeOrigin + firstFrame - Number(params.get('started') ?? performance.timeOrigin), peak_mem_mb: null, vsync_off: false, renderer: 'Three.js 0.180.0 / WebGL2 / browser requestAnimationFrame', os: params.get('os') ?? navigator.platform };
          status.hidden = false; report(result); return;
        }
      }
    }
    requestAnimationFrame(frame);
  }
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isSafeInteger(seed)) throw new Error('Invalid benchmark duration/seed');
  requestAnimationFrame(frame);
} catch (error) { report({ error: error.message }); }
