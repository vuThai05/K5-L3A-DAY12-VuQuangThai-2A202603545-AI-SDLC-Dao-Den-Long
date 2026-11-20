import * as THREE from 'three';
import { Game, T, ISLAND_RADIUS } from './game.js';

const $ = id => document.getElementById(id);
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: true }); }
catch { $('error').hidden = false; $('error').textContent = 'Trình duyệt chưa hỗ trợ WebGL. Hãy bật tăng tốc phần cứng rồi tải lại trang trong Chrome, Edge hoặc Firefox.'; }
if (renderer) boot();

function boot() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#102b39');
  scene.fog = new THREE.FogExp2('#102b39', 0.011);
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 240);
  const ambient = new THREE.HemisphereLight('#b9e2dd', '#313458', 1.75); scene.add(ambient);
  const moon = new THREE.DirectionalLight('#bed9ff', 2.2); moon.position.set(-22, 40, -15); moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -38, right: 38, top: 38, bottom: -38, far: 110 });
  moon.shadow.bias = -.0005; scene.add(moon);
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, ...extra });
  const grass = mat('#36635c'), earth = mat('#263e46'), gold = mat('#cda164'), stone = mat('#789088'), wood = mat('#594942');
  const glowMat = new THREE.MeshBasicMaterial({ color: '#ffe3a1' });
  const mesh = (geo, material, parent, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const island = new THREE.Group(); scene.add(island);
  mesh(new THREE.CylinderGeometry(30, 27, 2.5, 64), grass, island, 0, -1.28);
  mesh(new THREE.CylinderGeometry(27, 7, 9, 16), earth, island, 0, -6.8);
  mesh(new THREE.TorusGeometry(30, .17, 5, 100), mat('#628a79'), island, 0, -.02).rotation.x = Math.PI / 2;
  const pathMat = mat('#839185');
  mesh(new THREE.CylinderGeometry(3.6, 3.6, .04, 32), pathMat, island, 0, -.01);
  mesh(new THREE.TorusGeometry(19, .45, 4, 100), mat('#566f63'), island, 0, .015).rotation.x = Math.PI / 2;
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    for (let j = 0; j < 8; j++) {
      const r = 4.5 + j * 1.6;
      const m = mesh(new THREE.CylinderGeometry(.52, .55, .06, 6), pathMat, island, Math.sin(a) * r, .02, Math.cos(a) * r); m.rotation.y = a + j;
    }
  }
  // Procedural decorations have no simulation entities and never alter headless output.
  for (let i = 0; i < 29; i++) {
    const a = i * 2.39996, r = 24 + Math.sin(i * 7) * 3;
    const tree = new THREE.Group(); tree.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); scene.add(tree);
    mesh(new THREE.CylinderGeometry(.16, .3, 2.6, 6), wood, tree, 0, 1.3);
    const h = 2 + (i % 4) * .35;
    for (let n = 0; n < 3; n++) mesh(new THREE.ConeGeometry(1.5 - n * .3, h, 7), mat(['#315f57', '#407a67', '#254c50'][i % 3]), tree, 0, 2.1 + n * .9);
    tree.scale.setScalar(.75 + (i % 5) * .14);
    const rock = mesh(new THREE.DodecahedronGeometry(.6 + i % 3 * .2), stone, scene, Math.sin(a + .1) * (r - 1), .3, Math.cos(a + .1) * (r - 1)); rock.scale.y = .6;
  }
  // Gentle cloud banks below the floating island.
  const cloudMat = mat('#6d9aa4', { transparent: true, opacity: .15, depthWrite: false });
  for (let i = 0; i < 36; i++) {
    const a = i * 2.4, r = 43 + i % 7 * 3;
    const c = mesh(new THREE.IcosahedronGeometry(5, 1), cloudMat, scene, Math.sin(a) * r, -10 - i % 4, Math.cos(a) * r);
    c.scale.set(2, .35, 1); c.castShadow = false;
  }
  const starGeo = new THREE.BufferGeometry(), starPos = [];
  for (let i = 0; i < 260; i++) { const a = i * 2.3999, r = 60 + i % 30; starPos.push(Math.sin(a) * r, 18 + i % 49, Math.cos(a) * r); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3)); scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#d9e8d7', size: .12, transparent: true, opacity: .7 })));
  const player = new THREE.Group(); scene.add(player);
  const body = mesh(new THREE.ConeGeometry(.4, .95, 8), mat('#e3a658'), player, 0, .85);
  mesh(new THREE.SphereGeometry(.28, 12, 10), mat('#e8c9a3'), player, 0, 1.55);
  mesh(new THREE.ConeGeometry(.68, .33, 24), mat('#e4cc99'), player, 0, 1.94);
  mesh(new THREE.TorusGeometry(.66, .025, 4, 24), gold, player, 0, 1.78).rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(.015, .015, .48, 4), wood, player, .49, 1.55);
  mesh(new THREE.SphereGeometry(.14, 8, 6), glowMat, player, .49, 1.3);
  const playerLight = new THREE.PointLight('#ffbf66', 9, 9, 2); playerLight.position.set(.3, 1.5, .2); player.add(playerLight);
  const legs = [-1, 1].map(side => mesh(new THREE.CylinderGeometry(.09, .11, .48, 6), mat('#274748'), player, side * .18, .25));
  const scarf = mesh(new THREE.BoxGeometry(.16, .14, .7), mat('#dc7255'), player, 0, 1.2, -.35);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ffcf83', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const pulseRing = mesh(new THREE.RingGeometry(.88, 1, 64), ringMat, scene); pulseRing.rotation.x = -Math.PI / 2; pulseRing.castShadow = false;
  let game = new Game(12), active = false, yaw = 0, accumulator = 0, last = performance.now(), visualTime = 0, pulseAge = 10;
  let toastUntil = 0, dragging = false, lastMouse = 0, soundEnabled = false, audio;
  const keys = new Set(), lamps = new Map(), shadeViews = new Map(), moteViews = new Map();
  const moteGeo = new THREE.IcosahedronGeometry(.12, 0), moteMaterial = new THREE.MeshBasicMaterial({ color: '#ffd888' });
  const shadeGeo = new THREE.SphereGeometry(.65, 12, 10), shadeMaterial = mat('#37244e', { emissive: '#221039', emissiveIntensity: .6 });
  for (const l of game.lanterns) {
    const g = new THREE.Group(); scene.add(g);
    mesh(new THREE.CylinderGeometry(1.1, 1.3, .22, 8), stone, g, 0, .1);
    mesh(new THREE.CylinderGeometry(.12, .2, 3.4, 8), wood, g, 0, 1.8);
    const paper = mesh(new THREE.SphereGeometry(.7, 10, 8), mat('#96785b', { emissive: '#ffb64c', emissiveIntensity: .08 }), g, 0, 3.2); paper.scale.y = 1.25;
    for (const y of [2.42, 3.98]) mesh(new THREE.CylinderGeometry(.31, .31, .12, 8), gold, g, 0, y);
    mesh(new THREE.ConeGeometry(1.02, .52, 8), mat('#49595b'), g, 0, 4.3);
    const light = new THREE.PointLight('#ffbd62', 0, 15, 2); light.position.set(0, 3, 0); g.add(light);
    const safe = mesh(new THREE.RingGeometry(T.safe_radius - .09, T.safe_radius, 64), new THREE.MeshBasicMaterial({ color: '#edc582', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), g, 0, .05); safe.rotation.x = -Math.PI / 2; safe.castShadow = false;
    lamps.set(l.id, { g, paper, light, safe });
  }
  $('lamps').innerHTML = '<i></i>'.repeat(5);
  function notify(message) { $('toast').textContent = message; $('toast').classList.add('show'); toastUntil = performance.now() + 2300; }
  function chime(freq = 660) {
    if (!soundEnabled) return;
    audio ??= new AudioContext(); if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator(), gain = audio.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(freq, audio.currentTime);
    gain.gain.setValueAtTime(.045, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .45);
    o.connect(gain).connect(audio.destination); o.start(); o.stop(audio.currentTime + .5);
  }
  function start() {
    document.activeElement?.blur();
    game = new Game(12); active = true; yaw = 0; accumulator = 0; keys.clear(); pulseAge = 10;
    $('intro').hidden = true; $('ending').hidden = true; $('hud').hidden = false;
    document.body.classList.add('playing'); notify('Năm chiếc đèn đang chờ bạn.');
  }
  $('start').onclick = start; $('restart').onclick = start;
  $('help').onclick = () => { keys.clear(); $('help-dialog').showModal(); };
  $('close-help').onclick = () => $('help-dialog').close();
  $('sound').onclick = () => { soundEnabled = !soundEnabled; $('sound').textContent = `Âm thanh: ${soundEnabled ? 'bật' : 'tắt'}`; $('sound').setAttribute('aria-pressed', String(soundEnabled)); chime(); };
  const used = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyQ', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  addEventListener('keydown', e => { if (used.includes(e.code) && !$('help-dialog').open && !['BUTTON', 'A'].includes(document.activeElement.tagName)) e.preventDefault(); if (used.includes(e.code)) keys.add(e.code); });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());
  document.addEventListener('visibilitychange', () => { keys.clear(); accumulator = 0; last = performance.now(); });
  renderer.domElement.addEventListener('pointerdown', e => { dragging = true; lastMouse = e.clientX; renderer.domElement.setPointerCapture(e.pointerId); });
  renderer.domElement.addEventListener('pointermove', e => { if (dragging) { yaw -= (e.clientX - lastMouse) * .3; lastMouse = e.clientX; } });
  renderer.domElement.addEventListener('pointerup', () => dragging = false);
  renderer.domElement.addEventListener('pointercancel', () => dragging = false);
  addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  const map = $('map').getContext('2d');
  function minimap() {
    map.clearRect(0, 0, 180, 180); map.save(); map.translate(90, 90);
    map.fillStyle = '#20423f'; map.beginPath(); map.arc(0, 0, 80, 0, Math.PI * 2); map.fill();
    map.strokeStyle = '#73938755'; map.stroke();
    const point = (p, color, radius) => { map.fillStyle = color; map.beginPath(); map.arc(p[0] * 2.5, -p[2] * 2.5, radius, 0, Math.PI * 2); map.fill(); };
    for (const m of game.motes) point(m.pos, '#d0b96c', 1.1);
    for (const l of game.lanterns) { if (l.lit) point(l.pos, '#ffd38c20', 12.5); point(l.pos, l.lit ? '#ffd38c' : '#728f8e', 4); }
    for (const s of game.shades) point(s.pos, s.state === 'stunned' ? '#baa0ff' : '#a575cf', 2.5);
    point(game.player.pos, '#ffffff', 3.5); map.restore();
  }
  function sync() {
    let lit = 0;
    for (const l of game.lanterns) {
      const v = lamps.get(l.id); v.g.position.fromArray(l.pos);
      v.paper.material.emissiveIntensity = l.lit ? 2 : .08 + l.deposited / 30;
      v.light.intensity = l.lit ? 75 : 2; v.safe.material.opacity = l.lit ? .24 : 0;
      if (l.lit) lit++;
    }
    ambient.intensity = 1.75 + lit * .19;
    const moteIds = new Set(game.motes.map(m => m.id));
    for (const [id, view] of moteViews) if (!moteIds.has(id)) { scene.remove(view); moteViews.delete(id); }
    for (const m of game.motes) {
      if (!moteViews.has(m.id)) { const view = mesh(moteGeo, moteMaterial, scene); view.castShadow = false; moteViews.set(m.id, view); }
      const v = moteViews.get(m.id); v.position.set(m.pos[0], .65 + Math.sin(visualTime * 2 + Number(m.id.slice(1))) * .22, m.pos[2]);
      v.scale.setScalar(.8 + Math.sin(visualTime * 3 + m.pos[0]) * .25);
    }
    const shadeIds = new Set(game.shades.map(s => s.id));
    for (const [id, view] of shadeViews) if (!shadeIds.has(id)) { scene.remove(view); shadeViews.delete(id); }
    for (const s of game.shades) {
      if (!shadeViews.has(s.id)) {
        const group = new THREE.Group(); scene.add(group); shadeViews.set(s.id, group);
        mesh(shadeGeo, shadeMaterial, group, 0, 0).scale.set(.85, 1.2, .85);
        for (const side of [-1, 1]) mesh(new THREE.SphereGeometry(.075, 8, 6), new THREE.MeshBasicMaterial({ color: '#c995ed' }), group, side * .2, .2, .5);
        mesh(new THREE.ConeGeometry(.5, 1.2, 8), shadeMaterial, group, 0, -.9).rotation.z = Math.PI;
      }
      const v = shadeViews.get(s.id); v.position.set(s.pos[0], s.pos[1] + Math.sin(visualTime * 3 + s.pos[0]) * .12 + .2, s.pos[2]);
      v.rotation.y = Math.atan2(game.player.pos[0] - s.pos[0], game.player.pos[2] - s.pos[2]);
      v.scale.setScalar(s.state === 'stunned' ? .7 : 1);
    }
    player.position.fromArray(game.player.pos);
    const moving = active && Math.hypot(...game.input.move) > 0;
    if (moving) player.rotation.y = Math.atan2(game.input.move[0], game.input.move[1]) + yaw * Math.PI / 180;
    legs.forEach((l, i) => l.rotation.x = moving ? Math.sin(visualTime * 13 + i * Math.PI) * .65 : 0);
    body.rotation.z = moving ? Math.sin(visualTime * 13) * .06 : 0;
    scarf.rotation.x = Math.sin(visualTime * 3) * .15;
    player.visible = game.tick >= game.hitUntil || Math.floor(visualTime * 12) % 2 === 0;
    if (pulseAge < .65) { ringMat.opacity = (1 - pulseAge / .65) * .65; pulseRing.scale.setScalar(.2 + pulseAge / .65 * T.pulse_radius); }
    else ringMat.opacity = 0;
    $('carried').textContent = game.player.carried; $('carry-bar').style.width = `${game.player.carried / T.carry_capacity * 100}%`;
    $('health').textContent = Array.from({ length: 3 }, (_, i) => i < game.player.flames ? '◆' : '◇').join(' ');
    $('lamp-count').textContent = `${lit} / 5 đèn đã sáng`;
    [...$('lamps').children].forEach((el, i) => el.classList.toggle('lit', game.lanterns[i].lit));
    const seconds = Math.ceil(game.time_left_s); $('timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    $('score').textContent = `${game.score} điểm`;
    const near = game.lanterns.find(l => !l.lit && Math.hypot(l.pos[0] - game.player.pos[0], l.pos[2] - game.player.pos[2]) <= T.interact_radius);
    $('hint').textContent = near ? `${near.id}: ${near.deposited}/10 · ${game.player.carried ? 'Nhấn E để nạp ánh sáng' : 'Hãy gom thêm đom đóm'}` : game.safe(game.player.pos) ? 'Bạn đang ở trong vùng sáng an toàn.' : game.player.carried >= T.carry_capacity ? 'Túi đã đầy! Mang ánh sáng về đèn.' : 'Gom đom đóm vàng · Tránh Bóng Mực tím';
    minimap();
  }
  function handleEvents(events) {
    for (const e of events) {
      if (e.name === 'mote_picked') chime(880 + e.data.carried * 20);
      if (e.name === 'lantern_lit') { notify('Một chiếc đèn đã thức giấc.'); chime(523); }
      if (e.name === 'player_hit') { notify('Mất một ngọn lửa! Tìm vùng sáng để trú.'); chime(165); }
      if (e.name === 'pulse') { pulseAge = 0; pulseRing.position.set(game.player.pos[0], .1, game.player.pos[2]); chime(330); }
      if (e.name === 'game_over') {
        active = false; keys.clear(); $('ending').hidden = false; $('hud').hidden = true;
        $('end-title').textContent = game.state === 'won' ? 'Đảo đã sáng lại.' : 'Giữ lại một hy vọng.';
        $('end-copy').textContent = game.state === 'won' ? 'Năm chiếc đèn, một biển mây ấm áp. Cảm ơn người giữ đèn nhỏ tuổi.' : e.data.reason === 'dawn' ? 'Bình minh đã đến trước khi cả đảo sáng lên. Mình thử một đêm nữa nhé?' : 'Ngọn lửa cuối cùng đã tắt. Mình trở lại và thử một lần nữa nhé?';
        $('end-score').textContent = `${game.score} điểm`;
      }
    }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .1); last = now; visualTime += dt; pulseAge += dt;
    if (active && !$('help-dialog').open && !document.hidden) {
      yaw += ((keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0)) * dt * 100;
      accumulator += dt;
      while (accumulator >= 1 / 60 && active) {
        handleEvents(game.step({ move: [(keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0), (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0)], cam_yaw_deg: yaw, jump: keys.has('Space'), interact: keys.has('KeyE'), pulse: keys.has('KeyQ') }));
        accumulator -= 1 / 60;
      }
    } else accumulator = 0;
    sync();
    if (!$('intro').hidden) {
      const angle = .5 + Math.sin(visualTime * .07) * .1;
      camera.position.set(48 * Math.sin(angle), 31, 48 * Math.cos(angle)); camera.lookAt(-7, 1, 0);
    } else {
      const theta = yaw * Math.PI / 180;
      const target = new THREE.Vector3(game.player.pos[0] - Math.sin(theta) * 10, game.player.pos[1] + 7, game.player.pos[2] - Math.cos(theta) * 10);
      camera.position.lerp(target, 1 - Math.exp(-dt * 7)); camera.lookAt(game.player.pos[0], game.player.pos[1] + 1, game.player.pos[2]);
    }
    if (now > toastUntil) $('toast').classList.remove('show');
    renderer.render(scene, camera);
  }
  sync(); requestAnimationFrame(frame);
}
