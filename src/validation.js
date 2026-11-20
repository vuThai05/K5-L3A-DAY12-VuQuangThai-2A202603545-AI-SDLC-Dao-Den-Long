import { tuning as T } from './config.js';
import { levelFor } from './levels.js';
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const number = x => typeof x === 'number' && Number.isFinite(x);
const count = x => Number.isSafeInteger(x) && x >= 0;
export const position = x => Array.isArray(x) && x.length === 3 && x.every(number);
function valid(ok, msg) { if (!ok) throw new Error(msg); }
function timerFields(o, keys) { for (const key of keys) if (key in o) valid(count(o[key]), `invalid ${key}`); }
function entities(list, name, check) {
  valid(Array.isArray(list), `invalid ${name}`); const ids = new Set();
  for (const entry of list) {
    valid(object(entry), `invalid ${name} entry`);
    if ('id' in entry) { valid(typeof entry.id === 'string' && entry.id.length > 0 && !ids.has(entry.id), `invalid/duplicate ${name} id`); ids.add(entry.id); }
    check(entry);
  }
}
export function validateScenario(s, night = 1) {
  const level = levelFor(night); valid(object(s), 'scenario must be an object');
  for (const k of ['random_motes', 'random_shades', 'random_drifters', 'wind_enabled']) if (k in s) valid(typeof s[k] === 'boolean', `invalid ${k}`);
  if ('time_left_s' in s) valid(number(s.time_left_s) && s.time_left_s >= 0, 'invalid time_left_s');
  if ('player' in s) {
    const p = s.player; valid(object(p), 'invalid player');
    if ('pos' in p) valid(position(p.pos), 'invalid player.pos');
    if ('vel' in p) valid(position(p.vel), 'invalid player.vel');
    if ('carried' in p) valid(count(p.carried) && p.carried <= T.carry_capacity, 'invalid player.carried');
    if ('flames' in p) valid(count(p.flames) && p.flames <= T.flames, 'invalid player.flames');
    timerFields(p, ['invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks']);
  }
  if ('motes' in s) {
    valid(Array.isArray(s.motes), 'invalid motes');
    for (const m of s.motes) {
      valid(position(m) || object(m) && position(m.pos), 'invalid mote.pos');
      if (object(m)) { if ('kind' in m) valid(['random', 'dropped'].includes(m.kind), 'invalid mote.kind'); timerFields(m, ['ttl_ticks']); }
    }
  }
  if ('lanterns' in s) entities(s.lanterns, 'lantern', l => {
    valid(level.lamps.some((_, i) => l.id === `L${i + 1}`), 'invalid lantern id');
    if ('pos' in l) valid(position(l.pos), 'invalid lantern.pos');
    if ('deposited' in l) valid(count(l.deposited) && l.deposited <= T.lantern_cost, 'invalid deposited');
    if ('lit' in l) valid(typeof l.lit === 'boolean', 'invalid lit');
  });
  if ('shades' in s) entities(s.shades, 'shade', e => {
    valid(position(e.pos), 'invalid shade.pos');
    if ('state' in e) valid(['spawning', 'wander', 'chase', 'recoil', 'stunned'].includes(e.state), 'invalid shade.state');
    timerFields(e, ['state_ticks_left']);
  });
  if ('drifters' in s) entities(s.drifters, 'drifter', e => {
    valid(position(e.pos), 'invalid drifter.pos');
    if ('state' in e) valid(['idle', 'chase', 'flee', 'removed'].includes(e.state), 'invalid drifter.state');
    timerFields(e, ['state_ticks_left', 'stolen']);
    if ('stolen' in e) valid(e.stolen <= 3, 'invalid stolen');
  });
  if ('charms' in s) entities(s.charms, 'charm', e => {
    valid(typeof e.id === 'string', 'charm id required');
    valid(position(e.pos) || level.charms.some(c => c.id === e.id), 'charm pos required');
    if ('available' in e) valid(typeof e.available === 'boolean', 'invalid charm.available');
    if ('respawn_s' in e) valid(number(e.respawn_s) && e.respawn_s >= 0, 'invalid respawn_s');
    timerFields(e, ['respawn_ticks']);
  });
  return s;
}
export function validateInputs(doc) {
  valid(object(doc) && Array.isArray(doc.frames), 'inputs.frames must be an array'); let last = -1;
  for (const f of doc.frames) {
    valid(object(f) && count(f.tick) && f.tick > last, 'input ticks must strictly increase'); last = f.tick;
    if ('move' in f) valid(Array.isArray(f.move) && f.move.length === 2 && f.move.every(n => number(n) && Math.abs(n) <= 1), 'invalid move');
    if ('cam_yaw_deg' in f) valid(number(f.cam_yaw_deg), 'invalid cam_yaw_deg');
    for (const k of ['jump', 'interact', 'pulse', 'dash', 'pause']) if (k in f) valid(typeof f[k] === 'boolean', `invalid ${k}`);
  }
  return doc.frames;
}
