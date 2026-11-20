import { tuning as T } from './config.js';
import { levelFor, surfaces, groundAt, blocked } from './levels.js';
import { validateScenario, capacityFor } from './validation.js';
export { validateScenario, validateInputs } from './validation.js';
export { T };
export const HZ = 60;
const dXZ = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const rounded = p => p.map(n => Number(n.toFixed(3)));
const direction = (from, to) => { const d = dXZ(from, to); return d ? [(to[0] - from[0]) / d, (to[2] - from[2]) / d] : [1, 0]; };
const idOrder = (a, b) => Number(a.id.match(/\d+$/)?.[0] ?? 0) - Number(b.id.match(/\d+$/)?.[0] ?? 0) || a.id.localeCompare(b.id, 'en');

export class Game {
  constructor(seed = 1, scenario = {}, night = 1) {
    this.level = levelFor(night); validateScenario(scenario, night); this.night = night;
    this.rng = (seed >>> 0) || 0x9e3779b9;
    this.tick = 0; this.sim_tick = 0; this.state = 'playing'; this.score = 0; this.events = [];
    this.startTime = scenario.time_left_s ?? this.level.duration; this.time_left_s = this.startTime;
    const p = scenario.player ?? {};
    this.player = { pos: [...(p.pos ?? this.level.spawn)], vel: [...(p.vel ?? [0, 0, 0])], carried: p.carried ?? 0, flames: p.flames ?? T.flames };
    this.successfulLights = p.successful_lights ?? 0;
    Object.defineProperty(this.player, 'capacity', { get: () => capacityFor(this.successfulLights) });
    this.player.grounded = surfaces(this.level, this.player.pos[0], this.player.pos[2]).some(h => Math.abs(h - this.player.pos[1]) < .001);
    this.invuln = p.invuln_ticks ?? 0; this.dashCd = p.dash_cd_ticks ?? 0; this.pulseCd = p.pulse_cd_ticks ?? 0; this.charmTicks = p.charm_ticks ?? 0;
    this.dashTicks = 0; this.dashDir = [0, 1]; this.facing = [0, 1]; this.dashVy = null; this.dashAir = false; this.launch = null; this.respawnTicks = 0;
    this.input = { move: [0, 0], cam_yaw_deg: 0, jump: false, dash: false, pulse: false, interact: false, pause: false };
    this.randomMotes = scenario.random_motes ?? true; this.randomShades = scenario.random_shades ?? true;
    this.randomDrifters = scenario.random_drifters ?? true; this.windEnabled = (scenario.wind_enabled ?? true) && night === 3;
    this.wind = { active: false, dir_deg: 0, warning: false };
    this.nextMote = 0; this.nextShade = 0; this.nextDrifter = 0;
    this.motes = []; this.shades = []; this.drifters = [];
    this.lanterns = this.level.lamps.map((pos, i) => ({ id: `L${i + 1}`, pos: [...pos], lit: false, deposited: 0, fuelUnits: 0, ever_lit: false, relit_count: 0, get fuel() { return this.fuelUnits / HZ; } }));
    for (const patch of scenario.lanterns ?? []) {
      const l = this.lanterns.find(l => l.id === patch.id);
      if (patch.pos) l.pos = [...patch.pos]; l.deposited = patch.deposited ?? l.deposited;
      l.ever_lit = patch.ever_lit ?? false;
      l.lit = patch.lit === true || l.deposited >= this.lanternCost(l);
      if (l.lit) { l.ever_lit = true; l.fuelUnits = Math.round((patch.fuel ?? T.fuel_max) * HZ); l.deposited = patch.deposited ?? T.lantern_cost; }
    }
    if (scenario.motes) for (const m of scenario.motes) this.addMote(Array.isArray(m) ? m : m.pos, m.kind ?? 'random', m.ttl_ticks ?? 480, 0);
    else if (this.randomMotes) { const points = [...this.level.motePoints]; for (let i = 0; i < 20; i++) this.addMote(points.splice(Math.floor(this.random() * points.length), 1)[0]); }
    this.reservedShadeIds = new Set((scenario.shades ?? []).map(s => s.id).filter(Boolean));
    this.reservedDrifterIds = new Set((scenario.drifters ?? []).map(s => s.id).filter(Boolean));
    for (const s of scenario.shades ?? []) this.addShade(s.pos, s.id, s.state ?? 'wander', s.state_ticks_left ?? 0, s.target_lantern_id);
    for (const s of scenario.drifters ?? []) this.addDrifter(s.pos, s.id, s.state ?? 'idle', s.stolen ?? 0, s.state_ticks_left ?? 240);
    this.charms = (scenario.charms ?? this.level.charms).map(c => ({ id: c.id, pos: [...(c.pos ?? this.level.charms.find(x => x.id === c.id).pos)], available: c.available ?? true, respawnTicks: c.respawn_ticks ?? Math.round((c.respawn_s ?? 0) * HZ) }));
  }
  random() { let n = this.rng; n ^= n << 13; n ^= n >>> 17; n ^= n << 5; this.rng = n >>> 0; return this.rng / 4294967296; }
  choose(list) { return list.length ? list[Math.floor(this.random() * list.length)] : null; }
  event(name, data = {}) { this.events.push({ type: 'event', tick: this.tick, name, data }); }
  addMote(pos, kind = 'random', ttl = 480, readyAt = this.sim_tick + 1) {
    this.motes.push({ id: `M${++this.nextMote}`, pos: [...pos], kind, ttl: kind === 'dropped' ? ttl : null, readyAt });
  }
  addShade(pos, id, state = 'spawning', ticks = 30, target = null) {
    if (!id) do { id = `S${++this.nextShade}`; } while (this.reservedShadeIds.has(id) || this.shades.some(s => s.id === id));
    const a = this.random() * 2 * Math.PI;
    const s = { id, pos: [...pos], state, ticks, target_lantern_id: target, drainTicks: 0, dir: [Math.cos(a), Math.sin(a)], pushTicks: 0, pushLeft: state === 'recoil' ? ticks * 2 / 60 : 0, pushDir: direction(this.player.pos, pos) }; this.shades.push(s); return s;
  }
  addDrifter(pos, id, state = 'idle', stolen = 0, ticks = 240) {
    if (!id) do { id = `D${++this.nextDrifter}`; } while (this.reservedDrifterIds.has(id) || this.drifters.some(s => s.id === id));
    const d = { id, pos: [...pos], state, stolen, ticks, dir: direction(this.player.pos, pos) }; this.drifters.push(d); return d;
  }
  lanternCost(l) { return l.ever_lit ? T.relight_cost : T.lantern_cost; }
  canReceive(l) { return !l.lit || l.fuelUnits < T.fuel_max * HZ; }
  protects(l) { return l.lit && l.fuelUnits >= T.low_fuel_threshold * HZ; }
  safe(pos) { return this.lanterns.some(l => this.protects(l) && dXZ(pos, l.pos) <= T.safe_radius); }
  updateFuel() {
    const active = new Set();
    for (const l of this.lanterns) {
      if (!l.lit) continue;
      const drainers = this.shades.filter(s => s.state === 'drain' && s.target_lantern_id === l.id && l.fuelUnits < T.low_fuel_threshold * HZ && dXZ(s.pos, l.pos) <= 2).sort(idOrder);
      l.fuelUnits = Math.max(0, l.fuelUnits - T.fuel_decay_per_s - T.drain_per_s * drainers.length);
      for (const s of drainers) {
        active.add(s); s.drainTicks++;
        if (s.drainTicks % HZ === 0) this.event('fuel_drain', { lantern_id: l.id, shade_id: s.id, fuel: Number(l.fuel.toFixed(1)) });
      }
      if (l.fuelUnits === 0) { l.lit = false; l.deposited = 0; this.event('lantern_out', { lantern_id: l.id }); }
    }
    for (const s of this.shades) if (!active.has(s)) s.drainTicks = 0;
  }
  interact() {
    const p = this.player;
    if (p.carried === 0) return;
    const l = this.lanterns.filter(l => this.canReceive(l) && dXZ(p.pos, l.pos) <= T.interact_radius).sort((a, b) => dXZ(p.pos, a.pos) - dXZ(p.pos, b.pos) || idOrder(a, b))[0];
    if (!l) return;
    if (l.lit) {
      const amount = Math.min(p.carried, Math.ceil((T.fuel_max * HZ - l.fuelUnits) / (T.fuel_per_mote * HZ)));
      if (amount === 0) return;
      p.carried -= amount; l.fuelUnits = Math.min(T.fuel_max * HZ, l.fuelUnits + T.fuel_per_mote * HZ * amount); this.score += amount * T.score.per_mote;
      this.event('refuel', { lantern_id: l.id, amount, fuel: Number(l.fuel.toFixed(1)) });
    } else {
      const cost = this.lanternCost(l), amount = Math.min(p.carried, cost - l.deposited);
      p.carried -= amount; l.deposited += amount; this.score += amount * T.score.per_mote;
      this.event('deposit', { lantern_id: l.id, amount, deposited: l.deposited });
      if (l.deposited === cost) {
        const relight = l.ever_lit; l.lit = true; l.ever_lit = true; l.fuelUnits = T.fuel_max * HZ;
        if (relight) l.relit_count++;
        this.successfulLights++; this.score += relight ? T.score.per_relight : T.score.per_lantern;
        this.event('lantern_lit', { lantern_id: l.id, relight });
      }
    }
  }
  repel(pos) {
    const out = [...pos];
    // ponytail: bounded projection across at most seven standard safety circles.
    for (let pass = 0; pass < 10; pass++) {
      let changed = false;
      for (const l of this.lanterns) if (this.protects(l) && dXZ(out, l.pos) < T.safe_radius) {
        const dir = direction(l.pos, out); out[0] = l.pos[0] + dir[0] * T.safe_radius; out[2] = l.pos[2] + dir[1] * T.safe_radius; changed = true;
      }
      if (!changed) break;
    }
    return out;
  }
  horizontal(pos, dx, dz) {
    let out = [...pos];
    for (const [axis, delta] of [[0, dx], [2, dz]]) { const next = [...out]; next[axis] += delta; if (!blocked(this.level, out, next)) out = next; }
    return out;
  }
  repelShade(s) {
    const pos = this.repel(s.pos);
    if (dXZ(pos, s.pos) > 1e-9) s.repelledTick = this.sim_tick;
    s.pos = pos;
  }
  moveShade(s, dir, amount, push = false) {
    const feet = [s.pos[0], s.pos[1] - .8, s.pos[2]], direct = [feet[0] + dir[0] * amount, feet[1], feet[2] + dir[1] * amount];
    if (push && blocked(this.level, feet, direct)) return false;
    const next = push ? direct : this.horizontal(feet, dir[0] * amount, dir[1] * amount);
    const oldGround = groundAt(this.level, s.pos[0], s.pos[2]);
    const h = groundAt(this.level, next[0], next[2]);
    if (h !== null && h <= feet[1] + .15) { s.pos[0] = next[0]; s.pos[2] = next[2]; s.pos[1] += h - (oldGround ?? h); }
    this.repelShade(s);
    return h !== null && h <= feet[1] + .15;
  }
  movePlayer(pressed) {
    const p = this.player, old = [...p.pos];
    let [x, z] = this.input.move, len = Math.hypot(x, z); if (len > 1) { x /= len; z /= len; }
    const a = this.input.cam_yaw_deg * Math.PI / 180, move = [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)];
    if (len > 0) this.facing = direction([0, 0, 0], [move[0], 0, move[1]]);
    const pad = p.grounded && this.level.pads.find(b => dXZ(p.pos, b.pos) <= 1 && Math.abs(p.pos[1] - b.pos[1]) < .1);
    if (pressed('jump') && p.grounded) { p.vel[1] = T.jump_speed; p.grounded = false; this.event('jump'); }
    if (pad) { const dir = direction(p.pos, pad.target); this.launch = [dir[0] * pad.speed, dir[1] * pad.speed]; p.vel[1] = pad.up; p.grounded = false; this.event('jump_pad'); }
    if (this.launch) this.facing = direction([0, 0, 0], [this.launch[0], 0, this.launch[1]]);
    if (pressed('dash') && this.dashTicks === 0 && (this.dashCd === 0 || this.charmTicks > 0)) {
      this.dashDir = [...this.facing]; this.dashTicks = 12; this.dashCd = this.charmTicks > 0 ? 0 : 90; this.dashVy = p.vel[1]; this.dashAir = !p.grounded; this.event('dash');
    }
    const dash = this.dashTicks > 0, speed = this.charmTicks > 0 ? 7.2 : T.player_speed;
    if (dash) this.facing = [...this.dashDir];
    if (!dash && this.dashVy !== null) { p.vel[1] = this.dashVy; this.dashVy = null; }
    const horizontal = dash ? this.dashDir.map(n => n * T.dash_speed) : this.launch ?? move.map(n => n * speed);
    const windAngle = this.wind.dir_deg * Math.PI / 180;
    p.vel[0] = horizontal[0] + (this.wind.active ? Math.cos(windAngle) * 2 : 0);
    p.vel[2] = horizontal[1] + (this.wind.active ? Math.sin(windAngle) * 2 : 0);
    p.pos = this.horizontal(p.pos, p.vel[0] / HZ, p.vel[2] / HZ);
    const ground = groundAt(this.level, p.pos[0], p.pos[2]);
    if (dash) {
      if (!this.dashAir && ground !== null && Math.abs(ground - old[1]) <= .15) { p.pos[1] = ground; p.grounded = true; }
      else { this.dashAir = true; p.grounded = false; }
      p.vel[1] = 0;
    } else {
      if (p.grounded && ground !== null && Math.abs(ground - old[1]) <= .15) { p.pos[1] = ground; p.vel[1] = 0; }
      else {
        p.grounded = false; const nextY = p.pos[1] + p.vel[1] / HZ + T.gravity / (2 * HZ * HZ); p.vel[1] += T.gravity / HZ;
        const landing = surfaces(this.level, p.pos[0], p.pos[2]).find(h => old[1] >= h - .001 && nextY <= h && p.vel[1] <= 0);
        if (landing !== undefined) { p.pos[1] = landing; p.vel[1] = 0; p.grounded = true; this.launch = null; }
        else p.pos[1] = nextY;
      }
    }
    if (dash) this.dashTicks--;
    p.vel[0] = (p.pos[0] - old[0]) * HZ; p.vel[2] = (p.pos[2] - old[2]) * HZ;
    if (p.pos[1] < -10) {
      const lost = p.carried; p.carried = 0; p.flames--; p.vel = [0, 0, 0]; this.launch = null; this.dashTicks = 0; this.dashVy = null; this.respawnTicks = 60;
      this.event('player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
    }
  }
  dropMotes(amount, pos, scatter) {
    for (let i = 0; i < amount; i++) {
      const angle = this.random() * Math.PI * 2, radius = scatter ? 1.5 + this.random() : 0;
      const x = pos[0] + Math.cos(angle) * radius, z = pos[2] + Math.sin(angle) * radius;
      this.addMote([x, groundAt(this.level, x, z) ?? pos[1], z], 'dropped');
    }
  }
  pulse() {
    if (this.player.carried < T.pulse_cost || this.pulseCd > 0) return;
    this.player.carried -= T.pulse_cost; this.pulseCd = 180;
    const center = [...this.player.pos]; center[1] += .8; const ids = [];
    let points = 0;
    for (const s of this.shades) if (d3(center, s.pos) <= T.pulse_radius) {
      points += s.state === 'drain' ? T.score.per_drain_stun : T.score.per_stun;
      s.target_lantern_id = null; s.drainTicks = 0;
      s.state = 'stunned'; s.ticks = 120; s.pushTicks = 15; s.pushLeft = 4; s.pushDir = direction(this.player.pos, s.pos); ids.push(s.id);
    }
    for (const d of this.drifters) if (d.state !== 'removed' && d3(center, d.pos) <= T.pulse_radius) {
      if (d.state === 'chase') { d.state = 'flee'; d.ticks = 240; d.dir = direction(this.player.pos, d.pos); }
      else if (d.state === 'flee' && d.stolen > 0) { const amount = d.stolen; d.stolen = 0; d.ticks = 120; this.dropMotes(amount, d.pos, false); this.event('drifter_drop', { drifter_id: d.id, amount }); }
    }
    this.score += points; this.event('pulse', { stunned_ids: ids });
  }
  step(patch = {}) {
    if (['won', 'lost'].includes(this.state)) return [];
    const previous = this.input; this.input = { ...previous, ...patch }; const pressed = key => this.input[key] && !previous[key];
    this.tick++; this.events = [];
    if (pressed('pause')) { this.state = this.state === 'paused' ? 'playing' : 'paused'; this.event(this.state === 'paused' ? 'paused' : 'resumed'); }
    if (this.state === 'paused') return this.events;
    if (this.sim_tick === 0) this.event('night_start', { night: this.night });
    this.sim_tick++; this.time_left_s = Math.max(0, this.startTime - this.sim_tick / HZ);
    this.updateFuel();
    for (const key of ['invuln', 'dashCd', 'pulseCd', 'charmTicks']) this[key] = Math.max(0, this[key] - 1);
    for (const s of this.shades) { s.ticks = Math.max(0, s.ticks - 1); s.pushTicks = Math.max(0, s.pushTicks - 1); }
    for (const d of this.drifters) if (d.state === 'flee') d.ticks = Math.max(0, d.ticks - 1);
    for (const c of this.charms) if (!c.available && c.respawnTicks > 0 && --c.respawnTicks === 0) c.available = true;
    this.motes = this.motes.filter(m => m.ttl === null || --m.ttl > 0);
    const windPhase = this.sim_tick % 1800;
    this.wind.warning = this.windEnabled && windPhase >= 1680;
    if (this.windEnabled && windPhase === 1680) this.wind.dir_deg = this.random() * 360;
    this.wind.active = this.windEnabled && this.sim_tick >= 1800 && windPhase < 300;
    let recovering = this.respawnTicks > 0;
    if (recovering && --this.respawnTicks === 0) { this.player.pos = [...this.level.spawn]; this.player.vel = [0, 0, 0]; this.player.grounded = true; this.invuln = 90; }
    if (!recovering && this.player.flames > 0) this.movePlayer(pressed);
    recovering ||= this.respawnTicks > 0;
    const p = this.player;
    if (!recovering && p.flames > 0) {
      this.motes = this.motes.filter(m => {
        if (p.carried < p.capacity && this.sim_tick >= m.readyAt && dXZ(p.pos, m.pos) <= T.pickup_radius && Math.abs(p.pos[1] - m.pos[1]) <= 1.5) { p.carried++; this.event('mote_picked', { carried: p.carried }); return false; } return true;
      });
      for (const c of this.charms) if (c.available && dXZ(p.pos, c.pos) <= 1 && Math.abs(p.pos[1] - c.pos[1]) <= 1.5) {
        c.available = false; c.respawnTicks = 2700; this.charmTicks = 600; this.dashCd = 0; this.event('charm_picked', { charm_id: c.id, charm_ticks: 600 });
      }
      if (pressed('interact')) this.interact();
    }
    for (const s of this.shades) this.repelShade(s);
    if (!recovering && p.flames > 0 && pressed('pulse')) this.pulse();
    for (const s of this.shades) {
      if (s.state === 'spawning' && s.ticks > 0) continue;
      if (s.state === 'stunned' && s.ticks > 0) {
        if (s.pushTicks > 0) { const amount = s.pushLeft / s.pushTicks; if (!this.moveShade(s, s.pushDir, amount, true)) s.pushTicks = 0; s.pushLeft -= amount; } continue;
      }
      if (s.state === 'recoil' && s.ticks > 0) { const amount = s.pushLeft / s.ticks; this.moveShade(s, s.pushDir, amount); s.pushLeft -= amount; continue; }
      if (s.state === 'stunned') { s.state = 'wander'; s.target_lantern_id = null; continue; }
      if (['spawning', 'recoil'].includes(s.state)) s.state = 'wander';
      if (s.state === 'drain') {
        const target = this.lanterns.find(l => l.id === s.target_lantern_id);
        if (!target || !target.lit || this.protects(target) || dXZ(s.pos, target.pos) > 2) { s.state = 'wander'; s.target_lantern_id = null; s.drainTicks = 0; continue; }
        if (dXZ(p.pos, s.pos) <= 6) { s.state = 'chase'; s.target_lantern_id = null; s.drainTicks = 0; }
        else continue;
      }
      const distance = dXZ(p.pos, s.pos);
      if (s.state === 'chase' && distance > 18) s.state = 'wander';
      if (s.state === 'wander' && distance <= 12) s.state = 'chase';
      if (s.state === 'chase') { s.target_lantern_id = null; this.moveShade(s, direction(s.pos, p.pos), this.level.shadeSpeed / HZ); }
      else {
        const weak = this.lanterns.filter(l => l.lit && !this.protects(l));
        const targets = weak.length ? weak : this.lanterns.filter(l => !l.lit);
        const target = targets.sort((a, b) => dXZ(s.pos, a.pos) - dXZ(s.pos, b.pos) || idOrder(a, b))[0];
        s.target_lantern_id = target?.id ?? null;
        const isWeak = target?.lit && !this.protects(target);
        if (!(isWeak && dXZ(s.pos, target.pos) <= 2)) this.moveShade(s, target ? direction(s.pos, target.pos) : s.dir, 2 / HZ);
        if (isWeak && dXZ(s.pos, target.pos) <= 2) { s.state = 'drain'; s.drainTicks = 0; }
      }
    }
    for (const d of this.drifters) {
      if (d.state === 'removed') continue;
      if (d.state !== 'flee') d.state = p.carried >= 5 && dXZ(p.pos, d.pos) <= 15 ? 'chase' : 'idle';
      const dir = d.state === 'chase' ? direction(d.pos, p.pos) : d.dir, speed = d.state === 'idle' ? 2 : 7;
      d.pos[0] += dir[0] * speed / HZ; d.pos[2] += dir[1] * speed / HZ;
      if (d.state === 'flee' && d.ticks === 0) d.state = 'removed';
    }
    if (!recovering && p.flames > 0) {
      for (const d of [...this.drifters].sort(idOrder)) if (d.state === 'chase' && dXZ(p.pos, d.pos) <= 1.2) {
        const amount = Math.min(3, p.carried); p.carried -= amount; d.stolen = amount; d.state = 'flee'; d.ticks = 240; d.dir = direction(p.pos, d.pos); this.event('drifter_steal', { drifter_id: d.id, amount, carried: p.carried });
      }
      if (this.invuln === 0 && !this.safe(p.pos)) for (const s of [...this.shades].sort(idOrder)) if (s.repelledTick !== this.sim_tick && ['wander', 'chase'].includes(s.state) && dXZ(p.pos, s.pos) <= 1 && Math.abs(p.pos[1] - s.pos[1]) <= 1.5) {
        const dropped = Math.floor(p.carried / 2); p.carried -= dropped; p.flames--; this.invuln = 90; this.dropMotes(dropped, p.pos, true);
        s.state = 'recoil'; s.ticks = 60; s.pushDir = direction(p.pos, s.pos); s.pushLeft = 2 - 2 / 60; this.moveShade(s, s.pushDir, 2 / 60);
        this.event('player_hit', { by: 'shade', flames: p.flames, dropped }); break;
      }
    }
    if (this.randomMotes && this.sim_tick % 240 === 0 && this.motes.length < 30) {
      const pos = this.choose(this.level.motePoints.filter(p => !this.motes.some(m => d3(m.pos, p) < .01))); if (pos) this.addMote(pos);
    }
    if (this.randomShades && (this.sim_tick === 300 || this.sim_tick > 300 && (this.sim_tick - 300) % this.level.shadeInterval === 0)) {
      for (let i = 0; i < (this.sim_tick === 300 ? 2 : 1) && this.shades.length < this.level.shadeMax; i++) {
        const pos = this.choose(this.level.shadePoints.filter(pos => dXZ(pos, p.pos) >= 15 && !this.safe(pos) && !this.shades.some(s => dXZ(pos, s.pos) < 1)));
        if (pos) { const at = [...pos]; at[1] += .8; const s = this.addShade(at); this.event('shade_spawned', { id: s.id }); }
      }
    }
    if (this.night > 1 && this.randomDrifters && this.sim_tick % 1200 === 0 && this.drifters.filter(d => d.state !== 'removed').length < 2) {
      const pos = [...this.choose(this.level.shadePoints)]; pos[1] += .8; this.addDrifter(pos);
    }
    if (p.flames <= 0) this.finish('lost', 'no_flames');
    else if (this.time_left_s <= 0) {
      const survived = this.lanterns.filter(l => l.lit).length >= Math.ceil(T.win_ratio * this.lanterns.length);
      this.finish(survived ? 'won' : 'lost', survived ? 'dawn_survived' : 'dawn');
    }
    return this.events;
  }
  finish(state, reason) {
    this.state = state;
    if (state === 'won') this.score += this.lanterns.filter(l => l.lit).reduce((sum, l) => sum + T.score.per_lit_at_dawn + Math.floor(l.fuel), 0) + this.player.flames * T.score.per_flame_left;
    this.event('game_over', { result: state, reason });
  }
  snapshot() {
    const p = this.player;
    return { type: 'snapshot', tick: this.tick, sim_tick: this.sim_tick, night: this.night, state: this.state, time_left_s: this.time_left_s, score: this.score,
      wind: { active: this.wind.active, dir_deg: this.wind.dir_deg },
      player: { pos: rounded(p.pos), vel: rounded(p.vel), flames: p.flames, carried: p.carried, capacity: p.capacity, grounded: p.grounded, invuln: this.invuln > 0, dash_cd_s: this.dashCd / HZ, pulse_cd_s: this.pulseCd / HZ, charm_s: this.charmTicks / HZ },
      lanterns: this.lanterns.map(l => ({ id: l.id, pos: rounded(l.pos), lit: l.lit, deposited: l.deposited, fuel: l.lit ? Number(l.fuel.toFixed(1)) : 0, ever_lit: l.ever_lit, relit_count: l.relit_count })),
      shades: this.shades.map(s => ({ id: s.id, pos: rounded(s.pos), state: s.state, target_lantern_id: s.target_lantern_id })),
      motes_active: this.motes.length, motes: this.motes.map(m => ({ id: m.id, pos: rounded(m.pos), kind: m.kind, ttl_s: m.ttl === null ? null : m.ttl / HZ })),
      drifters: this.drifters.map(d => ({ id: d.id, pos: rounded(d.pos), state: d.state, stolen: d.stolen })),
      charms: this.charms.map(c => ({ id: c.id, available: c.available, respawn_s: c.respawnTicks / HZ })) };
  }
}
