// Chapter 6: fire, safety first. A gas fire bar (think of a very long hob burner) fed through a hose, a
// shut-off valve and a remote-controlled valve, run from a control box by a licensed pyrotechnic operator.
// A fire marshal stands by with extinguishers, the camera sits behind a clear polycarbonate shield, and a
// checklist must be complete before the operator can ignite. An emergency stop closes the valve.
// This chapter deliberately gives no fuel types, quantities, mixtures or methods. The control is the fire's
// heat output in kW, as you would describe any burner.
// Physics (all standard fire-engineering correlations):
//  - Flame height, Heskestad (SFPE Handbook): L = 0.235 Q^(2/5) − 1.02 D, Q in kW, L and D in m. The bar's
//    2.4 m × 0.1 m burning area is treated as a circle of equal area, D = 0.55 m (a rough fit for a line
//    burner).
//  - Heat felt at distance R, point-source model: q'' = χr Q / (4π R²), radiant fraction χr ≈ 0.3 for a
//    clean gas flame (SFPE Handbook). Strong noon sunshine is about 1 kW/m². API 521 uses 1.58 kW/m² as a
//    level people can bear for a long time. Real set distances are set by the licensed operator and local
//    rules and are larger than this heat-only minimum.
//  - Fireball vs blast: a fireball is fuel burning in the open air, a deflagration. Its flame front moves at
//    metres to tens of metres per second, so the air is pushed gently and the pressure rise is tiny. A
//    detonation (what high explosives do) moves at thousands of metres per second as a shock wave; that is
//    what breaks things. Film fireballs are built for a big look and a small push.
import { THREE, M, box, clamp } from '../kit.js';
import {
  makeBoard, bg, heading, say, bar, COL, narrowFit, reelPlace, seeded, particles, link, lookAtXZ, fmt,
  makeFigure, makeCamera, makeShield, makeExtinguisher, flameRGB, TAU,
} from '../sfx.js';

const D_EQ = Math.sqrt((4 * 2.4 * 0.1) / Math.PI);         // 0.55 m
const CHI = 0.3, SAFE = 1.58, SUN = 1.0;                     // radiant fraction; kW/m² limits
export const flameH = (Q) => (Q > 0 ? Math.max(0.2, 0.235 * Math.pow(Q, 0.4) - 1.02 * D_EQ) : 0);
export const flux = (Q, R) => (CHI * Q) / (4 * Math.PI * R * R);      // kW/m²
export const safeR = (Q) => Math.sqrt((CHI * Q) / (4 * Math.PI * SAFE));
const CHECKS = [['rehearsed', 'Rehearsal done (gas off, then a small flame)'], ['marshal', 'Fire marshal and extinguishers standing by'], ['shield', 'Camera behind a shield'], ['clear', 'Area clear, everyone on their marks']];

export default {
  id: 'fire',
  short: 'Fire, safety first',
  title: 'Fire and fireballs, safety first',
  subtitle: 'Run a gas fire bar from the operator’s box, see how far the heat reaches, and learn why a fireball looks huge but pushes gently.',
  view: { pos: [3.4, 4.2, 12.4], target: [-0.2, 1.8, 0.8] },
  learn: `<p>Fire on a film set is never improvised. It belongs to a <b>licensed pyrotechnic operator</b>, a specialist who holds a government licence and follows strict rules. Most flames you see are <b>gas burners</b>: a <b>fire bar</b> is like a very long hob burner, fed through a hose and <b>valves</b> the operator controls from a box well away from it. Let go or hit the <b>emergency stop</b>, and the valve snaps shut. The flame dies in about a second.</p>
    <p>Before any fire, the team <b>rehearses</b>: first with the gas off, then with a small flame. A <b>fire marshal</b> stands by with extinguishers. Everyone keeps a <b>safety distance</b>, marked on the floor, and the camera sits behind a clear <b>shield</b> or runs by remote control. The heat you feel falls off with the <b>square of distance</b>: twice as far, a quarter of the heat.</p>
    <p>A movie <b>fireball</b> looks like a huge explosion, but it is mostly <b>fuel burning in the open air</b>. The flame spreads at metres per second, so it makes a big, bright, rolling ball of light with only a <b>gentle push</b> of air. A real explosion sends a <b>shock wave</b> at thousands of metres per second, which is what breaks things. Film fireballs are designed for the look, not the force. This box shows the ideas only: never try to make fire effects yourself.</p>
    <p class="tip"><b>Try it:</b> tick the safety checklist, then ignite. Turn up the fire size and watch the safety circle grow. Move the camera closer and check the heat. Try the fireball, then hit the emergency stop.</p>`,
  terms: [
    { t: 'Pyrotechnic operator', d: 'A licensed specialist who designs and fires flame and explosive effects.' },
    { t: 'Fire bar', d: 'A long gas burner that makes a line of flame on cue.' },
    { t: 'Emergency stop', d: 'A big red button that shuts off the fuel at once.' },
    { t: 'Fire marshal', d: 'A safety officer who stands by with extinguishers and can stop the shot.' },
    { t: 'Deflagration', d: 'Burning that spreads at below the speed of sound, like a fireball: bright but gentle.' },
    { t: 'Detonation', d: 'A reaction that races through as a shock wave, faster than sound: violent and destructive.' },
    { t: 'Inverse square law', d: 'Heat or light from a small source falls with distance squared: 2× as far, 1/4 as much.' },
  ],
  defaults: { Q: 600, dist: 7, rehearsed: true, marshal: true, shield: true, clear: true, on: false },
  controls: [
    { key: 'go', type: 'buttons', label: 'Operator’s box', items: [
      { label: 'Ignite', act: (s, inst) => inst.ignite?.(s) },
      { label: 'Fireball', act: (s, inst) => inst.fireball?.(s) },
      { label: 'Emergency stop', act: (s, inst) => inst.estop?.(s) },
    ] },
    { key: 'Q', type: 'range', label: 'Fire size (heat output)', min: 100, max: 2000, step: 10, ends: ['campfire', 'wall of flame'], fmt: (v) => `${fmt(v)} kW · flame ≈ ${flameH(v).toFixed(1)} m` },
    { key: 'dist', type: 'range', label: 'Camera distance', min: 2, max: 14, step: 0.1, ends: ['close', 'far'], fmt: (v) => `${v.toFixed(1)} m` },
    ...CHECKS.map(([key, label]) => ({ key, type: 'toggle', label })),
  ],
  onChange(s, key) { if (CHECKS.some(([k]) => k === key) && !s[key]) s.on = false; },
  quiz: [
    { q: 'Who runs fire effects on a film set?', options: ['Whoever is nearest', 'The lead actor', 'A licensed pyrotechnic operator', 'The editor'], answer: 2, why: 'Only a licensed operator handles fire and pyrotechnics, following a safety plan with a fire marshal on standby.' },
    { q: 'Why does a film fireball look huge but push only gently?', options: ['It is mostly fuel burning in open air, spreading at metres per second', 'It is made of paper', 'It is a detonation', 'The camera shrinks it'], answer: 0, why: 'A fireball is a deflagration. Its flame front moves slowly compared with a shock wave, so there is lots of light but little pressure.' },
    { q: 'If you move twice as far from a fire, the heat you feel becomes about…', options: ['Twice as much', 'Half', 'A quarter', 'The same'], answer: 2, why: 'Radiant heat from a compact fire falls with the square of distance: 2× the distance gives 1/4 the heat.' },
  ],
  reel: [
    { ms: 5200, caption: 'A fire bar is a big gas burner, run by a licensed operator with an emergency stop.', set: { Q: 300, dist: 7, rehearsed: true, marshal: true, shield: true, clear: true }, anim: { Q: [300, 1400] }, act: (s, inst) => inst.ignite?.(s), spin: 0, view: { pos: [1.2, 2.6, 3.8], target: [0, 1.9, -0.8] } },
    { ms: 5200, caption: 'A film fireball is fuel burning in open air: a huge look with only a gentle push.', set: { Q: 800, dist: 8 }, act: (s, inst) => { inst.ignite?.(s); inst.fireball?.(s); }, spin: 0.25, view: { pos: [1.2, 2.8, 4.6], target: [0, 2.8, -0.8] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = seeded(31);
    const deck = box(16, 0.05, 14, M.matte(0x2a2c30, { roughness: 0.95 })); deck.position.set(0, 0.025, 2.2); root.add(deck);
    // the fire bar on a low steel stand, on a non-combustible pad
    const pad = box(3.4, 0.04, 1.2, M.matte(0x4a4a4a)); pad.position.set(0, 0.07, -1); root.add(pad);
    const barG = new THREE.Group(); barG.position.set(0, 0.25, -1); root.add(barG);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 14), M.metal(0x6c7380)); pipe.rotation.z = Math.PI / 2; barG.add(pipe);
    for (const x of [-1.0, 1.0]) { const leg = box(0.05, 0.2, 0.3, M.metal(0x3a3f4b)); leg.position.set(x, -0.1, 0); barG.add(leg); }
    const pilot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), M.glow(0x6aa8ff)); pilot.position.set(1.25, 0.05, 0); barG.add(pilot);
    // supply line: hose → manual shut-off → remote valve → bar (gas supply kept far away, not modelled in detail)
    const supply = box(0.6, 0.9, 0.5, M.matte(0x5a6270)); supply.position.set(-6.2, 0.47, -1.8); root.add(supply);
    const cage = box(0.7, 1.0, 0.6, M.ghost(0xb0b6c0, 0.25)); cage.position.copy(supply.position); root.add(cage);
    const hose = link(0.03, M.matte(0x1a1a1a)); hose.span([-5.9, 0.12, -1.6], [-3.6, 0.12, -1.2]); root.add(hose);
    const valveBody = box(0.4, 0.25, 0.25, M.metal(0xd8b25a)); valveBody.position.set(-3.4, 0.2, -1.2); root.add(valveBody);
    const valveLamp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), M.glow(0xff3344)); valveLamp.position.set(-3.4, 0.4, -1.2); root.add(valveLamp);
    const hose2 = link(0.03, M.matte(0x1a1a1a)); hose2.span([-3.2, 0.12, -1.2], [-1.2, 0.25, -1.0]); root.add(hose2);
    const ctrl = link(0.01, M.matte(0xffd166)); ctrl.span([-3.4, 0.3, -1.1], [-4.6, 0.6, 3.6]); root.add(ctrl);
    const labels = [
      stage.label('Fire bar', [0, 0.8, -1.9], root),
      stage.label('Remote valve', [-3.4, 0.75, -1.2], root),
      stage.label('Gas supply, far away and caged', [-6.2, 1.3, -1.8], root),
    ];
    // operator's box with an emergency stop, and the operator
    const box1 = box(0.6, 0.9, 0.4, M.matte(0x3a3f4b)); box1.position.set(-4.6, 0.45, 3.6); root.add(box1);
    const estop = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 20), M.glow(0xff2233)); estop.position.set(-4.5, 0.95, 3.6); root.add(estop);
    const armLamp = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), M.glow(0x7be08c)); armLamp.position.set(-4.8, 0.95, 3.7); root.add(armLamp);
    const pyro = makeFigure({ top: 0xff5a4d, legs: 0x2b3242, helmet: 0xffd166 }); pyro.position.set(-5.2, 0, 3.9); lookAtXZ(pyro, 0, -1); pyro.set({ armL: 1.0, armR: 0.8 }); root.add(pyro);
    labels.push(stage.label('Licensed pyro operator', [-5.2, 2.1, 3.9], root));
    // fire marshal with extinguishers
    const marshal = makeFigure({ top: 0xffd166, legs: 0x2b3242, helmet: 0xd4302b }); marshal.position.set(4.6, 0, 2.6); lookAtXZ(marshal, 0, -1); root.add(marshal);
    const exts = [makeExtinguisher(), makeExtinguisher()]; exts[0].position.set(4.2, 0.05, 2.1); exts[1].position.set(5.0, 0.05, 2.2); exts.forEach((e) => root.add(e));
    const mLbl = stage.label('Fire marshal', [4.6, 2.1, 2.6], root);
    // camera, operator and shield (they move with the distance slider)
    const rig = new THREE.Group(); root.add(rig);
    const cam = makeCamera(1.2); cam.rotation.y = Math.PI / 2; rig.add(cam);
    const shield = makeShield(1.6, 1.8); shield.rotation.y = Math.PI / 2; shield.position.z = -0.7; rig.add(shield);
    const camOp = makeFigure({ top: 0x5ce1a9, legs: 0x2b3242 }); camOp.position.set(-0.3, 0, 0.7); camOp.rotation.y = Math.PI / 2; camOp.set({ armL: 1.2, armR: 1.1 }); rig.add(camOp);
    const cLbl = stage.label('Camera behind a shield', [0, 2.9, 0.4], rig);
    // safety circle on the floor at the heat-only minimum distance
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 96), M.glow(0xffd166, { transparent: true, opacity: 0.85, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.06, -1); root.add(ring);
    const ringLbl = stage.label('Heat-only minimum distance', [0, 0.25, 2], root);

    // flames and fireball
    const NF = 340;
    const flames = particles(NF, new THREE.SphereGeometry(0.12, 8, 6), M.glow(0xffffff, { transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false })); root.add(flames);
    const fS = Array.from({ length: NF }, () => [rnd() * 2.3 - 1.15, rnd(), rnd() * 0.2 - 0.1, rnd()]);
    const NB = 160;
    const ball = particles(NB, new THREE.SphereGeometry(0.26, 10, 8), M.glow(0xffffff, { transparent: true, opacity: 0.26, blending: THREE.AdditiveBlending, depthWrite: false })); root.add(ball);
    const bS = Array.from({ length: NB }, () => { const u = rnd() * 2 - 1, a = rnd() * TAU, r = Math.cbrt(rnd()); return [Math.sqrt(1 - u * u) * Math.cos(a) * r, u * r, Math.sqrt(1 - u * u) * Math.sin(a) * r, rnd()]; });
    const light = new THREE.PointLight(0xff8a3a, 0, 30, 1.4); light.position.set(0, 1.5, -1); root.add(light);

    // board: heat vs distance and the deflagration/detonation comparison
    let bd = {};
    const board = makeBoard(root, 3.6, 2.1, 780, 455, (g, w, h) => {
      bg(g, w, h);
      heading(g, 'How far does the heat reach?', `fire size ${fmt(bd.Q)} kW · heat ∝ 1/distance²`);
      const x0 = 60, y0 = 300, W2 = w - 100, H2 = 190, Rmax = 14, qMax = 4;
      g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0 - H2); g.lineTo(x0, y0); g.lineTo(x0 + W2, y0); g.stroke();
      const X = (R) => x0 + (R / Rmax) * W2, Y = (q) => y0 - clamp(q / qMax, 0, 1) * H2;
      for (const [q, c, t] of [[SAFE, COL.good, 'bearable for a long time 1.58'], [SUN, COL.soft, 'noon sun ≈ 1']]) { g.strokeStyle = c; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(x0, Y(q)); g.lineTo(x0 + W2, Y(q)); g.stroke(); g.setLineDash([]); say(g, t, x0 + W2, Y(q) - 6, { font: '15px sans-serif', col: c, align: 'right' }); }
      g.strokeStyle = COL.fire; g.lineWidth = 3; g.beginPath();
      for (let R = 1; R <= Rmax; R += 0.1) { const q = flux(bd.Q, R); R === 1 ? g.moveTo(X(R), Y(q)) : g.lineTo(X(R), Y(q)); } g.stroke();
      g.fillStyle = COL.vfx; g.beginPath(); g.arc(X(bd.R), Y(bd.q), 8, 0, TAU); g.fill();
      say(g, 'camera', X(bd.R) + 10, Y(bd.q) - 10, { font: 'bold 16px sans-serif', col: COL.vfx });
      say(g, 'distance →', x0 + W2 - 90, y0 + 22, { font: '15px sans-serif', col: COL.soft }); say(g, 'kW/m²', x0 - 50, y0 - H2 + 6, { font: '15px sans-serif', col: COL.soft });
      say(g, 'Flame front speed: fireball vs shock wave', 24, 358, { font: 'bold 18px sans-serif', col: '#fff' });
      bar(g, 24, 392, w - 48, 14, 10, 7000, COL.fire, '', '');
      bar(g, 24, 428, w - 48, 14, 7000, 7000, COL.bad, '', '');
      say(g, 'fireball (deflagration): about 10 m/s', 30, 386, { font: '15px sans-serif', col: COL.fire });
      say(g, 'high-explosive detonation: about 7,000 m/s', 30, 422, { font: '15px sans-serif', col: COL.bad });
    }, [4.6, 3.4, -2.8]);
    board.mesh.rotation.y = -0.3; board.mesh.scale.setScalar(1.25);

    let on = false, level = 0, fb = -1, stopT = -1, msg = '', t = 0;
    const ready = (s) => CHECKS.every(([k]) => s[k]);
    const inst = {
      ignite(s) { if (!ready(s)) { msg = 'no'; return; } on = true; s.on = true; stopT = -1; msg = ''; },
      fireball(s) { if (!ready(s)) { msg = 'no'; return; } fb = 0; msg = ''; },
      estop(s) { on = false; s.on = false; fb = fb >= 0 && fb < 0.3 ? -1 : fb; stopT = 0; msg = 'stop'; },
      update(dt, s) {
        dt = Math.max(0, dt); t += dt;
        const narrow = narrowFit(stage, [...labels, ringLbl, mLbl, cLbl], -0.1);
        reelPlace([[board, [0, 4.6, -2.6], 0.9]]);
        if (!ready(s) && on) { on = false; stopT = 0; }
        // gas level: opens fast, after a stop the gas left in the pipe burns off in about a second
        const target = on ? 1 : 0;
        level += (target - level) * (1 - Math.exp(-dt * (on ? 4 : 3.5)));
        if (stopT >= 0) stopT += dt;
        const Q = s.Q * level, L = flameH(Q);
        for (let i = 0; i < NF; i++) {
          const [x, ph, z, k] = fS[i];
          if (Q < 5) { flames.put(i, 0, -50, 0, 0.0001); continue; }
          const life = (t * 1.1 + ph) % 1, hgt = L * life;
          const sc = (1.5 - 1.2 * life) * (0.6 + 0.5 * clamp(L / 2.5, 0.3, 1.6)) * (0.85 + 0.3 * Math.sin(t * 9 + i));
          const sway = 0.25 * Math.sin(t * 2.7 + k * 6) * life;
          flames.put(i, x * (1 - 0.55 * life) + sway, 0.35 + hgt, -1 + z, sc, 0, 0, 0, sc * 1.7);
          flames.tint(i, ...flameRGB(life));
        }
        flames.done();
        pilot.visible = ready(s);
        // fireball: grows fast, glows, then rises and fades (a rolling ball of burning fuel)
        let fbGlow = 0;
        if (fb >= 0) {
          fb += dt;
          const grow = clamp(fb / 0.5, 0, 1), rise = Math.max(0, fb - 0.4) * 1.6, fade = 1 - clamp((fb - 1.4) / 1.2, 0, 1);
          const R = 0.4 + 1.6 * Math.sqrt(grow);
          for (let i = 0; i < NB; i++) {
            const [x, y, z, k] = bS[i], churn = 0.15 * Math.sin(t * 5 + k * 9);
            ball.put(i, x * R + churn, 1.0 + R * 0.8 + y * R + rise, -1 + z * R, (0.8 + k) * (0.5 + grow) * fade + 0.0001);
            const rr = Math.hypot(x, y, z), [cr, cg, cb] = flameRGB(0.15 + 0.6 * rr + 0.35 * clamp(fb - 0.8, 0, 1));
            ball.tint(i, cr * fade, cg * fade, cb * fade);
          }
          fbGlow = fade * grow;
          if (fb > 2.6) fb = -1;
        } else ball.hide();
        ball.done();
        light.intensity = 25 * clamp(Q / 1000, 0, 2) * (1 + 0.2 * Math.sin(t * 17) + 0.1 * Math.sin(t * 6.1)) + 90 * fbGlow;
        light.position.y = 0.4 + L * 0.4;
        // valve lamp (green = open), arm lamp, e-stop glow
        valveLamp.material.color.setHex(on ? 0x7be08c : 0xff3344);
        armLamp.visible = ready(s);
        estop.scale.y = stopT >= 0 && stopT < 0.4 ? 0.5 : 1;
        // camera rig along the line in front of the fire
        rig.position.set(0.8, 0.05, -1 + s.dist); rig.rotation.y = 0;
        cam.rotation.y = Math.PI / 2; shield.visible = s.shield;
        const Rs = safeR(Math.max(s.Q, 1));
        ring.scale.setScalar(Math.max(0.5, Rs)); ringLbl.position.set(0, 0.25, -1 + Math.max(0.5, Rs));
        marshal.visible = s.marshal; exts.forEach((e) => { e.visible = s.marshal; });
        marshal.set({ armL: 0.3, armR: on ? 0.6 : 0.2 });
        pyro.set({ armL: on ? 1.1 : 0.8, armR: stopT >= 0 && stopT < 0.5 ? 1.4 : 0.8 });
        const Rc = Math.hypot(0.8, s.dist, Math.max(0, 1.3 - (0.35 + L / 2)));
        const qc = flux(s.Q, Rc);
        const key = `${s.Q}|${s.dist.toFixed(1)}`;
        if (key !== bd.key) { bd = { key, Q: s.Q, R: Rc, q: qc }; board.redraw(); }
        inst.state = { on, Q, L, Rc, qc, Rs, msg };
      },
      readout(s) {
        const st = inst.state || { on: false, Q: 0, L: 0, Rc: s.dist, qc: 0, Rs: safeR(s.Q), msg: '' };
        const missing = CHECKS.filter(([k]) => !s[k]).map(([, l]) => l.split(' (')[0]);
        const qc = flux(s.Q, st.Rc);
        return `<div class="big">${st.on ? 'Fire bar lit' : st.msg === 'stop' ? 'Emergency stop: gas off' : 'Fire bar off'}</div>
          <div class="row"><span>Flame height (Heskestad)</span><b>${fmt(flameH(s.Q), 1)} m at ${fmt(s.Q)} kW</b></div>
          <div class="row"><span>Heat at the camera, ${fmt(st.Rc, 1)} m away</span><b>${fmt(qc, 2)} kW/m²</b></div>
          <div class="row"><span>Heat-only minimum distance</span><b>${fmt(safeR(s.Q), 1)} m</b></div>
          ${missing.length ? `<div class="no">Not safe to fire. Still to do: ${missing.join('; ')}.</div>` : qc > SAFE ? '<div class="no">Too hot at the camera: move it back or behind more shielding.</div>' : '<div class="ok">Checklist complete. The operator may fire.</div>'}`;
      },
    };
    return inst;
  },
};
