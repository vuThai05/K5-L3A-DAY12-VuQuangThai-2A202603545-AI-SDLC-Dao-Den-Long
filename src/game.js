import { tuning as T } from './config.js';
export { T };
export const HZ = 60;
export const ISLAND_RADIUS = 30;
const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const round = n => Number(n.toFixed(3));
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const number = x => typeof x === 'number' && Number.isFinite(x);
const count = x => Number.isInteger(x) && x >= 0;
const position = x => Array.isArray(x) && x.length === 3 && x.every(number);
function requireValid(ok, message) { if (!ok) throw new Error(message); }

export function validateScenario(s) {
  requireValid(object(s), 'scenario must be an object');
  for (const key of ['random_motes', 'random_shades']) if (key in s) requireValid(typeof s[key] === 'boolean', key + ' must be boolean');
  if ('time_left_s' in s) requireValid(number(s.time_left_s) && s.time_left_s >= 0, 'invalid time_left_s');
  if ('player' in s) {
    requireValid(object(s.player), 'invalid player');
    if ('pos' in s.player) requireValid(position(s.player.pos), 'invalid player.pos');
    if ('carried' in s.player) requireValid(count(s.player.carried) && s.player.carried <= T.carry_capacity, 'invalid player.carried');
    if ('flames' in s.player) requireValid(count(s.player.flames) && s.player.flames <= T.flames, 'invalid player.flames');
  }
  if ('motes' in s) requireValid(Array.isArray(s.motes) && s.motes.every(position), 'invalid motes');
  if ('shades' in s) {
    requireValid(Array.isArray(s.shades), 'invalid shades');
    const ids = new Set();
    for (const shade of s.shades) {
      requireValid(object(shade) && position(shade.pos), 'invalid shade.pos');
      if ('id' in shade) { requireValid(typeof shade.id === 'string' && shade.id.length > 0 && !ids.has(shade.id), 'invalid/duplicate shade id'); ids.add(shade.id); }
    }
  }
  if ('lanterns' in s) {
    requireValid(Array.isArray(s.lanterns), 'invalid lanterns');
    const ids = new Set();
    for (const lamp of s.lanterns) {
      requireValid(object(lamp) && /^L[1-5]$/.test(lamp.id) && !ids.has(lamp.id), 'invalid/duplicate lantern id'); ids.add(lamp.id);
      if ('pos' in lamp) requireValid(position(lamp.pos), 'invalid lantern.pos');
      if ('deposited' in lamp) requireValid(count(lamp.deposited) && lamp.deposited <= T.lantern_cost, 'invalid deposited');
      if ('lit' in lamp) requireValid(typeof lamp.lit === 'boolean', 'invalid lit');
    }
  }
  return s;
}

export function validateInputs(doc) {
  requireValid(object(doc) && Array.isArray(doc.frames), 'inputs.frames must be an array');
  let previous = -1;
  for (const frame of doc.frames) {
    requireValid(object(frame) && count(frame.tick) && frame.tick > previous, 'input ticks must strictly increase');
    previous = frame.tick;
    if ('move' in frame) requireValid(Array.isArray(frame.move) && frame.move.length === 2 && frame.move.every(n => number(n) && Math.abs(n) <= 1), 'move components must be in [-1,1]');
    if ('cam_yaw_deg' in frame) requireValid(number(frame.cam_yaw_deg), 'invalid cam_yaw_deg');
    for (const key of ['jump', 'interact', 'pulse', 'dash']) if (key in frame) requireValid(typeof frame[key] === 'boolean', key + ' must be boolean');
  }
  return doc.frames;
}

export class Game {
  constructor(seed = 1, scenario = {}) {
    validateScenario(scenario);
    this.rng = (seed >>> 0) || 0x9e3779b9;
    this.tick = 0; this.state = 'playing'; this.score = 0;
    this.startTime = scenario.time_left_s ?? T.night1_duration_s;
    this.time_left_s = this.startTime;
    this.player = { pos: [0, 0, 0], carried: 0, flames: T.flames, ...structuredClone(scenario.player ?? {}) };
    this.vy = 0; this.hitUntil = 0; this.pulseUntil = 0;
    this.input = { move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false };
    this.randomMotes = scenario.random_motes ?? true;
    this.randomShades = scenario.random_shades ?? true;
    this.nextMote = 0; this.nextShade = 0;
    this.motes = []; this.shades = []; this.events = [];
    this.lanterns = Array.from({ length: 5 }, (_, i) => ({ id: `L${i + 1}`, pos: [Math.sin(i * Math.PI * 2 / 5) * 19, 0, Math.cos(i * Math.PI * 2 / 5) * 19], lit: false, deposited: 0 }));
    for (const patch of scenario.lanterns ?? []) {
      const lamp = this.lanterns.find(l => l.id === patch.id);
      Object.assign(lamp, structuredClone(patch));
      lamp.lit = lamp.lit || lamp.deposited === T.lantern_cost;
      if (lamp.lit) lamp.deposited = T.lantern_cost;
    }
    for (const pos of scenario.motes ?? (this.randomMotes ? Array.from({ length: 100 }, () => this.randomPos(27)) : [])) this.addMote(pos);
    const initial = scenario.shades ?? (this.randomShades ? Array.from({ length: 3 }, () => ({ pos: this.randomPos(27, 22) })) : []);
    this.reservedShadeIds = new Set(initial.filter(s => s.id).map(s => s.id));
    for (const shade of initial) this.addShade(shade.pos, shade.id);
  }
  random() {
    let n = this.rng; n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
    this.rng = n >>> 0; return this.rng / 4294967296;
  }
  randomPos(max, min = 0) {
    const angle = this.random() * Math.PI * 2;
    const r = Math.sqrt(min * min + this.random() * (max * max - min * min));
    return [Math.sin(angle) * r, 0, Math.cos(angle) * r];
  }
  addMote(pos, readyAt = 0) { this.motes.push({ id: `M${++this.nextMote}`, pos: [...pos], readyAt }); }
  addShade(pos, id) {
    if (!id) do { id = `S${++this.nextShade}`; } while (this.reservedShadeIds.has(id) || this.shades.some(s => s.id === id));
    const shade = { id, pos: [...pos], state: 'chase', stunnedUntil: 0 };
    this.shades.push(shade); return shade;
  }
  event(name, data) { this.events.push({ type: 'event', tick: this.tick, name, data }); }
  safe(pos) { return this.lanterns.some(l => l.lit && distance(pos, l.pos) <= T.safe_radius); }
  repel(pos) {
    let result = [...pos];
    // ponytail: a few circular zones; bounded projection suffices for five lamps.
    for (let pass = 0; pass < 10; pass++) {
      let changed = false;
      for (const l of this.lanterns.filter(l => l.lit)) {
        const d = distance(result, l.pos);
        if (d <= T.safe_radius) {
          const dx = d ? (result[0] - l.pos[0]) / d : 1;
          const dz = d ? (result[2] - l.pos[2]) / d : 0;
          result[0] = l.pos[0] + dx * (T.safe_radius + 0.001);
          result[2] = l.pos[2] + dz * (T.safe_radius + 0.001); changed = true;
        }
      }
      if (!changed) break;
    }
    return result;
  }
  step(patch = {}) {
    if (this.state !== 'playing') return [];
    const previous = this.input; this.input = { ...previous, ...patch };
    const input = this.input, pressed = key => input[key] && !previous[key];
    this.tick++; this.events = [];
    this.time_left_s = Math.max(0, this.startTime - this.tick / HZ);
    const p = this.player;
    if (p.flames <= 0) { this.finish('lost', 'no_flames'); return this.events; }
    let [x, z] = input.move; const length = Math.hypot(x, z);
    if (length > 1) { x /= length; z /= length; }
    const theta = input.cam_yaw_deg * Math.PI / 180;
    p.pos[0] += (x * Math.cos(theta) + z * Math.sin(theta)) * T.player_speed / HZ;
    p.pos[2] += (-x * Math.sin(theta) + z * Math.cos(theta)) * T.player_speed / HZ;
    const radius = Math.hypot(p.pos[0], p.pos[2]);
    if (radius > ISLAND_RADIUS) { p.pos[0] *= ISLAND_RADIUS / radius; p.pos[2] *= ISLAND_RADIUS / radius; }
    if (pressed('jump') && p.pos[1] <= 0) this.vy = 7;
    if (p.pos[1] > 0 || this.vy > 0) {
      p.pos[1] = Math.max(0, p.pos[1] + this.vy / HZ); this.vy -= 18 / HZ;
      if (p.pos[1] === 0) this.vy = 0;
    }
    this.motes = this.motes.filter(m => {
      if (p.carried < T.carry_capacity && this.tick >= m.readyAt && distance(p.pos, m.pos) <= T.pickup_radius) {
        p.carried++; this.score += T.score.per_mote; this.event('mote_picked', { carried: p.carried }); return false;
      }
      return true;
    });
    if (pressed('interact')) {
      const l = this.lanterns.filter(l => !l.lit && distance(p.pos, l.pos) <= T.interact_radius).sort((a, b) => distance(p.pos, a.pos) - distance(p.pos, b.pos))[0];
      if (l && p.carried > 0) {
        const amount = Math.min(p.carried, T.lantern_cost - l.deposited);
        p.carried -= amount; l.deposited += amount;
        this.event('deposit', { lantern_id: l.id, amount, deposited: l.deposited });
        if (l.deposited === T.lantern_cost) { l.lit = true; this.score += T.score.per_lantern; this.event('lantern_lit', { lantern_id: l.id }); }
      }
    }
    if (pressed('pulse') && p.carried >= T.pulse_cost && this.tick >= this.pulseUntil) {
      p.carried -= T.pulse_cost; this.pulseUntil = this.tick + T.pulse_cooldown_s * HZ;
      const ids = [];
      for (const s of this.shades) if (distance(p.pos, s.pos) <= T.pulse_radius) {
        const d = distance(s.pos, p.pos);
        s.pos[0] += (d ? (s.pos[0] - p.pos[0]) / d : 1) * T.pulse_push_m;
        s.pos[2] += (d ? (s.pos[2] - p.pos[2]) / d : 0) * T.pulse_push_m;
        s.stunnedUntil = this.tick + T.pulse_stun_s * HZ; s.state = 'stunned'; ids.push(s.id);
      }
      this.score += ids.length * T.score.per_stun; this.event('pulse', { stunned_ids: ids });
    }
    for (const s of this.shades) {
      s.pos = this.repel(s.pos);
      if (this.tick < s.stunnedUntil) { s.state = 'stunned'; continue; }
      s.state = 'chase';
      const d = distance(p.pos, s.pos), amount = Math.min(d, T.shade_speed / HZ);
      const candidate = [...s.pos];
      if (d) { candidate[0] += (p.pos[0] - s.pos[0]) / d * amount; candidate[2] += (p.pos[2] - s.pos[2]) / d * amount; }
      s.pos = this.repel(candidate);
      if (!this.safe(p.pos) && this.tick >= this.hitUntil && distance(p.pos, s.pos) <= T.shade_hit_radius) {
        p.flames--; this.hitUntil = this.tick + T.invuln_s * HZ;
        const dropped = Math.floor(p.carried * T.hit_drop_ratio); p.carried -= dropped;
        for (let i = 0; i < dropped; i++) this.addMote([p.pos[0], 0, p.pos[2]], this.hitUntil);
        this.event('player_hit', { by: 'shade', flames: p.flames, dropped });
      }
    }
    if (p.flames <= 0) this.finish('lost', 'no_flames');
    else if (this.lanterns.every(l => l.lit)) this.finish('won', 'all_lit');
    else if (this.time_left_s <= 0) this.finish('lost', 'dawn');
    if (this.state === 'playing') {
      if (this.randomMotes && this.tick % 120 === 0 && this.motes.length < 130) for (let i = 0; i < 3; i++) this.addMote(this.randomPos(27));
      if (this.randomShades && this.tick % 720 === 0 && this.shades.length < 12) {
        const s = this.addShade(this.repel(this.randomPos(28, 25))); this.event('shade_spawned', { id: s.id });
      }
    }
    return this.events;
  }
  finish(state, reason) {
    this.state = state;
    if (state === 'won') this.score += Math.floor(this.time_left_s) * T.score.per_second_left + this.player.flames * T.score.per_flame_left;
    this.event('game_over', { result: state, reason });
  }
  snapshot() {
    return {
      type: 'snapshot', tick: this.tick, sim_tick: this.tick, state: this.state, time_left_s: this.time_left_s, score: this.score,
      player: { pos: this.player.pos.map(round), flames: this.player.flames, carried: this.player.carried },
      lanterns: this.lanterns.map(l => ({ ...l, pos: l.pos.map(round) })),
      shades: this.shades.map(s => ({ id: s.id, pos: s.pos.map(round), state: s.state })),
      motes_active: this.motes.length, motes: this.motes.map(m => ({ id: m.id, pos: m.pos.map(round) }))
    };
  }
}
