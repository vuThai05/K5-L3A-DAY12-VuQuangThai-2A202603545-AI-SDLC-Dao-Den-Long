import { tuning as T } from './config.js';
export const PALETTE = {
  sky: '#0E1430', fog: '#1B2350', grass: '#2F5D50', sand: '#C9B48A', wood: '#6B4A2F', clouds: '#12384A',
  lamp: '#FFB347', core: '#FFE9B0', unlit: '#5B5F6E', mote: '#FFF6C2', halo: '#FFE58A',
  shade: '#120A1A', edge: '#7A3CFF', stunned: '#3A3450', coat: '#E8E2D0', red: '#C8102E',
  gold: '#F2C14E', drifter: '#8FA3B8', danger: '#FF5A5F', text: '#F5F1E6'
};
export function ring(cx, cz, radius, count, offset = 0, y = 0) {
  return Array.from({ length: count }, (_, i) => {
    const a = (offset + i * 360 / count) * Math.PI / 180;
    return [cx + Math.cos(a) * radius, y, cz + Math.sin(a) * radius];
  });
}
export function levelFor(night) {
  if (![1, 2, 3].includes(night)) throw new Error('night must be 1, 2 or 3');
  const common = { night, spawn: [0, 0, 0], pads: [], charms: [] };
  if (night === 1) return { ...common, name: 'Đảo Bến', duration: T.night1_duration_s, radius: 40, islands: [[0, 0, 40]], shadeInterval: 480, shadeMax: 6, shadeSpeed: 4,
    lamps: [[0, 0, 25], [23.8, 0, 7.7], [14.7, 0, -20.2], [-14.7, 0, -20.2], [-23.8, 0, 7.7]],
    motePoints: [...ring(0, 0, 12, 8), ...ring(0, 0, 33, 16)], shadePoints: ring(0, 0, 37, 12, 15) };
  if (night === 2) return { ...common, name: 'Đảo Cau', duration: T.night2_duration_s, radius: 28, islands: [[0, 0, 28], [70, 0, 28]], shadeInterval: 420, shadeMax: 8, shadeSpeed: 4,
    lamps: [[0, 0, 20], [17, 0, -10], [-17, 0, -10], [70, 0, 20], [87, 0, -10], [53, 0, -10]],
    motePoints: [0, 70].flatMap(x => [...ring(x, 0, 10, 4), ...ring(x, 0, 22, 8)]),
    shadePoints: [0, 70].flatMap(x => ring(x, 0, 26, 8, 22.5)),
    pads: [{ pos: [20, 0, 18], target: [70, 0, 0], up: 14, speed: 24 }, { pos: [50, 0, -18], target: [0, 0, 0], up: 14, speed: 24 }], charms: [{ id: 'C1', pos: [35, 0, 0] }] };
  return { ...common, name: 'Đảo Chuông', spawn: [0, 0, -30], duration: T.night3_duration_s, radius: 45, islands: [[0, 0, 45]], shadeInterval: 360, shadeMax: 10, shadeSpeed: 4.5,
    lamps: [[0, 6, 6], [18, 3, 10], [-18, 3, 10], [35, 0, -10], [-35, 0, -10], [20, 0, -35], [-20, 0, -35]],
    motePoints: [...ring(0, 0, 34, 18), ...Array.from({ length: 8 }, (_, i) => {
      const a = (20 + i * 20) * Math.PI / 180; return [18 * Math.cos(a), 3, 18 * Math.sin(a)];
    }), ...ring(0, 0, 5, 4, 45, 6)], shadePoints: ring(0, 0, 43, 16),
    pads: [{ pos: [0, 3, 13], target: [0, 6, 0], up: 12, speed: 8 }], charms: [{ id: 'C1', pos: [30, 0, 25] }, { id: 'C2', pos: [-30, 0, 25] }] };
}
export function rampAt(x, z) {
  for (const degrees of [30, 150]) {
    const a = degrees * Math.PI / 180, along = x * Math.cos(a) + z * Math.sin(a), across = -x * Math.sin(a) + z * Math.cos(a);
    if (along >= 24 && along <= 30 && Math.abs(across) <= 1.5) return (30 - along) / 2;
  }
  return null;
}
export function surfaces(level, x, z) {
  const values = [];
  if (level.islands.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) <= r) || level.night === 2 && x >= 26 && x <= 44 && Math.abs(z) <= 2) values.push(0);
  if (level.night === 3) {
    const r = Math.hypot(x, z), ramp = rampAt(x, z);
    if (z > 0 && r >= 12 && r <= 24) values.push(3);
    if (r <= 8) values.push(6);
    if (ramp !== null) values.push(ramp);
  }
  return values.sort((a, b) => b - a);
}
export function groundAt(level, x, z) { return surfaces(level, x, z)[0] ?? null; }
export function blocked(level, from, to) {
  if (level.night !== 3) return false;
  if (Math.hypot(to[0], to[2]) < 2 && to[1] >= 5.9 && to[1] < 14 && Math.hypot(from[0], from[2]) >= 2) return true;
  const next = groundAt(level, to[0], to[2]), old = groundAt(level, from[0], from[2]);
  return next !== null && next > to[1] + .12 && (old === null || old <= from[1] + .12);
}
