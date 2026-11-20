import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Game } from '../src/game.js';
import { PALETTE } from '../src/levels.js';
import { DEFAULT_BINDINGS, ACTION_LABELS, validBindings, rebind, keyLabel } from '../src/controls.js';
import { loadScores, saveScore } from '../src/leaderboard.js';

test('UI flow, leaderboard, remapping, accessibility settings and event captions (DOM stub, no WebGL)', async () => {
  const html = readFileSync('index.html', 'utf8'), elements = new Map(), instances = [], saved = new Map();
  const ctx = new Proxy({}, { get: () => () => {} });
  for (const match of html.matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)) {
    const [, tag, id] = match; assert.ok(!elements.has(id), `duplicate id ${id}`);
    const classes = new Set();
    const el = { id, tag, hidden: /\bhidden\b/.test(match[0]), open: false, style: {}, children: [], listeners: {}, textContent: '', value: '',
      classList: { add: x => classes.add(x), remove: x => classes.delete(x), toggle: (x, on) => on ? classes.add(x) : classes.delete(x) },
      showModal() { this.open = true; }, close() { this.open = false; }, blur() {}, addEventListener(type, fn) { this.listeners[type] = fn; }, getContext: () => ctx, setPointerCapture() {} };
    let markup = ''; Object.defineProperty(el, 'innerHTML', { get() { return markup; }, set(text) { markup = text; this.children = [...text.matchAll(/<i>/g)].map(() => ({ classList: { toggle() {} } })); } });
    elements.set(id, el);
  }
  const get = id => { assert.ok(elements.has(id), `missing UI element ${id}`); return elements.get(id); };
  const doc = { getElementById: get, hidden: false, body: { classList: { add() {}, remove() {} } }, activeElement: { blur() {} }, addEventListener() {},
    querySelectorAll: () => [...elements.values()].filter(e => e.tag === 'dialog' && e.open), querySelector() { return this.querySelectorAll()[0] ?? null; } };
  let nextFrame, now = 0, colorblindView = false, reducedView = false; const listeners = {};
  const source = readFileSync('src/main.js', 'utf8').replace(/^import .*;\r?\n/gm, '');
  const environment = { document: doc, localStorage: { getItem: k => saved.get(k), setItem: (k, v) => saved.set(k, v) },
    Game: class extends Game { constructor(...args) { super(...args); instances.push(this); } }, C: PALETTE, DEFAULT_BINDINGS, ACTION_LABELS, validBindings, rebind, keyLabel, loadScores, saveScore,
    createScene: () => ({ load() {}, update() {}, pulse() {}, setColorblind(value) { colorblindView = value; }, setReducedMotion(value) { reducedView = value; }, project: () => ({ x: 0, y: 0, z: 0 }) }),
    createAudio: () => ({ activate() {}, volume() {}, effect() {}, music() {} }),
    performance: { now: () => now }, requestAnimationFrame: fn => { nextFrame = fn; }, addEventListener(type, fn) { listeners[type] = fn; }, console };
  doc.body.classList.toggle = () => {};
  vm.runInNewContext(source, { ...environment });
  assert.equal(get('error').hidden, true, get('error').textContent);
  const click = id => get(id).onclick(), step = () => { now += 17; nextFrame(now); };
  const game = () => instances.at(-1);
  click('start'); assert.equal(get('briefing').open, true); assert.equal(game().night, 1); click('begin-night'); step(); assert.equal(get('hud').hidden, false);
  click('settings-button'); step(); assert.equal(game().state, 'paused');
  get('volume').value = '.6'; get('volume').oninput(); assert.equal(JSON.parse(saved.get('lantern-settings')).volume, .6);
  get('colorblind').checked = true; get('colorblind').onchange(); assert.equal(JSON.parse(saved.get('lantern-settings')).colorblind, true); assert.equal(colorblindView, true);
  get('reduced-motion').checked = true; get('reduced-motion').onchange(); assert.equal(reducedView, true);
  get('large-text').checked = true; get('large-text').onchange(); assert.equal(JSON.parse(saved.get('lantern-settings')).largeText, true);
  get('bind-action').value = 'jump'; click('bind-key'); listeners.keydown({ code: 'KeyW', preventDefault() {} }); assert.match(get('binding-message').textContent, /đã dùng/);
  click('bind-key'); listeners.keydown({ code: 'KeyJ', preventDefault() {} }); assert.equal(JSON.parse(saved.get('lantern-settings')).bindings.jump, 'KeyJ');
  click('reset-bindings'); assert.equal(JSON.parse(saved.get('lantern-settings')).bindings.jump, 'Space'); click('bind-key'); listeners.keydown({ code: 'KeyJ', preventDefault() {} });
  click('close-settings'); assert.equal(get('pause-dialog').open, true); click('resume'); step(); step(); assert.equal(game().state, 'playing');
  listeners.keydown({ code: 'KeyJ', preventDefault() {} }); step(); assert.ok(game().player.pos[1] > 0); listeners.keyup({ code: 'KeyJ' });
  while (game().sim_tick < 301) step(); assert.match(get('subtitles').textContent, /Bóng Mực/); assert.equal(get('direction').hidden, false);
  const scores = [];
  for (const night of [1, 2, 3]) {
    assert.equal(game().night, night);
    if (night > 1) {
      game().player.flames = 0; step(); assert.equal(get('ending').hidden, false);
      if (night === 2) { get('player-name').value = 'Thai_01'; await get('score-form').onsubmit({ preventDefault() {} }); const entry = JSON.parse(saved.get('lantern-leaderboard'))[0]; assert.equal(entry.score, scores[0]); assert.equal(entry.nights_won, 1); }
      click('restart'); assert.equal(game().night, night); click('begin-night'); step();
    }
    for (const lamp of game().lanterns) { lamp.lit = true; lamp.ever_lit = true; lamp.fuelUnits = 6000; }
    step(); assert.equal(game().state, 'playing'); // All lit is no longer a win before dawn.
    game().startTime = (game().sim_tick + 1) / 60; step(); scores.push(game().score); assert.equal(game().state, 'won');
    if (night < 3) { click('restart'); assert.equal(get('briefing').open, true); click('begin-night'); step(); }
  }
  assert.equal(get('end-title').textContent, 'Bình Minh.'); assert.equal(get('end-score').textContent, `Tổng ${scores.reduce((a, b) => a + b, 0)} điểm`);
  get('player-name').value = 'bad name'; await get('score-form').onsubmit({ preventDefault() {} }); assert.match(get('score-message').textContent, /3–12/);
  get('player-name').value = 'Thai_03'; await get('score-form').onsubmit({ preventDefault() {} }); assert.equal(JSON.parse(saved.get('lantern-leaderboard'))[0].nights_won, 3);
  click('restart'); assert.equal(get('intro').hidden, false); assert.equal(game().night, 1);
  await click('leaderboard-button'); assert.match(get('leaderboard-rows').innerHTML, /Thai_03/); click('close-leaderboard');
  get('colorblind').checked = false; colorblindView = false;
  vm.runInNewContext(source, { ...environment }); assert.equal(get('colorblind').checked, true); assert.equal(colorblindView, true); assert.equal(reducedView, true); assert.equal(get('large-text').checked, true); assert.equal(JSON.parse(saved.get('lantern-settings')).bindings.jump, 'KeyJ');
});
