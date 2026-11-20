import { Game } from './game.js';

export class BenchmarkWorld extends Game {
  constructor(seed = 42) {
    super(seed, { random_motes: false, random_shades: false, random_drifters: false, wind_enabled: false, lanterns: [1, 2, 3].map(i => ({ id: `L${i}`, lit: true, fuel: 100 })) });
    const point = () => { const a = this.random() * 2 * Math.PI, r = 40 * Math.sqrt(this.random()); return [Math.cos(a) * r, 0, Math.sin(a) * r]; };
    for (let i = 0; i < 200; i++) { const pos = point(); pos[1] = .8; this.addShade(pos, undefined, 'wander', 0); }
    for (let i = 0; i < 100; i++) this.addMote(point(), 'random', 0, 0);
  }
  step() {
    this.tick++; this.sim_tick++; this.events = [];
    for (const s of this.shades) { this.repelShade(s); this.moveWanderShade(s); }
    return this.events;
  }
}
export function benchmarkCamera(seconds) { const a = seconds * 2 * Math.PI / 15; return [30 * Math.cos(a), 15, 30 * Math.sin(a)]; }
export function frameMetrics(samples) {
  if (!samples.length || samples.some(n => !Number.isFinite(n) || n <= 0)) throw new Error('Frame times must be positive finite numbers');
  const sorted = [...samples].sort((a, b) => a - b), k = Math.max(1, Math.ceil(.01 * sorted.length));
  const total = samples.reduce((a, b) => a + b, 0), slow = sorted.slice(-k).reduce((a, b) => a + b, 0);
  return { avg_fps: 1000 * samples.length / total, p1_low_fps: 1000 / (slow / k), frame_ms_p95: sorted[Math.ceil(.95 * sorted.length) - 1], frames: samples.length };
}
