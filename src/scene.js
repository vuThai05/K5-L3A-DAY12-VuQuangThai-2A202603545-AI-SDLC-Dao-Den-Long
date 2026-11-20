import * as THREE from 'three';
import { PALETTE as C, groundAt } from './levels.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(C.sky); scene.fog = new THREE.FogExp2(C.fog, .006);
  const camera = new THREE.PerspectiveCamera(55, 1, .1, 350);
  const ambient = new THREE.AmbientLight('#ffffff', .15); scene.add(ambient);
  const moon = new THREE.DirectionalLight('#b8caff', 2.2); moon.position.set(-30, 70, -25); moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -65, right: 120, top: 65, bottom: -65, far: 180 }); moon.shadow.bias = -.0005; scene.add(moon);
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra });
  const materials = { grass: mat(C.grass), sand: mat(C.sand), wood: mat(C.wood), gold: mat(C.gold), clouds: mat(C.clouds, { transparent: true, opacity: .45 }),
    coat: mat(C.coat), red: mat(C.red), shade: mat(C.shade), stunned: mat(C.stunned), rim: new THREE.MeshBasicMaterial({ color: C.edge, wireframe: true, transparent: true, opacity: .3 }), drifter: mat(C.drifter),
    mote: new THREE.MeshBasicMaterial({ color: C.mote }), halo: new THREE.MeshBasicMaterial({ color: C.halo, transparent: true, opacity: .15, depthWrite: false }) };
  let staticGroup, entityGroup, level, player, pulseRing, leaves, flash = 10;
  const lamps = new Map(), motes = new Map(), shades = new Map(), drifters = new Map(), charms = new Map(), legs = [];
  const mesh = (geometry, material, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geometry, material); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const sphere = new THREE.SphereGeometry(.13, 8, 6), shadeGeo = new THREE.SphereGeometry(.65, 12, 10);
  const uniqueGeometries = new Set(), uniqueMaterials = new Set();
  function clear() {
    if (staticGroup) {
      for (const group of [staticGroup, entityGroup]) group.traverse(o => { if (o.isMesh) { uniqueGeometries.add(o.geometry); if (!Object.values(materials).includes(o.material)) uniqueMaterials.add(o.material); } });
      for (const g of uniqueGeometries) if (![sphere, shadeGeo].includes(g)) g.dispose();
      for (const m of uniqueMaterials) m.dispose(); uniqueGeometries.clear(); uniqueMaterials.clear();
      scene.remove(staticGroup, entityGroup);
    }
    for (const map of [lamps, motes, shades, drifters, charms]) map.clear(); legs.length = 0;
    staticGroup = new THREE.Group(); entityGroup = new THREE.Group(); scene.add(staticGroup, entityGroup);
  }
  function load(game) {
    clear(); level = game.level;
    for (const [cx, cz, r] of level.islands) {
      mesh(new THREE.CylinderGeometry(r, r - 1, 1.6, 64), materials.grass, staticGroup, cx, -.8, cz);
      mesh(new THREE.CylinderGeometry(r - 1, r * .3, 10, 24), mat('#26344a'), staticGroup, cx, -6.6, cz);
      for (let i = 0; i < 18; i++) {
        const a = i * 2.4, x = cx + Math.cos(a) * (r - 3), z = cz + Math.sin(a) * (r - 3), h = groundAt(level, x, z) ?? 0;
        if (game.lanterns.some(l => Math.hypot(l.pos[0] - x, l.pos[2] - z) < 3)) continue;
        const tree = new THREE.Group(); tree.position.set(x, h, z); staticGroup.add(tree);
        mesh(new THREE.CylinderGeometry(.17, .28, 2, 6), materials.wood, tree, 0, 1);
        for (let j = 0; j < 3; j++) mesh(new THREE.ConeGeometry(1.4 - j * .25, 2, 7), materials.grass, tree, 0, 2 + j * .8);
        const cloud = mesh(new THREE.IcosahedronGeometry(5, 1), materials.clouds, staticGroup, cx + Math.cos(a) * (r + 14), -10, cz + Math.sin(a) * (r + 14)); cloud.scale.set(2, .4, 1); cloud.castShadow = false;
      }
    }
    if (level.night === 2) {
      mesh(new THREE.BoxGeometry(18, .25, 4), materials.wood, staticGroup, 35, -.125);
      for (let x = 26; x <= 44; x += .6) mesh(new THREE.BoxGeometry(.45, .08, 4), materials.sand, staticGroup, x, .015);
    }
    if (level.night === 3) {
      const shape = new THREE.Shape();
      for (let i = 0; i <= 64; i++) { const a = i / 64 * Math.PI; const x = Math.cos(a) * 24, y = -Math.sin(a) * 24; i ? shape.lineTo(x, y) : shape.moveTo(x, y); }
      for (let i = 64; i >= 0; i--) { const a = i / 64 * Math.PI; shape.lineTo(Math.cos(a) * 12, -Math.sin(a) * 12); } shape.closePath();
      mesh(new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false }), materials.grass, staticGroup).rotation.x = -Math.PI / 2;
      mesh(new THREE.CylinderGeometry(8, 8, 6, 64), materials.grass, staticGroup, 0, 3);
      for (const degrees of [30, 150]) {
        const a = degrees * Math.PI / 180, points = [];
        for (const [r, y, side] of [[30, 0, -1], [30, 0, 1], [24, 3, -1], [24, 3, 1]]) points.push(r * Math.cos(a) - side * 1.5 * Math.sin(a), y + .01, r * Math.sin(a) + side * 1.5 * Math.cos(a));
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); geo.setIndex([0, 2, 1, 1, 2, 3]); geo.computeVertexNormals(); mesh(geo, mat(C.sand, { side: THREE.DoubleSide }), staticGroup);
      }
      mesh(new THREE.CylinderGeometry(2, 2, 8, 24), materials.wood, staticGroup, 0, 10);
      mesh(new THREE.ConeGeometry(3.3, 1.5, 8), materials.gold, staticGroup, 0, 14.5);
    }
    for (const pad of level.pads) {
      const p = mesh(new THREE.CylinderGeometry(1, 1, .08, 24), materials.gold, staticGroup, ...pad.pos); p.position.y += .04;
      mesh(new THREE.TorusGeometry(.7, .06, 6, 24), materials.red, staticGroup, pad.pos[0], pad.pos[1] + .12, pad.pos[2]).rotation.x = Math.PI / 2;
    }
    for (const l of game.lanterns) {
      const g = new THREE.Group(); g.position.fromArray(l.pos); staticGroup.add(g);
      mesh(new THREE.CylinderGeometry(.9, 1.2, .2, 8), materials.sand, g, 0, .1);
      mesh(new THREE.CylinderGeometry(.12, .2, 3, 8), materials.wood, g, 0, 1.6);
      const paper = mesh(new THREE.SphereGeometry(.65, 12, 8), mat(C.unlit, { emissive: C.core, emissiveIntensity: 0 }), g, 0, 3); paper.scale.y = 1.3;
      for (const y of [2.22, 3.78]) mesh(new THREE.CylinderGeometry(.3, .3, .1, 8), materials.gold, g, 0, y);
      mesh(new THREE.ConeGeometry(.95, .5, 8), materials.wood, g, 0, 4.1);
      const light = new THREE.PointLight(C.lamp, 0, 17, 2); light.position.y = 3; g.add(light);
      const safe = mesh(new THREE.RingGeometry(5.93, 6, 64), new THREE.MeshBasicMaterial({ color: C.gold, transparent: true, opacity: 0, side: THREE.DoubleSide }), g, 0, .03); safe.rotation.x = -Math.PI / 2;
      lamps.set(l.id, { paper, light, safe });
    }
    player = new THREE.Group(); entityGroup.add(player);
    mesh(new THREE.ConeGeometry(.38, .95, 8), materials.coat, player, 0, .85);
    mesh(new THREE.SphereGeometry(.27, 12, 10), materials.sand, player, 0, 1.55);
    mesh(new THREE.ConeGeometry(.65, .33, 24), materials.sand, player, 0, 1.94);
    mesh(new THREE.BoxGeometry(.15, .14, .7), materials.red, player, 0, 1.2, -.35);
    mesh(new THREE.CylinderGeometry(.015, .015, .45, 4), materials.wood, player, .48, 1.5);
    mesh(sphere, materials.mote, player, .48, 1.25);
    for (const side of [-1, 1]) legs.push(mesh(new THREE.CylinderGeometry(.09, .11, .48, 6), materials.wood, player, side * .18, .25));
    const light = new THREE.PointLight(C.lamp, 14, 13, 2); light.position.set(.3, 1.3, .2); player.add(light);
    leaves = new THREE.Group(); entityGroup.add(leaves);
    for (let i = 0; i < 12; i++) { const leaf = mesh(new THREE.SphereGeometry(.12, 5, 3), materials.grass, leaves); leaf.scale.set(.4, 1, 2.7); }
    pulseRing = mesh(new THREE.RingGeometry(.9, 1, 64), new THREE.MeshBasicMaterial({ color: C.halo, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), entityGroup); pulseRing.rotation.x = -Math.PI / 2; flash = 10;
    camera.position.set(game.player.pos[0] + 25, 28, game.player.pos[2] + 35);
  }
  function syncList(items, views, create, update) {
    const ids = new Set(items.map(i => i.id));
    for (const [id, view] of views) if (!ids.has(id)) { entityGroup.remove(view); views.delete(id); }
    for (const item of items) { if (!views.has(item.id)) views.set(item.id, create(item)); update(views.get(item.id), item); }
  }
  function update(game, dt, time, yaw, overview) {
    flash += dt;
    ambient.intensity = .15 + .55 * game.lanterns.filter(l => l.lit).length / game.lanterns.length;
    for (const l of game.lanterns) { const v = lamps.get(l.id); v.paper.material.color.set(l.lit ? C.lamp : C.unlit); v.paper.material.emissiveIntensity = l.lit ? 1.7 : 0; v.light.intensity = l.lit ? 90 : 0; v.safe.material.opacity = l.lit ? .35 : 0; }
    player.position.fromArray(game.player.pos); player.rotation.y = Math.atan2(game.facing[0], game.facing[1]); player.visible = !game.respawnTicks && (!game.invuln || Math.floor(time * 12) % 2 === 0);
    const moving = game.state === 'playing' && Math.hypot(game.player.vel[0], game.player.vel[2]) > .01;
    legs.forEach((l, i) => l.rotation.x = moving ? Math.sin(time * 13 + i * Math.PI) * .7 : 0);
    syncList(game.motes, motes, () => { const g = new THREE.Group(); mesh(sphere, materials.mote, g); mesh(new THREE.SphereGeometry(.29, 8, 6), materials.halo, g); entityGroup.add(g); return g; }, (v, m) => { v.position.set(m.pos[0], m.pos[1] + .55 + Math.sin(time * 3 + m.pos[0]) * .15, m.pos[2]); });
    syncList(game.shades, shades, () => { const g = new THREE.Group(); mesh(shadeGeo, materials.shade, g).scale.y = 1.2; mesh(shadeGeo, materials.rim, g).scale.set(1.05, 1.25, 1.05); entityGroup.add(g); return g; }, (v, s) => { v.position.fromArray(s.pos); v.children[0].material = s.state === 'stunned' ? materials.stunned : materials.shade; v.scale.setScalar(s.state === 'spawning' ? .6 : 1); });
    syncList(game.drifters.filter(d => d.state !== 'removed'), drifters, () => { const g = new THREE.Group(); for (let i = 0; i < 6; i++) mesh(new THREE.SphereGeometry(.25, 6, 4), materials.drifter, g, 0, 0, -i * .3).scale.set(1, .25, 1); entityGroup.add(g); return g; }, (v, d) => { v.position.fromArray(d.pos); v.rotation.y = Math.atan2(d.dir[0], d.dir[1]); v.children.forEach((p, i) => p.position.y = Math.sin(time * 5 + i) * .2); });
    syncList(game.charms, charms, () => { const g = new THREE.Group(); mesh(new THREE.BoxGeometry(.5, .8, .05), materials.gold, g); mesh(new THREE.BoxGeometry(.42, .7, .06), materials.red, g, 0, 0, .02); entityGroup.add(g); return g; }, (v, c) => { v.position.set(c.pos[0], c.pos[1] + .8 + Math.sin(time * 2) * .1, c.pos[2]); v.visible = c.available; v.rotation.y = time * .5; });
    pulseRing.material.opacity = Math.max(0, .7 * (1 - flash / .6)); pulseRing.scale.setScalar(.1 + Math.min(1, flash / .6) * 5);
    leaves.visible = game.wind.warning || game.wind.active;
    leaves.position.fromArray(game.player.pos);
    leaves.children.forEach((leaf, i) => { leaf.position.set(Math.sin(time * 2 + i) * 4, 1 + ((time + i) % 3), Math.cos(time * 2 + i) * 4); leaf.rotation.set(time, i + time * 2, time * 3); });
    if (overview) { const cx = game.night === 2 ? 35 : 0, scale = game.night === 2 ? 1.4 : 1; camera.position.set(cx + 48 * scale * Math.sin(.5 + time * .01), 39 * scale, 48 * scale * Math.cos(.5 + time * .01)); camera.lookAt(cx - 8, 0, 0); }
    else { const a = yaw * Math.PI / 180, p = game.player.pos, y = Math.max(-2, p[1]); camera.position.lerp(new THREE.Vector3(p[0] - Math.sin(a) * 11, y + 7, p[2] - Math.cos(a) * 11), 1 - Math.exp(-dt * 8)); camera.lookAt(p[0], y + 1, p[2]); }
    renderer.render(scene, camera);
  }
  function resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); }
  resize(); addEventListener('resize', resize);
  return { load, update, pulse(pos) { flash = 0; pulseRing.position.set(pos[0], pos[1] + .12, pos[2]); }, project(pos) { return new THREE.Vector3(...pos).project(camera); } };
}
