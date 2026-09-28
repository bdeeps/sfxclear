// Shared parts for SFXClear: chart boards, stage helpers (phones and the tall reel video), a faceless
// crew/actor figure, and generic special-effects hardware built from primitives: a truss, a light on a
// stand, a big fan, a rain bar, a hazer, a cine camera, a crash mat and a clear safety shield.
// Plus a small debris engine (pieces that fly, fall, bounce and settle) used by the breakaway chapter.
// Units are metres, kilograms and seconds: +x right, +y up, +z towards you.
// Every figure and prop is generic and made for this box. Nothing copies a real film's characters,
// creatures, sets, logos or frames.
import { THREE, M, box, beam, sphere, clamp } from './kit.js';

export const TAU = Math.PI * 2;
export const D2R = Math.PI / 180;
export const G = 9.81;                        // m/s², standard gravity
export const fmt = (v, d = 0) => Number(v).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });

// ---------------------------------------------------------------- boards (canvas charts in 3D)
export const COL = {
  sfx: '#ffb547', vfx: '#8ef0ff', good: '#7be08c', bad: '#ff5a8a', hot: '#ffd166', soft: 'rgba(255,255,255,.6)',
  water: '#8ec9ff', fire: '#ff7a3d', air: '#bfe3ff',
};
export function bg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(9,11,17,.93)'; g.fillRect(0, 0, w, h); }
export function heading(g, main, sub = '', y = 38) {
  g.textAlign = 'left';
  g.fillStyle = '#eef2fa'; g.font = 'bold 27px sans-serif'; g.fillText(main, 24, y);
  if (sub) { g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '18px sans-serif'; g.fillText(sub, 24, y + 27); }
}
export function say(g, s, x, y, { font = '18px sans-serif', col = 'rgba(255,255,255,.82)', align = 'left' } = {}) {
  g.font = font; g.fillStyle = col; g.textAlign = align; g.fillText(s, x, y); g.textAlign = 'left';
}
export function roundRect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function wrapText(g, s, x, y, maxW, lh, opts = {}) {
  g.font = opts.font || '18px sans-serif';
  let line = '', yy = y;
  for (const word of s.split(' ')) {
    const t = line ? line + ' ' + word : word;
    if (g.measureText(t).width > maxW && line) { say(g, line, x, yy, opts); line = word; yy += lh; } else line = t;
  }
  if (line) say(g, line, x, yy, opts);
  return yy + lh;
}
// A horizontal bar from 0 to max with a value, label and colour.
export function bar(g, x, y, w, h, v, max, col, label = '', valTxt = '') {
  g.fillStyle = 'rgba(255,255,255,.08)'; roundRect(g, x, y, w, h, h / 2); g.fill();
  const k = clamp(v / max, 0, 1);
  if (k > 0.001) { g.fillStyle = col; roundRect(g, x, y, Math.max(h, w * k), h, h / 2); g.fill(); }
  if (label) say(g, label, x, y - 8, { font: '17px sans-serif', col: 'rgba(255,255,255,.7)' });
  if (valTxt) say(g, valTxt, x + w, y - 8, { font: 'bold 17px sans-serif', col, align: 'right' });
}
// A canvas board as a plane in the scene. redraw() whenever its data change.
export function makeBoard(parent, w, h, pxW, pxH, draw, pos) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  mesh.position.set(...pos); parent.add(mesh);
  const b = { mesh, tex, canvas: c, redraw: () => { draw(g, pxW, pxH); tex.needsUpdate = true; } };
  b.redraw();
  return b;
}

// ---------------------------------------------------------------- stage helpers
export const inReel = () => document.body.classList.contains('gb-reel');
// Phone-width stage: hide minor labels and move the picture down, clear of the readout.
export function narrowFit(stage, minor = [], y0 = -0.14) {
  const narrow = stage.host.clientWidth < 560;
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const y = narrow && !inReel() ? y0 : 0;
  if (!stage.shift || stage.shift[1] !== y) stage.setShift(0, y);
  return narrow;
}
// Boards beside the model on a wide screen move to a reel position in the tall video.
export function reelPlace(list) {
  const r = inReel();
  for (const [b, pos, scale = 1, rotY = 0] of list) {
    if (!b.home) b.home = { p: b.mesh.position.clone(), r: b.mesh.rotation.clone(), s: b.mesh.scale.x };
    if (r) { b.mesh.position.set(...pos); b.mesh.scale.setScalar(scale); b.mesh.rotation.set(0, rotY, 0); }
    else { b.mesh.position.copy(b.home.p); b.mesh.scale.setScalar(b.home.s); b.mesh.rotation.copy(b.home.r); }
  }
}
// Press the matching segment button, so a tap on the stage updates the panel too.
export function pressSeg(value) {
  const b = [...document.querySelectorAll('#panel .seg button')].find((x) => x.dataset.v === String(value));
  if (b) b.click();
  return !!b;
}
// Deterministic random numbers, so every video frame is the same on every run.
export function seeded(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// A rod you can re-aim every frame between two points.
export function link(r, mat, seg = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, seg), mat);
  m.castShadow = true;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  m.span = (a, b) => {
    A.set(...a); B.set(...b);
    const L = A.distanceTo(B); m.visible = L > 1e-3; if (!m.visible) return;
    m.position.copy(A).add(B).multiplyScalar(0.5); m.scale.set(1, L, 1);
    m.quaternion.setFromUnitVectors(UP, B.sub(A).normalize());
  };
  return m;
}
// Turn a group whose front is +x to look at (x, z).
export function lookAtXZ(obj, x, z) { obj.rotation.y = Math.atan2(-(z - obj.position.z), x - obj.position.x); }
// Flame colour along a flame's life (0 = base, 1 = tip): pale yellow → orange → dim red.
export function flameRGB(life) {
  const k = clamp(life, 0, 1);
  return k < 0.45 ? [1, 0.9 - 0.45 * (k / 0.45), 0.45 - 0.35 * (k / 0.45)] : [1 - 0.55 * ((k - 0.45) / 0.55), 0.45 - 0.35 * ((k - 0.45) / 0.55), 0.1 - 0.07 * ((k - 0.45) / 0.55)];
}
// Instanced particles: n copies of geometry; hide() parks them all, tint() colours one.
export function particles(n, geo, mat) {
  const m = new THREE.InstancedMesh(geo, mat, n);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled = false;
  const o = new THREE.Object3D();
  m.put = (i, x, y, z, s = 1, rx = 0, ry = 0, rz = 0, sy = s) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.set(s, sy, s); o.updateMatrix(); m.setMatrixAt(i, o.matrix); };
  m.hide = (from = 0) => { for (let i = from; i < n; i++) m.put(i, 0, -50, 0, 0.0001); };
  // per-instance colour (multiplies the material colour); set up now so the shader includes it
  const c = new THREE.Color(1, 1, 1);
  for (let i = 0; i < n; i++) m.setColorAt(i, c);
  m.tint = (i, r, g, b) => { c.setRGB(r, g, b); m.setColorAt(i, c); };
  m.done = () => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; };
  m.hide(); m.done();
  return m;
}

// ---------------------------------------------------------------- people
// A faceless figure, feet at the origin, facing +x, about 1.75 m tall at s = 1.
// set({ armL, armR, lean, step, tilt }) poses it. Arms swing about z (forward is positive).
export function makeFigure({ top = 0x3b6fd8, legs = 0x2b3242, skin = 0xd6bc9a, hair = 0x2a1d16, helmet = null, s = 1 } = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const cloth = M.matte(top), trousers = M.matte(legs), sk = M.matte(skin, { roughness: 0.6 });
  const hip = 0.92 * s;
  const chest = new THREE.Mesh(new THREE.CapsuleGeometry(0.16 * s, 0.38 * s, 6, 14), cloth); chest.position.y = 0.3 * s; chest.scale.z = 1.25; chest.castShadow = true; body.add(chest);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * s, 0.05 * s, 0.1 * s, 10), sk); neck.position.y = 0.62 * s; body.add(neck);
  const head = sphere(0.11 * s, sk, 24); head.scale.set(0.95, 1.12, 0.95); head.position.y = 0.76 * s; body.add(head);
  const nose = sphere(0.018 * s, sk, 10); nose.position.set(0.1 * s, 0.755 * s, 0); body.add(nose);
  const capCol = helmet ?? hair;
  if (capCol !== null) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.118 * s, 20, 10, 0, TAU, 0, helmet ? 1.2 : 1.35), M.matte(capCol, helmet ? { roughness: 0.35 } : {})); c.position.set(0, 0.775 * s, 0); c.scale.set(0.98, 1.06, 0.98); if (!helmet) c.rotation.z = 0.45; body.add(c); }
  const limb = (len, r, mat) => { const p = new THREE.Group(); const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len - 2 * r, 4, 10), mat); m.position.y = -len / 2; m.castShadow = true; p.add(m); return p; };
  const arms = [-1, 1].map((z) => { const a = limb(0.62 * s, 0.05 * s, cloth); a.position.set(0, 0.52 * s, z * 0.22 * s); body.add(a); const hand = sphere(0.05 * s, sk, 12); hand.position.y = -0.62 * s; a.add(hand); a.hand = hand; return a; });
  const legsG = [-1, 1].map((z) => { const l = limb(0.88 * s, 0.065 * s, trousers); l.position.set(0, hip, z * 0.1 * s); g.add(l); const shoe = box(0.22 * s, 0.07 * s, 0.1 * s, M.matte(0x1b1d22)); shoe.position.set(0.05 * s, -0.88 * s, 0); l.add(shoe); return l; });
  body.position.y = hip;
  g.set = ({ armL = 0, armR = armL, lean = 0, step = 0, tilt = 0, spread = 0 } = {}) => {
    arms[0].rotation.set(-spread, 0, armL); arms[1].rotation.set(spread, 0, armR);
    body.rotation.z = -lean; body.rotation.x = tilt;
    legsG[0].rotation.z = step; legsG[1].rotation.z = -step;
  };
  g.body = body; g.head = head; g.arms = arms; g.legs = legsG; g.cloth = cloth; g.chest = chest;
  return g;
}

// ---------------------------------------------------------------- hardware
const steel = () => M.metal(0x9aa3b2, { roughness: 0.35 });
const blackM = () => M.matte(0x1d2027);
// A box truss from a to b (square, side w): four chords and zig-zag lacing.
export function makeTruss(a, b, w = 0.3, mat = M.metal(0xc4cad4, { roughness: 0.3 })) {
  const g = new THREE.Group(), A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A), L = dir.length(); dir.normalize();
  const up = Math.abs(dir.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const u = new THREE.Vector3().crossVectors(dir, up).normalize().multiplyScalar(w / 2), v = new THREE.Vector3().crossVectors(dir, u).normalize().multiplyScalar(w / 2);
  const corners = [u.clone().add(v), u.clone().sub(v), u.clone().negate().sub(v), u.clone().negate().add(v)];
  corners.forEach((c) => g.add(beam(A.clone().add(c).toArray(), B.clone().add(c).toArray(), 0.018, mat, 8)));
  const n = Math.max(2, Math.round(L / w));
  for (let i = 0; i < n; i++) {
    const p0 = A.clone().addScaledVector(dir, (i / n) * L), p1 = A.clone().addScaledVector(dir, ((i + 1) / n) * L);
    for (let k = 0; k < 4; k++) { const c0 = corners[k], c1 = corners[(k + 1) % 4]; g.add(beam(p0.clone().add(c0).toArray(), p1.clone().add(c1).toArray(), 0.008, mat, 5)); }
  }
  return g;
}
// A lamp head on a tall stand, lens facing +x. .head can be aimed; .face glows.
export function makeLamp(h = 2.4, hex = 0xfff1d6, r = 0.2) {
  const g = new THREE.Group(), st = M.metal(0x3a3f4b);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; g.add(beam([Math.cos(a) * 0.35, 0.02, Math.sin(a) * 0.35], [0, 0.4, 0], 0.014, st, 6)); }
  g.add(beam([0, 0.4, 0], [0, h, 0], 0.022, st, 8));
  const head = new THREE.Group(); head.position.y = h; g.add(head);
  const can = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.9, r * 1.8, 24), blackM()); can.rotation.z = Math.PI / 2; can.castShadow = true; head.add(can);
  const face = new THREE.Mesh(new THREE.CircleGeometry(r * 0.88, 24), M.glow(hex)); face.rotation.y = Math.PI / 2; face.position.x = r * 0.91; head.add(face);
  g.head = head; g.face = face;
  return g;
}
// A cine camera about 45 cm long, lens along +x, on an optional tripod of height h.
export function makeCamera(h = 1.35) {
  const g = new THREE.Group(), dark = M.matte(0x2a2d34);
  if (h > 0) { for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + 0.4; g.add(beam([Math.cos(a) * 0.33, 0, Math.sin(a) * 0.33], [0, h - 0.06, 0], 0.013, M.metal(0x3a3f4b), 6)); } }
  const cam = new THREE.Group(); cam.position.y = h + 0.1; g.add(cam);
  cam.add(box(0.32, 0.2, 0.16, dark));
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, 0.2, 20), M.matte(0x15171c)); lens.rotation.z = -Math.PI / 2; lens.position.x = 0.25; cam.add(lens);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), M.glass({ color: 0x9fd8ff })); glass.rotation.y = Math.PI / 2; glass.position.x = 0.352; cam.add(glass);
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.08, 4, 1, true), M.matte(0x111216, { side: THREE.DoubleSide })); hood.rotation.set(Math.PI / 4, 0, -Math.PI / 2); hood.position.x = 0.39; cam.add(hood);
  const handle = box(0.22, 0.03, 0.03, steel()); handle.position.y = 0.14; cam.add(handle);
  const tally = sphere(0.013, M.glow(0xff3344), 8); tally.position.set(0.12, 0.11, 0.08); cam.add(tally);
  g.cam = cam; g.tally = tally;
  return g;
}
// A large wind machine: a caged fan on a wheeled base, blowing along +x. .rotor spins about x.
export function makeWindMachine(R = 0.75) {
  const g = new THREE.Group();
  const base = box(0.9, 0.18, 1.1, blackM()); base.position.y = 0.2; g.add(base);
  for (const x of [-0.35, 0.35]) for (const z of [-0.45, 0.45]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16), M.matte(0x111111)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.1, z); g.add(w); }
  const hub = R + 0.35;
  g.add(beam([0, 0.28, -0.35], [0, hub, 0], 0.03, steel(), 8), beam([0, 0.28, 0.35], [0, hub, 0], 0.03, steel(), 8));
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.45, 20), M.metal(0x4a5260)); motor.rotation.z = Math.PI / 2; motor.position.set(-0.22, hub, 0); g.add(motor);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.05, 0.04, 10, 48), M.matte(0xffb547)); ring.rotation.y = Math.PI / 2; ring.position.set(0.1, hub, 0); g.add(ring);
  const shroud = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.06, R + 0.06, 0.35, 40, 1, true), M.matte(0x2a2e37, { side: THREE.DoubleSide })); shroud.rotation.z = Math.PI / 2; shroud.position.set(0.05, hub, 0); g.add(shroud);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; const sp = beam([0.25, hub, 0], [0.25, hub + Math.sin(a) * R, Math.cos(a) * R], 0.008, steel(), 4); g.add(sp); }
  const guard = new THREE.Mesh(new THREE.TorusGeometry(R * 0.5, 0.008, 6, 36), steel()); guard.rotation.y = Math.PI / 2; guard.position.set(0.25, hub, 0); g.add(guard);
  const rotor = new THREE.Group(); rotor.position.set(0.05, hub, 0); g.add(rotor);
  for (let i = 0; i < 4; i++) {
    const blade = box(0.03, R * 0.9, 0.3, M.matte(0x9aa3b2, { roughness: 0.4 }));
    const arm = new THREE.Group(); arm.rotation.x = (i / 4) * TAU; blade.position.y = R * 0.5; blade.rotation.y = 0.45; arm.add(blade); rotor.add(arm);
  }
  g.rotor = rotor; g.hubY = hub;
  return g;
}
// A rain bar: a horizontal pipe of length L along x with nozzles pointing down, held at height h by two
// stands, fed by a hose. .nozzles lists the nozzle x positions.
export function makeRainBar(L = 5, h = 5.2, n = 11) {
  const g = new THREE.Group(), st = M.metal(0x3a3f4b), pipeM = M.metal(0x8a929e, { roughness: 0.3 });
  for (const x of [-L / 2 - 0.2, L / 2 + 0.2]) {
    g.add(beam([x, 0, -0.4], [x, h + 0.1, 0], 0.03, st, 8), beam([x, 0, 0.4], [x, h + 0.1, 0], 0.03, st, 8));
    const foot = box(0.12, 0.06, 1, blackM()); foot.position.set(x, 0.03, 0); g.add(foot);
  }
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, L + 0.5, 14), pipeM); pipe.rotation.z = Math.PI / 2; pipe.position.y = h; g.add(pipe);
  g.nozzles = [];
  for (let i = 0; i < n; i++) { const x = -L / 2 + (i / (n - 1)) * L; const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 0.06, 8), M.metal(0xd8b25a)); nz.position.set(x, h - 0.05, 0); g.add(nz); g.nozzles.push(x); }
  g.add(beam([L / 2 + 0.25, h, 0], [L / 2 + 0.9, 0.05, 0.9], 0.03, M.matte(0xd23b3b), 8));
  g.h = h;
  return g;
}
// A fog / haze machine: a small box with a nozzle on +x.
export function makeHazer() {
  const g = new THREE.Group();
  const b = box(0.5, 0.28, 0.32, M.matte(0x2a2e37)); b.position.y = 0.14; g.add(b);
  const n = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 14), M.metal(0x8a929e)); n.rotation.z = Math.PI / 2; n.position.set(0.3, 0.18, 0); g.add(n);
  const led = sphere(0.015, M.glow(0x7be08c), 8); led.position.set(0.1, 0.24, 0.17); g.add(led);
  g.nozzle = [0.36, 0.18, 0];
  return g;
}
// A crash mat (landing pad), top at height t.
export function makeMat(w = 2.2, d = 1.6, t = 0.45, hex = 0x3867d6) {
  const g = new THREE.Group();
  const m = box(w, t, d, M.matte(hex, { roughness: 0.9 })); m.position.y = t / 2; g.add(m);
  const band = box(w + 0.01, 0.06, d + 0.01, M.matte(0x222733)); band.position.y = t * 0.5; g.add(band);
  g.top = t;
  return g;
}
// A clear polycarbonate safety shield on a frame, facing +x, w wide, h high.
export function makeShield(w = 1.2, h = 1.6) {
  const g = new THREE.Group(), fr = M.metal(0x3a3f4b);
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), M.clear(0xbfe3ff, 0.22)); pane.rotation.y = Math.PI / 2; pane.position.y = h / 2 + 0.1; g.add(pane);
  for (const z of [-w / 2, w / 2]) g.add(beam([0, 0, z], [0, h + 0.1, z], 0.02, fr, 6));
  g.add(beam([0, h + 0.1, -w / 2], [0, h + 0.1, w / 2], 0.02, fr, 6), beam([0, 0.1, -w / 2], [0, 0.1, w / 2], 0.02, fr, 6));
  for (const z of [-w / 2, w / 2]) { const f = box(0.6, 0.04, 0.08, fr); f.position.set(0, 0.02, z); g.add(f); }
  return g;
}
// A fire extinguisher (red cylinder with a black hose), about 60 cm tall.
export function makeExtinguisher() {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 18), M.plastic(0xd4302b, { roughness: 0.3 })); c.position.y = 0.25; g.add(c);
  const top = sphere(0.08, M.plastic(0xd4302b, { roughness: 0.3 }), 14); top.position.y = 0.5; top.scale.y = 0.5; g.add(top);
  const valve = box(0.05, 0.08, 0.05, M.metal(0x2a2d34)); valve.position.y = 0.57; g.add(valve);
  g.add(beam([0.03, 0.58, 0], [0.12, 0.3, 0.05], 0.012, M.matte(0x111111), 6));
  return g;
}

// ---------------------------------------------------------------- debris physics
// Rigid pieces with gravity, air drag, floor bounce and friction, then rest. Each piece is a mesh
// already in the scene. launch(piece, v, w) gives it a velocity (m/s) and spin (rad/s).
export function debris(floorY = 0) {
  const list = [];
  const api = {
    list,
    add(mesh, halfH = 0.01) { const p = { mesh, v: new THREE.Vector3(), w: new THREE.Vector3(), halfH, live: false, home: { p: mesh.position.clone(), q: mesh.quaternion.clone() } }; list.push(p); return p; },
    launch(p, v, w) { p.v.set(...v); p.w.set(...w); p.live = true; },
    reset() { for (const p of list) { p.mesh.position.copy(p.home.p); p.mesh.quaternion.copy(p.home.q); p.v.set(0, 0, 0); p.w.set(0, 0, 0); p.live = false; } },
    // restitution e, floor friction mu, drag k (1/s: flat light pieces flutter more).
    step(dt, { e = 0.25, mu = 0.5, k = 0.15 } = {}) {
      dt = Math.max(0, Math.min(dt, 0.05));
      const q = new THREE.Quaternion(), ax = new THREE.Vector3();
      for (const p of list) {
        if (!p.live) continue;
        p.v.y -= G * dt;
        p.v.multiplyScalar(Math.exp(-k * dt));
        p.mesh.position.addScaledVector(p.v, dt);
        const wl = p.w.length();
        if (wl > 1e-4) { ax.copy(p.w).divideScalar(wl); q.setFromAxisAngle(ax, wl * dt); p.mesh.quaternion.premultiply(q); }
        const fy = floorY + p.halfH;
        if (p.mesh.position.y < fy) {
          p.mesh.position.y = fy;
          if (p.v.y < 0) p.v.y = -p.v.y * e;
          p.v.x *= 1 - mu; p.v.z *= 1 - mu; p.w.multiplyScalar(0.6);
          if (Math.abs(p.v.y) < 0.25 && Math.hypot(p.v.x, p.v.z) < 0.08) { p.v.set(0, 0, 0); p.w.set(0, 0, 0); p.live = false; }
        }
      }
    },
    moving() { return list.some((p) => p.live); },
  };
  return api;
}

export { THREE, M, box, beam, sphere, clamp };
