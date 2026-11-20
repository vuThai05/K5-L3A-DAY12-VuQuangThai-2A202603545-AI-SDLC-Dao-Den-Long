import { Game } from './game.js';
import { PALETTE as C } from './levels.js';
import { createScene } from './scene.js';
import { createAudio } from './audio.js';
import { DEFAULT_BINDINGS, ACTION_LABELS, validBindings, rebind, keyLabel } from './controls.js';
import { loadScores, saveScore } from './leaderboard.js';

const $ = id => document.getElementById(id);
try { boot(); } catch (error) { $('error').hidden = false; $('error').textContent = `Không thể mở game 3D. Hãy dùng trình duyệt hỗ trợ WebGL và bật tăng tốc phần cứng. ${error.message}`; }
function boot() {
  const view = createScene($('world')), audio = createAudio(), keys = new Set();
  let settings = { volume: .35, sensitivity: .3, colorblind: false, reducedMotion: false, largeText: false, bindings: { ...DEFAULT_BINDINGS } };
  try { const saved = JSON.parse(localStorage.getItem('lantern-settings') ?? '{}'); for (const key of ['volume', 'sensitivity']) if (typeof saved[key] === 'number' && Number.isFinite(saved[key])) settings[key] = Math.max(key === 'volume' ? 0 : .1, Math.min(1, saved[key])); if (typeof saved.colorblind === 'boolean') settings.colorblind = saved.colorblind; } catch {}
  audio.volume(settings.volume);
  try { const saved = JSON.parse(localStorage.getItem('lantern-settings') ?? '{}'); for (const key of ['reducedMotion', 'largeText']) if (typeof saved[key] === 'boolean') settings[key] = saved[key]; if (validBindings(saved.bindings)) settings.bindings = saved.bindings; } catch {}
  const saveSettings = () => { try { localStorage.setItem('lantern-settings', JSON.stringify(settings)); } catch {} };
  const applyColorblind = () => { document.body.classList.toggle('colorblind', settings.colorblind); view.setColorblind(settings.colorblind); };
  applyColorblind(); $('colorblind').checked = settings.colorblind;
  $('colorblind').onchange = () => { settings.colorblind = $('colorblind').checked; applyColorblind(); saveSettings(); };
  function applyAccessibility() { document.body.classList.toggle('reduced-motion', settings.reducedMotion); document.body.classList.toggle('ui-large', settings.largeText); view.setReducedMotion(settings.reducedMotion); }
  applyAccessibility();
  for (const [id, key] of [['reduced-motion', 'reducedMotion'], ['large-text', 'largeText']]) { $(id).checked = settings[key]; $(id).onchange = () => { settings[key] = $(id).checked; applyAccessibility(); saveSettings(); }; }
  let waitingBinding = null;
  function showBindings() {
    $('bindings-summary').textContent = Object.keys(DEFAULT_BINDINGS).map(k => `${ACTION_LABELS[k]}: ${keyLabel(settings.bindings[k])}`).join(' · ');
    $('controls-summary').textContent = ['up', 'left', 'down', 'right', 'jump', 'dash', 'interact', 'pulse', 'pause'].map(k => `${keyLabel(settings.bindings[k])} ${ACTION_LABELS[k]}`).join(' · ');
  }
  $('bind-action').innerHTML = Object.keys(DEFAULT_BINDINGS).map(k => `<option value="${k}">${ACTION_LABELS[k]}</option>`).join(''); $('bind-action').value = 'up'; showBindings();
  $('bind-key').onclick = () => { waitingBinding = $('bind-action').value; $('binding-message').textContent = 'Nhấn phím muốn gán…'; };
  $('reset-bindings').onclick = () => { settings.bindings = { ...DEFAULT_BINDINGS }; waitingBinding = null; showBindings(); saveSettings(); $('binding-message').textContent = 'Đã khôi phục phím mặc định.'; };
  let night = 1, wonScores = [], game, mode = 'menu', yaw = 0, last = performance.now(), time = 0, accumulator = 0;
  let dragging = false, mouseX = 0, pauseQueued = false, toastUntil = 0, lastSecond = 301, windWarning = false, spawnWarning = null, pendingScore = null, boardEntries = [];
  let weakBefore = new Set(); const captions = [];
  function caption(text) { captions.push(text); if (captions.length > 3) captions.shift(); $('subtitles').textContent = captions.join('\n'); }
  const quotes = ['Một đốm sáng cũng đủ để con tìm thấy đường về. Hãy bắt đầu từ những chiếc đèn gần bến.', 'Cầu tre không có lan can. Hãy để những bục vàng đưa con vượt biển mây, và giữ túi đom đóm khỏi Gió Lạc.', 'Đường lên cao bắt đầu từ hai con dốc. Nghe tiếng lá trước cơn gió, rồi mang ánh sáng tới tháp chuông.'];
  function notify(text, warning = false) { $('toast').textContent = `${settings.colorblind && warning ? '⚠ ' : ''}${text}`; $('toast').classList.toggle('warning', warning); $('toast').classList.add('show'); toastUntil = performance.now() + 2400; }
  function closeDialogs() { for (const el of document.querySelectorAll('dialog[open]')) el.close(); }
  function load(n) {
    night = n; game = new Game(12, {}, n); yaw = 0; accumulator = 0; keys.clear(); pauseQueued = false; lastSecond = game.time_left_s + 1; windWarning = false; spawnWarning = null; weakBefore = new Set(); captions.length = 0; $('subtitles').textContent = '';
    view.load(game); $('lamps').innerHTML = '<i></i>'.repeat(game.lanterns.length); $('mote-slots').innerHTML = '<i></i>'.repeat(10);
    $('chapter').innerHTML = `<span>ĐÊM ${n}</span> ${game.level.name}`; $('objective-title').textContent = 'GIỮ ĐÈN TỚI BÌNH MINH';
  }
  function briefing(n) {
    closeDialogs(); load(n); mode = 'briefing'; $('intro').hidden = true; $('ending').hidden = true; $('hud').hidden = true; document.body.classList.add('playing');
    $('night-label').textContent = `ĐÊM ${n} · LỜI ÔNG ĐĂNG`; $('night-name').textContent = game.level.name; $('night-quote').textContent = `“${quotes[n - 1]}”`;
    $('night-task').textContent = `Giữ ít nhất ${Math.ceil(.6 * game.lanterns.length)}/${game.lanterns.length} đèn sáng khi hết ${game.level.duration} giây. Nhớ châm dầu và xua Bóng Mực hút dầu.`; $('briefing').showModal(); audio.activate();
  }
  function begin() { closeDialogs(); document.activeElement?.blur(); mode = 'play'; $('hud').hidden = false; audio.activate(); notify('Đi theo những đốm vàng. Đừng để lửa tắt.'); }
  function menu() { closeDialogs(); mode = 'menu'; wonScores = []; load(1); $('intro').hidden = false; $('ending').hidden = true; $('hud').hidden = true; document.body.classList.remove('playing'); $('chapter').innerHTML = '<span>BA ĐÊM</span> Một bình minh'; }
  function requestPause() { if (mode === 'play' && game.state === 'playing') { pauseQueued = true; keys.clear(); } }
  function pauseMenu() { if (mode !== 'play') return; requestPause(); if (!$('pause-dialog').open) $('pause-dialog').showModal(); }
  function resume() { if (game.state === 'paused') pauseQueued = true; else pauseQueued = false; closeDialogs(); keys.clear(); document.activeElement?.blur(); audio.activate(); }
  function settingsMenu() { requestPause(); if ($('pause-dialog').open) $('pause-dialog').close(); if (!$('settings-dialog').open) $('settings-dialog').showModal(); }
  function closeSettings() { $('settings-dialog').close(); if (mode === 'play' && !$('pause-dialog').open) $('pause-dialog').showModal(); }
  $('start').onclick = () => { wonScores = []; briefing(1); }; $('begin-night').onclick = begin;
  $('restart').onclick = () => game.state === 'won' && night < 3 ? briefing(night + 1) : game.state === 'won' ? menu() : briefing(night);
  $('resume').onclick = resume; $('retry').onclick = () => briefing(night); $('menu').onclick = menu;
  $('settings-button').onclick = settingsMenu; $('pause-settings').onclick = settingsMenu; $('sound').onclick = settingsMenu; $('close-settings').onclick = closeSettings;
  $('settings-dialog').addEventListener('cancel', e => { e.preventDefault(); closeSettings(); });
  $('pause-dialog').addEventListener('cancel', e => { e.preventDefault(); resume(); });
  $('briefing').addEventListener('cancel', e => { e.preventDefault(); menu(); });
  $('help').onclick = () => { requestPause(); if (!$('help-dialog').open) $('help-dialog').showModal(); };
  const closeHelp = () => { $('help-dialog').close(); if (mode === 'play' && !$('pause-dialog').open) $('pause-dialog').showModal(); };
  $('close-help').onclick = closeHelp; $('help-dialog').addEventListener('cancel', e => { e.preventDefault(); closeHelp(); });
  async function openLeaderboard() {
    requestPause(); if (!$('leaderboard-dialog').open) $('leaderboard-dialog').showModal();
    try {
      const board = await loadScores(localStorage); boardEntries = board.entries;
      $('leaderboard-rows').innerHTML = board.entries.map((e, i) => `<tr><td>${i + 1}</td><td>${e.name}</td><td>${e.score}</td><td>${e.nights_won}/3</td><td>${new Date(e.achieved_at).toLocaleString('vi-VN')}</td></tr>`).join('');
      $('leaderboard-status').textContent = board.entries.length ? board.disk ? 'Bảng điểm đã lưu trên đĩa.' : 'Bảng điểm lưu trong trình duyệt này.' : 'Chưa có điểm. Hãy giữ đảo sáng tới bình minh.';
    } catch (error) { $('leaderboard-status').textContent = error.message; }
  }
  $('leaderboard-button').onclick = openLeaderboard; $('result-leaderboard').onclick = openLeaderboard;
  $('close-leaderboard').onclick = () => $('leaderboard-dialog').close();
  function download(name, href) { const link = document.createElement('a'); link.href = href; link.download = name; link.click(); }
  $('export-leaderboard').onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify({ entries: boardEntries }, null, 2)], { type: 'application/json' })); download('leaderboard.json', url); URL.revokeObjectURL(url); };
  $('capture').onclick = () => download('dao-den-long.png', view.capture());
  $('score-form').onsubmit = async event => {
    event.preventDefault(); if (!pendingScore || $('save-score').disabled) return;
    $('save-score').disabled = true;
    try {
      await saveScore({ ...pendingScore, name: $('player-name').value.trim(), achieved_at: new Date().toISOString() }, localStorage);
      $('score-message').textContent = 'Đã lưu điểm. Bạn có thể xem bảng xếp hạng.';
    } catch (error) { $('score-message').textContent = error.message; $('save-score').disabled = false; }
  };
  for (const key of ['volume', 'sensitivity']) {
    $(key).value = settings[key];
    const label = () => $(`${key}-value`).textContent = key === 'volume' ? `${Math.round(settings[key] * 100)}%` : settings[key].toFixed(2);
    label(); $(key).oninput = () => { settings[key] = Number($(key).value); label(); audio.volume(settings.volume); saveSettings(); };
  }
  const down = action => keys.has(settings.bindings[action]);
  const alias = code => keys.has(code) && !Object.values(settings.bindings).includes(code);
  addEventListener('keydown', e => {
    if (waitingBinding) { e.preventDefault(); try { settings.bindings = rebind(settings.bindings, waitingBinding, e.code); showBindings(); saveSettings(); $('binding-message').textContent = 'Đã lưu phím mới.'; } catch (error) { $('binding-message').textContent = error.message; } waitingBinding = null; return; }
    if ((e.code === settings.bindings.pause || e.code === 'Escape' && !Object.values(settings.bindings).includes('Escape')) && mode === 'play' && !document.querySelector('dialog[open]')) { e.preventDefault(); if (!e.repeat) pauseMenu(); return; }
    if (![...Object.values(settings.bindings), 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) || document.querySelector('dialog[open]')) return;
    if (mode === 'play') e.preventDefault(); keys.add(e.code);
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); if (mode === 'play') pauseMenu(); });
  document.addEventListener('visibilitychange', () => { keys.clear(); accumulator = 0; last = performance.now(); if (document.hidden && mode === 'play') pauseMenu(); });
  $('world').addEventListener('pointerdown', e => { dragging = true; mouseX = e.clientX; $('world').setPointerCapture(e.pointerId); });
  $('world').addEventListener('pointermove', e => { if (dragging && game.state === 'playing') { yaw -= (e.clientX - mouseX) * settings.sensitivity; mouseX = e.clientX; } });
  for (const type of ['pointerup', 'pointercancel']) $('world').addEventListener(type, () => dragging = false);
  const map = $('map').getContext('2d');
  function minimap() {
    const minX = game.night === 2 ? -28 : -game.level.radius, maxX = game.night === 2 ? 98 : game.level.radius, scale = 160 / (maxX - minX), cx = (minX + maxX) / 2;
    map.clearRect(0, 0, 180, 180); map.save(); map.translate(90 - cx * scale, 90); map.scale(scale, -scale);
    map.fillStyle = C.grass; for (const [x, z, r] of game.level.islands) { map.beginPath(); map.arc(x, z, r, 0, Math.PI * 2); map.fill(); }
    if (game.night === 2) { map.fillStyle = C.wood; map.fillRect(26, -2, 18, 4); }
    const dot = (pos, color, size) => { map.fillStyle = color; map.beginPath(); map.arc(pos[0], pos[2], size / scale, 0, Math.PI * 2); map.fill(); };
    for (const m of game.motes) dot(m.pos, C.halo, 1.4);
    for (const l of game.lanterns) dot(l.pos, l.lit ? C.lamp : C.unlit, 3.4);
    for (const s of game.shades) dot(s.pos, settings.colorblind ? '#00B3FF' : C.edge, 2.3);
    for (const d of game.drifters) if (d.state !== 'removed') dot(d.pos, C.drifter, 2.6);
    for (const c of game.charms) if (c.available) dot(c.pos, C.red, 2.5);
    dot(game.player.pos, C.text, 3); map.restore();
  }
  function hud() {
    const lit = game.lanterns.filter(l => l.lit).length, p = game.player, seconds = Math.ceil(game.time_left_s);
    $('health').textContent = Array.from({ length: 3 }, (_, i) => i < p.flames ? '◆' : '◇').join(' ');
    $('carried').textContent = p.carried; $('capacity').textContent = p.capacity;
    if ($('mote-slots').children.length !== p.capacity) $('mote-slots').innerHTML = '<i></i>'.repeat(p.capacity);
    [...$('mote-slots').children].forEach((el, i) => el.classList.toggle('filled', i < p.carried));
    [...$('lamps').children].forEach((el, i) => el.classList.toggle('lit', game.lanterns[i].lit));
    $('lamp-count').textContent = `${lit}/${game.lanterns.length} sáng · Cần ${Math.ceil(.6 * game.lanterns.length)} ở bình minh`; $('score').textContent = `${game.score} điểm · Đã giữ ${wonScores.reduce((a, b) => a + b, 0)}`;
    $('timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; $('timer').classList.toggle('urgent', seconds <= 30);
    $('warning-symbol').hidden = !settings.colorblind || seconds > 30;
    $('dash-status').textContent = `${keyLabel(settings.bindings.dash)} · Lướt ${game.charmTicks ? '∞' : game.dashCd ? (game.dashCd / 60).toFixed(1) + 's' : 'sẵn sàng'}`;
    $('pulse-status').textContent = `${keyLabel(settings.bindings.pulse)} · Tỏa sáng ${game.pulseCd ? (game.pulseCd / 60).toFixed(1) + 's' : '3 đom đóm'}`;
    $('charm-status').textContent = game.charmTicks ? `Bùa Gió: ${(game.charmTicks / 60).toFixed(1)}s` : 'Giữ lửa, thắp bình minh.';
    $('wind-status').textContent = `${settings.colorblind && (game.wind.active || game.wind.warning) ? '⚠ ' : ''}${game.wind.active ? 'GIÓ MẠNH · CẨN THẬN MÉP ĐẢO' : game.wind.warning ? 'LÁ ĐANG BAY · GIÓ SẮP ĐẾN' : ''}`;
    const byDistance = (a, b) => distance(p.pos, a.pos) - distance(p.pos, b.pos);
    const receiver = game.lanterns.filter(l => game.canReceive(l) && distance(p.pos, l.pos) <= 2).sort(byDistance)[0];
    const needy = game.lanterns.filter(l => l.lit && l.fuel < 30), nearest = (needy.length ? needy : game.lanterns.filter(l => !l.lit)).sort(byDistance)[0];
    const interactKey = keyLabel(settings.bindings.interact);
    $('hint').textContent = game.respawnTicks ? 'Mây đang tìm đường trở lại…' : receiver ? receiver.lit ? `${interactKey} — Châm dầu (${receiver.fuel.toFixed(1)}/100)` : `${interactKey} — ${receiver.ever_lit ? 'Thắp lại' : 'Nạp ánh sáng'} (${receiver.deposited}/${game.lanternCost(receiver)})` : game.safe(p.pos) ? 'Đèn còn đủ dầu đang bảo vệ bạn.' : p.carried === p.capacity ? 'Túi đã đầy. Mang ánh sáng về đèn.' : 'Giữ đủ đèn sáng tới bình minh. Đèn yếu cần châm dầu.';
    if (mode === 'play' && game.state === 'playing') { const weak = new Set(needy.map(l => l.id)); for (const id of weak) if (!weakBefore.has(id)) caption(`⚠ ${id} dưới 30 dầu, mất vùng an toàn.`); weakBefore = weak; }
    $('direction').hidden = true;
    const spawned = spawnWarning && performance.now() < spawnWarning.until, target = spawned ? spawnWarning : nearest;
    if (target && mode === 'play') {
      const v = view.project([target.pos[0], target.pos[1] + 3, target.pos[2]]);
      if (spawned || Math.abs(v.x) > .95 || Math.abs(v.y) > .9 || v.z > 1) {
        const sign = v.z > 1 ? -1 : 1, angle = Math.atan2(-v.y * sign, v.x * sign);
        $('direction').hidden = false; $('direction').style.left = `${50 + Math.cos(angle) * 42}%`; $('direction').style.top = `${50 + Math.sin(angle) * 33}%`;
        $('direction-arrow').style.transform = `rotate(${angle + Math.PI / 2}rad)`; $('direction-label').textContent = `${spawned ? '⚠ Bóng Mực' : target.id} · ${Math.round(distance(p.pos, target.pos))}m`;
      }
    }
    minimap();
  }
  function events(list) {
    for (const e of list) {
      audio.effect(e.name);
      if (e.name === 'shade_spawned') { const shade = game.shades.find(s => s.id === e.data.id); if (shade) spawnWarning = { pos: [...shade.pos], until: performance.now() + 4000 }; caption(`⚠ Bóng Mực ${e.data.id} xuất hiện. Xem mũi tên ở mép màn hình.`); }
      if (e.name === 'pulse') view.pulse(game.player.pos);
      if (e.name === 'lantern_lit') notify(e.data.relight ? 'Đèn đã sáng lại. Túi ánh sáng lớn thêm!' : 'Một chiếc đèn đã thức giấc. Túi ánh sáng lớn thêm!');
      if (e.name === 'lantern_out') notify(`${e.data.lantern_id} đã cạn dầu. Mang 5 đom đóm để thắp lại.`, true);
      if (e.name === 'refuel') notify(`${e.data.lantern_id} đã được châm dầu.`);
      if (e.name === 'player_hit') notify(e.data.by === 'fall' ? 'Mây rơi khỏi đảo. Túi ánh sáng đã mất.' : 'Mất một ngọn lửa! Hãy tìm vùng sáng.', true);
      if (e.name === 'drifter_steal') notify('Gió Lạc đã cướp đom đóm! Tỏa sáng để lấy lại.', true);
      if (e.name === 'charm_picked') notify('Bùa Gió: chạy nhanh, lướt không hồi trong 10 giây.');
      if (e.name === 'game_over') {
        mode = 'result'; closeDialogs(); keys.clear(); $('hud').hidden = true; $('ending').hidden = false;
        const won = game.state === 'won'; if (won) wonScores[night - 1] = game.score;
        pendingScore = { score: wonScores.reduce((a, b) => a + b, 0), nights_won: wonScores.length, seed: 12 };
        $('score-form').hidden = won && night < 3; $('save-score').disabled = false; $('score-message').textContent = ''; $('player-name').value = '';
        audio.effect(won ? 'won' : 'lost');
        $('end-title').textContent = won ? night === 3 ? 'Bình Minh.' : `${game.level.name} đã sáng.` : 'Giữ lại một hy vọng.';
        $('end-copy').textContent = won ? night === 3 ? 'Mây đã giữ đảo sáng tới bình minh. Cảm ơn người giữ đèn nhỏ tuổi.' : 'Bạn đã giữ đủ đèn tới bình minh. Ông Đăng đang đợi ở đảo kế tiếp.' : e.data.reason === 'dawn' ? 'Bình minh đến nhưng chưa đủ đèn sáng. Thử lại đêm này, những đêm đã thắng vẫn được giữ.' : 'Ngọn lửa cuối đã tắt. Mình thử lại nhé?';
        $('end-score').textContent = won && night === 3 ? `Tổng ${wonScores.reduce((a, b) => a + b, 0)} điểm` : `${game.score} điểm đêm này`;
        $('restart').textContent = won ? night === 3 ? 'Về menu' : 'Đến hòn đảo tiếp theo' : 'Chơi lại Đêm';
      }
    }
  }
  const distance = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
  function frame(now) {
    requestAnimationFrame(frame); const dt = Math.min((now - last) / 1000, .1); last = now; time += dt;
    if (mode === 'play' && !document.hidden) {
      if (game.state === 'playing' && !document.querySelector('dialog[open]')) yaw += ((alias('ArrowLeft') ? 1 : 0) - (alias('ArrowRight') ? 1 : 0)) * dt * 100;
      accumulator += dt;
      while (accumulator >= 1 / 60 && mode === 'play') {
        // Release a previous pause edge before delivering a queued click, so quick Resume clicks are never lost.
        const pause = pauseQueued && !game.input.pause; if (pause) pauseQueued = false;
        events(game.step({ move: [(down('right') ? 1 : 0) - (down('left') ? 1 : 0), (down('up') || alias('ArrowUp') ? 1 : 0) - (down('down') || alias('ArrowDown') ? 1 : 0)], cam_yaw_deg: yaw, jump: down('jump'), dash: down('dash'), pulse: down('pulse'), interact: down('interact'), pause })); accumulator -= 1 / 60;
      }
      const seconds = Math.ceil(game.time_left_s); if (seconds <= 10 && seconds !== lastSecond && game.state === 'playing') { audio.effect('countdown'); caption(`⚠ Còn ${seconds} giây tới bình minh.`); } lastSecond = seconds;
      if (game.wind.warning && !windWarning) { audio.effect('wind'); caption('⚠ Gió mạnh sắp tới trong 2 giây. Tránh mép đảo.'); } windWarning = game.wind.warning;
      audio.music(game.sim_tick, night, game.state === 'playing');
    } else accumulator = 0;
    hud(); view.update(game, dt, time, yaw, mode === 'menu' || mode === 'briefing');
    if (now > toastUntil) $('toast').classList.remove('show');
  }
  menu(); requestAnimationFrame(frame);
}
