// Chapter 4: rigs and wires. Five working rigs in a row on one stage:
//  1. Wire flying: a performer in a harness on a wire over two pulleys to a counterweight. Ideal pulleys
//     make it an Atwood machine: a = (M − m) g / (M + m), tension T = 2 M m g / (M + m). With the brake on
//     (hovering) T = m g. The wire is 4.8 mm (3/16") 7×19 galvanised aircraft cable, minimum breaking
//     strength 4,200 lbf ≈ 18.7 kN (MIL-DTL-83420). Performer-flying rigs are designed with large margins;
//     a design factor of about 10 on wire rope is common practice (ESTA/ANSI E1.43 covers performer flying).
//  2. Cable cam: a camera trolley on a cable between two towers. For a point load P at distance a along a
//     span L, the cable dips y = P a (L − a) / (T L) below the chord (cable weight neglected).
//  3. Ratchet: a pneumatic cylinder yanks a harnessed stunt performer backwards onto a crash mat.
//     Force F = p A (63 mm bore → A = 3.12e-3 m²), routed through 3:1 pulleys so the performer travels
//     3 × the 0.6 m stroke with F/3 of pull. a = F/(3m) during the pull, then free flight.
//  4. Car on a gimbal: tilting a car body by θ makes riders feel g sin θ sideways, like a bend taken with
//     lateral acceleration a = g sin θ. At speed v that is a bend of radius r = v² / a.
//  5. Rotating room: a corridor set turns about its long axis. The performer keeps walking to stay at the
//     bottom (speed v = ω r). Centrifugal effect ω² r is tiny: at 1 rpm and r = 1.3 m, 0.014 m/s² (0.15% g).
//     The camera is bolted to the room, so on screen the performer seems to walk up the walls.
// All rigs and figures are generic, built for this box.
import { THREE, M, box, beam, clamp } from '../kit.js';
import {
  makeBoard, bg, heading, say, bar, COL, narrowFit, reelPlace, pressSeg, seeded, link, lookAtXZ, fmt, G, D2R, inReel,
  makeFigure, makeCamera, makeTruss, makeMat, TAU,
} from '../sfx.js';

const MBS = 18700;                     // N, 4.8 mm 7×19 galvanised cable (MIL-DTL-83420)
const BORE_A = Math.PI * 0.0315 ** 2;  // m², 63 mm cylinder
const STROKE = 0.6, RATIO = 3;
const ROOM_R = 1.3;                    // m, half the width of the corridor
export const RIGS = {
  wire: { name: 'Wire flying', x: -9.0, view: [[-6.2, 4.3, 10.8], [-8.9, 3.4, -0.3]] },
  cable: { name: 'Cable cam', x: 0, view: [[1.2, 5.2, 18.5], [-1.6, 4.6, -1.0]] },
  ratchet: { name: 'Ratchet', x: -2.6, view: [[-1.4, 3.2, 7.6], [-4.0, 1.8, -0.4]] },
  gimbal: { name: 'Car gimbal', x: 2.6, view: [[4.6, 3.6, 8.4], [1.7, 2.2, -0.4]] },
  room: { name: 'Rotating room', x: 7.6, view: [[10.4, 4.3, 10.6], [8.0, 3.1, -0.4]] },
};

export default {
  id: 'rigs',
  short: 'Rigs and wires',
  title: 'Flying, falling, driving and walking on walls',
  subtitle: 'Fly a performer on a counterweight, fire a ratchet, tilt a car on a gimbal and spin a rotating room.',
  view: { pos: [-6.2, 4.3, 10.8], target: [-8.9, 3.4, -0.3] },
  learn: `<p>When a hero flies, falls or runs up a wall, a <b>rig</b> is usually doing the work. <b>Wire flying</b> hangs a performer in a padded <b>harness</b> from thin steel wires. The wire runs over <b>pulleys</b> to a <b>counterweight</b> or a team of operators. Make the counterweight a little heavier than the performer and they rise gently. It's the same maths as a see-saw: <b>a = (M − m) g / (M + m)</b>. The wires hold many times the load, and VFX paints them out later.</p>
    <p>A <b>ratchet</b> is a fast air cylinder that yanks a performer backwards, as if blown off their feet, onto a <b>crash mat</b>. A <b>cable cam</b> flies a camera along a wire between two towers. For driving scenes, a car is mounted on a <b>gimbal</b>: tilt it and the actors feel pushed sideways, just like in a real bend, while nobody drives. Motion capture of stunts is its own craft; MocapClear, coming in its own box, covers it.</p>
    <p>The cleverest rig is the <b>rotating room</b>. The whole corridor set turns slowly, like a drum, with the camera bolted to it. Gravity still pulls the performer straight down, so they keep walking to stay at the bottom. On screen the room looks still, so they seem to walk up the walls and across the ceiling. Every rig is tested with sandbags first, rehearsed slowly, and watched by a safety team.</p>
    <p class="tip"><b>Try it:</b> pick a rig. For wire flying, set the counterweight just above the performer's mass and press “Go”. Fire the ratchet at different pressures. Spin the room and watch the camera view on the board.</p>`,
  terms: [
    { t: 'Harness', d: 'A padded vest and belt that spreads a wire’s pull across the hips and body.' },
    { t: 'Counterweight', d: 'A weight on the other end of a rope that balances or lifts a load.' },
    { t: 'Design factor', d: 'How many times stronger a rope or part is than the load it carries.' },
    { t: 'Ratchet', d: 'A fast air cylinder on a cable that yanks a performer backwards for a stunt.' },
    { t: 'Gimbal', d: 'A powered platform that tilts and shakes a set piece, like a car or ship.' },
    { t: 'Rotating set', d: 'A room built on rings so it can turn, with the camera fixed inside it.' },
    { t: 'Cable cam', d: 'A camera that travels along cables stretched between towers.' },
  ],
  defaults: { rig: 'wire', m: 70, cw: 80, bar: 5, roll: 8, rpm: 1, tension: 6 },
  controls: [
    { key: 'rig', type: 'seg', label: 'Rig (or tap one)', options: Object.entries(RIGS).map(([v, r]) => ({ v, label: r.name })) },
    { key: 'go', type: 'buttons', label: 'Run it', items: [
      { label: 'Go', act: (s, inst) => inst.go?.(s) },
      { label: 'Reset', act: (s, inst) => inst.reset?.(s) },
    ] },
    { key: 'm', type: 'range', label: 'Wire: performer mass', min: 40, max: 100, step: 1, fmt: (v) => `${Math.round(v)} kg` },
    { key: 'cw', type: 'range', label: 'Wire: counterweight', min: 30, max: 150, step: 1, fmt: (v) => `${Math.round(v)} kg` },
    { key: 'tension', type: 'range', label: 'Cable cam: cable tension', min: 1, max: 12, step: 0.5, fmt: (v) => `${v.toFixed(1)} kN` },
    { key: 'bar', type: 'range', label: 'Ratchet: air pressure', min: 2, max: 7, step: 0.1, fmt: (v) => `${v.toFixed(1)} bar` },
    { key: 'roll', type: 'range', label: 'Gimbal: tilt', min: -15, max: 15, step: 0.5, ends: ['left bend', 'right bend'], fmt: (v) => `${v.toFixed(1)}°` },
    { key: 'rpm', type: 'range', label: 'Room: rotation speed', min: 0, max: 3, step: 0.05, fmt: (v) => `${v.toFixed(2)} rpm` },
  ],
  quiz: [
    { q: 'A 70 kg performer is on a wire over pulleys to an 80 kg counterweight. When the brake is released, the performer…', options: ['Stays still', 'Rises slowly, speeding up', 'Falls', 'Shoots up at 1 g'], answer: 1, why: 'The heavier counterweight wins: a = (80 − 70) × 9.8 / 150 ≈ 0.65 m/s², a gentle, steady rise.' },
    { q: 'Why does the actor in a rotating room seem to walk up the wall?', options: ['Magnets in the shoes', 'The room turns but the camera turns with it, so on screen the room looks still', 'Strong centrifugal force', 'It is all VFX'], answer: 1, why: 'Gravity keeps pulling the actor down while the room turns round them. The camera is fixed to the room, so the room seems to stand still.' },
    { q: 'Tilting a car on a gimbal by 10° makes the riders feel…', options: ['Nothing', 'A sideways push like a bend, about 0.17 g', 'Weightless', 'Twice as heavy'], answer: 1, why: 'Gravity now has a sideways part g sin 10° ≈ 0.17 g, which feels just like cornering.' },
  ],
  reel: [
    { ms: 5000, caption: 'Wire flying: a counterweight a little heavier than the performer lifts them gently.', set: { rig: 'wire', m: 70, cw: 82 }, act: (s, inst) => { inst.reset?.(s); inst.go?.(s); }, spin: 0, view: { pos: [-7.6, 3.0, 3.8], target: [-8.0, 2.9, -0.2] } },
    { ms: 5400, caption: 'A rotating room turns with the camera, so the actor seems to walk up the walls.', set: { rig: 'room', rpm: 2.5 }, spin: 0, view: { pos: [8.3, 2.9, 3.9], target: [7.6, 2.4, -0.3] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const deck = box(23.5, 0.05, 6, M.matte(0x2d313b, { roughness: 0.8 })); deck.position.set(0.2, 0.025, -0.6); root.add(deck);
    const labels = {}, groups = {};
    const wireM = M.glow(0xe8eef8), ropeM = M.matte(0xd8cfae);
    const tag = (id, pos) => { labels[id] = stage.label(RIGS[id].name, pos, root); };

    // ---------------------------------------------------------------- 1. wire flying
    const wx = RIGS.wire.x, pA = [wx, 5.05, 0], pB = [wx + 2.6, 5.05, 0];
    const gW = new THREE.Group(); root.add(gW); groups.wire = gW;
    gW.add(makeTruss([wx - 0.8, 5.35, 0], [wx + 3.1, 5.35, 0], 0.32));
    for (const x of [wx - 0.8, wx + 3.1]) gW.add(makeTruss([x, 0.05, 0], [x, 5.2, 0], 0.32));
    const pulley = (p) => { const w = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 8, 24), M.metal(0xffb547)); w.position.set(...p); gW.add(w); return w; };
    const wheelA = pulley(pA), wheelB = pulley(pB);
    const guide = box(0.06, 4.2, 0.06, M.metal(0x5b6270)); guide.position.set(pB[0] + 0.22, 2.2, 0); gW.add(guide);
    const arbor = new THREE.Group(); gW.add(arbor);
    const cwBox = box(0.36, 0.7, 0.3, M.metal(0x4a5260)); cwBox.position.y = -0.35; arbor.add(cwBox);
    for (let i = 0; i < 5; i++) { const pl = box(0.34, 0.1, 0.28, M.metal(0x7a8290)); pl.position.y = -0.1 - i * 0.12; arbor.add(pl); }
    const flyer = makeFigure({ top: 0x7a3fb5, legs: 0x2b3242 }); flyer.position.set(wx, 0.05, 0); flyer.rotation.y = -Math.PI / 2; gW.add(flyer);
    const harness = box(0.44, 0.12, 0.34, M.matte(0x222222)); harness.position.y = 0.95; flyer.add(harness);
    const spreader = box(0.7, 0.04, 0.04, M.metal(0x9aa3b2)); gW.add(spreader);
    const lw1 = link(0.008, wireM), lw2 = link(0.008, wireM), lMain = link(0.01, wireM), lTop = link(0.01, wireM), lDown = link(0.01, wireM);
    gW.add(lw1, lw2, lMain, lTop, lDown);
    const matW = makeMat(2.0, 1.6, 0.25); matW.position.set(wx, 0.05, 0); gW.add(matW);
    const ops = makeFigure({ top: 0x5ce1a9 }); ops.position.set(pB[0] + 0.8, 0.05, 0.8); lookAtXZ(ops, pB[0], 0); ops.set({ armL: 1.2, armR: 1.0 }); gW.add(ops);
    tag('wire', [wx + 1.1, 5.9, 0]);
    let wy = 0, wv = 0, wmode = 'hold';

    // ---------------------------------------------------------------- 2. cable cam over the whole stage
    const gC = new THREE.Group(); root.add(gC); groups.cable = gC;
    const t1 = [-11.2, 7.2, -3.0], t2 = [11.4, 7.2, -3.0], SPAN = t2[0] - t1[0];
    gC.add(makeTruss([t1[0], 0.05, t1[2]], [t1[0], t1[1], t1[2]], 0.4), makeTruss([t2[0], 0.05, t2[2]], [t2[0], t2[1], t2[2]], 0.4));
    const c1 = link(0.012, M.metal(0x2a2d34)), c2 = link(0.012, M.metal(0x2a2d34)); gC.add(c1, c2);
    const trolley = new THREE.Group(); gC.add(trolley);
    trolley.add(box(0.5, 0.18, 0.3, M.matte(0x3a3f4b)));
    const hang = makeCamera(0); hang.position.y = -0.55; hang.rotation.y = Math.PI / 2; hang.rotation.z = 0; trolley.add(hang);
    trolley.add(beam([0, -0.08, 0], [0, -0.42, 0], 0.02, M.metal(0x9aa3b2), 6));
    tag('cable', [0, 7.9, -3.0]);
    let ca = 0.3;

    // ---------------------------------------------------------------- 3. ratchet
    const rx = RIGS.ratchet.x, startX = rx + 1.1;
    const gR = new THREE.Group(); root.add(gR); groups.ratchet = gR;
    const matR = makeMat(2.4, 1.7, 0.45, 0x3867d6); matR.position.set(rx - 0.9, 0.05, 0); gR.add(matR);
    const post = box(0.12, 1.2, 0.12, M.metal(0x5b6270)); post.position.set(rx - 2.35, 0.65, 0); gR.add(post);
    const rPul = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.025, 8, 20), M.metal(0xffb547)); rPul.position.set(rx - 2.3, 1.15, 0); gR.add(rPul);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.8, 16), M.metal(0xc0392b, { roughness: 0.4 })); cyl.rotation.z = Math.PI / 2; cyl.position.set(rx - 1.5, 0.12, -1.1); gR.add(cyl);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.7, 10), M.metal(0xd8dde6)); rod.rotation.z = Math.PI / 2; gR.add(rod);
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 18), M.matte(0x3a7bd5)); tank.position.set(rx - 0.4, 0.4, -1.4); gR.add(tank);
    const floorPul = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 8, 16), M.metal(0xffb547)); floorPul.rotation.x = Math.PI / 2; floorPul.position.set(rx - 2.35, 0.12, -1.1); gR.add(floorPul);
    const rc1 = link(0.007, wireM), rc2 = link(0.007, wireM), rc3 = link(0.007, wireM); gR.add(rc1, rc2, rc3);
    const faller = makeFigure({ top: 0xe07a5f, legs: 0x2b3242 }); faller.rotation.y = -Math.PI / 2; gR.add(faller);
    const rHar = box(0.44, 0.12, 0.34, M.matte(0x222222)); rHar.position.y = 1.0; faller.add(rHar);
    tag('ratchet', [rx, 2.4, 0]);
    let rt = -1, rX = startX, rV = 0, rPh = 'ready', rFall = 0, rPeak = 0;

    // ---------------------------------------------------------------- 4. car on a gimbal
    const gx = RIGS.gimbal.x;
    const gG = new THREE.Group(); root.add(gG); groups.gimbal = gG;
    const base = box(2.6, 0.2, 1.6, M.matte(0x2a2e37)); base.position.set(gx, 0.15, 0); gG.add(base);
    const plat = new THREE.Group(); plat.position.set(gx, 1.0, 0); gG.add(plat);
    plat.add(box(3.4, 0.08, 1.9, M.metal(0x5b6270)));
    const car = new THREE.Group(); car.position.y = 0.34; plat.add(car);
    const paint = M.plastic(0x2e86de, { roughness: 0.3 }), glassD = M.matte(0x1b2430, { roughness: 0.15 });
    const body = box(3.4, 0.5, 1.6, paint); car.add(body);
    const cabin = box(1.8, 0.5, 1.45, glassD); cabin.position.set(-0.15, 0.5, 0); car.add(cabin);
    const roof = box(1.6, 0.06, 1.4, paint); roof.position.set(-0.15, 0.77, 0); car.add(roof);
    for (const x of [-1.2, 1.2]) for (const z of [-0.78, 0.78]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 20), M.matte(0x111111)); w.rotation.x = Math.PI / 2; w.position.set(x, -0.22, z); car.add(w); }
    for (const z of [-0.35, 0.35]) { const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 10), M.matte(0xd6bc9a)); head.position.set(-0.1, 0.52, z); car.add(head); }
    const acts = [[-1.0, -0.6], [-1.0, 0.6], [1.0, -0.6], [1.0, 0.6]].map(([x, z]) => { const r = link(0.05, M.metal(0xd8dde6)), c = link(0.08, M.matte(0x1d2027)); gG.add(r, c); return { r, c, x, z }; });
    const led = box(4.2, 2.4, 0.08, M.glow(0x274a7a)); led.position.set(gx, 1.7, -1.9); gG.add(led);
    tag('gimbal', [gx, 2.9, 0]);
    let bumpT = 0, bumpy = false;

    // ---------------------------------------------------------------- 5. rotating room
    const ox = RIGS.room.x, AX = 2.2, S = ROOM_R * 2, LEN = 3.6;
    const gRm = new THREE.Group(); root.add(gRm); groups.room = gRm;
    for (const x of [ox - LEN / 2 - 0.1, ox + LEN / 2 + 0.1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.09, 10, 48), M.metal(0xb0b6c0)); ring.rotation.y = Math.PI / 2; ring.position.set(x, AX, 0); gRm.add(ring);
      for (const z of [-1.1, 1.1]) { const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 16), M.matte(0x2a2d34)); roller.rotation.z = Math.PI / 2; roller.position.set(x, AX - Math.sqrt(1.95 ** 2 - 1.1 ** 2) - 0.2, z); gRm.add(roller); const st = box(0.3, 0.2, 0.3, M.matte(0x1d2027)); st.position.set(x, 0.12, z); gRm.add(st); }
    }
    const room = new THREE.Group(); room.position.set(ox, AX, 0); gRm.add(room);
    const wallCol = [0xd9cbb0, 0xc9d6c4, 0xcfc2d9];
    const flr = box(LEN, 0.06, S, M.matte(0x8a5a36)); flr.position.y = -ROOM_R; room.add(flr);
    const ceil = box(LEN, 0.06, S, M.matte(wallCol[0])); ceil.position.y = ROOM_R; room.add(ceil);
    const backW = box(LEN, S, 0.06, M.matte(wallCol[1])); backW.position.z = -ROOM_R; room.add(backW);
    const frontW = box(LEN, S, 0.06, M.clear(0xcfc2d9, 0.12)); frontW.position.z = ROOM_R; room.add(frontW);
    const pic = box(0.6, 0.45, 0.03, M.matte(0x3a6ea5)); pic.position.set(-0.4, 0.2, -ROOM_R + 0.05); room.add(pic);
    const lampC = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), M.glow(0xfff1c0)); lampC.position.set(0.4, ROOM_R - 0.14, 0); room.add(lampC);
    const rug = box(1.2, 0.02, 0.8, M.matte(0xb04a3a)); rug.position.set(0.2, -ROOM_R + 0.04, 0); room.add(rug);
    const roomCam = makeCamera(0); roomCam.position.set(LEN / 2 - 0.1, -0.1, 0); roomCam.rotation.y = Math.PI; room.add(roomCam);
    const walker = makeFigure({ top: 0xffb547, legs: 0x2b3242, s: 0.9 }); walker.rotation.y = -Math.PI / 2; gRm.add(walker);
    tag('room', [ox, 4.6, 0]);
    let phi = 0, spinning = false;

    stage.pickables = Object.values(groups);
    for (const [id, g] of Object.entries(groups)) g.traverse((o) => { o.userData.rig = id; });

    // ---------------------------------------------------------------- board (changes with the rig)
    let bd = {};
    const hist = [];
    const board = makeBoard(root, 3.0, 2.0, 720, 480, (g, w, h) => {
      bg(g, w, h);
      const r = bd.rig;
      if (r === 'wire') {
        heading(g, 'Forces on the wire', `performer ${bd.m} kg · counterweight ${bd.cw} kg`);
        const mx = Math.max(bd.cw, bd.m) * G * 1.25;
        bar(g, 24, 130, w - 48, 20, bd.m * G, mx, COL.soft, 'Performer’s weight m g', `${fmt(bd.m * G)} N`);
        bar(g, 24, 190, w - 48, 20, bd.cw * G, mx, COL.sfx, 'Counterweight M g', `${fmt(bd.cw * G)} N`);
        bar(g, 24, 250, w - 48, 20, bd.T, mx, COL.vfx, 'Wire tension T', `${fmt(bd.T)} N`);
        say(g, `Acceleration ${bd.a >= 0 ? 'up' : 'down'}: ${fmt(Math.abs(bd.a), 2)} m/s²  (${fmt(Math.abs(bd.a) / G, 3)} g)`, 24, 318, { font: 'bold 21px sans-serif', col: '#fff' });
        say(g, `Wire could hold ${fmt(MBS)} N: ${fmt(MBS / Math.max(1, bd.T), 0)}× the load`, 24, 356, { font: 'bold 21px sans-serif', col: MBS / bd.T >= 10 ? COL.good : COL.bad });
        say(g, bd.cw <= bd.m ? 'Counterweight too light: the performer stays down.' : bd.cw - bd.m > 25 ? 'Too heavy: the rise is fast. Operators must brake hard.' : 'Gentle: a slow, smooth lift.', 24, 400, { font: '19px sans-serif', col: bd.cw <= bd.m ? COL.bad : bd.cw - bd.m > 25 ? COL.hot : COL.good });
      } else if (r === 'cable') {
        heading(g, 'Cable cam sag', `span ${fmt(SPAN, 1)} m · camera and trolley 25 kg · tension ${fmt(bd.T / 1000, 1)} kN`);
        const x0 = 40, x1 = w - 40, yT = 170, k = 60;
        g.strokeStyle = 'rgba(255,255,255,.25)'; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(x0, yT); g.lineTo(x1, yT); g.stroke(); g.setLineDash([]);
        const xa = x0 + (x1 - x0) * bd.a / SPAN, ya = yT + bd.sag * k * 10;
        g.strokeStyle = '#d8dde6'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, yT); g.lineTo(xa, ya); g.lineTo(x1, yT); g.stroke();
        g.fillStyle = COL.vfx; g.fillRect(xa - 12, ya, 24, 20);
        say(g, `dip under the camera: ${fmt(bd.sag * 100, 1)} cm (drawn ×10)`, 24, 330, { font: 'bold 22px sans-serif', col: '#fff' });
        say(g, 'Tighter cable, smaller dip, but more force on the towers.', 24, 370, { font: '19px sans-serif', col: COL.soft });
      } else if (r === 'ratchet') {
        heading(g, 'Ratchet pull', `${fmt(bd.bar, 1)} bar on a 63 mm cylinder, 3:1 pulleys`);
        const x0 = 50, y0 = 400, W2 = w - 90, H2 = 250;
        g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y0 - H2); g.lineTo(x0, y0); g.lineTo(x0 + W2, y0); g.stroke();
        say(g, 'speed', x0 + 6, y0 - H2 + 16, { font: '16px sans-serif', col: COL.soft }); say(g, 'time →', x0 + W2 - 60, y0 + 24, { font: '16px sans-serif', col: COL.soft });
        g.strokeStyle = COL.sfx; g.lineWidth = 3; g.beginPath();
        hist.forEach(([tt, v], i) => { const X = x0 + (tt / 1.2) * W2, Y = y0 - (v / 8) * H2; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke();
        say(g, `peak pull ${fmt(bd.g, 2)} g · top speed ${fmt(bd.v, 1)} m/s`, 24, 110, { font: 'bold 21px sans-serif', col: '#fff' });
      } else if (r === 'gimbal') {
        heading(g, 'Faking a bend by tilting', `tilt ${fmt(bd.roll, 1)}° → sideways push g·sin θ`);
        const a = Math.abs(G * Math.sin(bd.roll * D2R));
        bar(g, 24, 140, w - 48, 20, a, G * 0.3, COL.sfx, 'Sideways push felt by the actors', `${fmt(a, 2)} m/s² (${fmt(a / G, 2)} g)`);
        [30, 50, 80].forEach((kmh, i) => { const v = kmh / 3.6, r2 = a > 0.01 ? (v * v) / a : Infinity; say(g, `Like a bend at ${kmh} km/h with radius ${r2 === Infinity ? '∞' : fmt(r2) + ' m'}`, 24, 230 + i * 44, { font: '21px sans-serif', col: '#fff' }); });
        say(g, 'The LED screen behind shows the moving road.', 24, 400, { font: '19px sans-serif', col: COL.soft });
      } else if (r === 'room') {
        heading(g, 'What the camera in the room sees', `room turned ${fmt(((bd.phi / D2R) % 360 + 360) % 360)}°`);
        const cx = w / 2, cy = 280, a2 = 150;
        g.fillStyle = '#cfc7b4'; g.fillRect(cx - a2, cy - a2, 2 * a2, 2 * a2);
        g.fillStyle = '#8a5a36'; g.fillRect(cx - a2, cy + a2 - 12, 2 * a2, 12);
        g.fillStyle = '#3a6ea5'; g.fillRect(cx - 40, cy - 50, 80, 60);
        g.fillStyle = '#fff1c0'; g.beginPath(); g.arc(cx, cy - a2 + 18, 10, 0, TAU); g.fill();
        // gravity points "down" in the world; in the room's frame it turns by −φ
        const gx2 = Math.sin(bd.phi), gy2 = Math.cos(bd.phi);
        const reach = a2 / Math.max(Math.abs(gx2), Math.abs(gy2));
        const fx = cx + gx2 * (reach - 12), fy = cy + gy2 * (reach - 12);
        g.save(); g.translate(fx, fy); g.rotate(-bd.phi);
        g.fillStyle = '#ffb547'; g.fillRect(-10, -80, 20, 56); g.fillStyle = '#2b3242'; g.fillRect(-9, -26, 18, 26);
        g.fillStyle = '#d6bc9a'; g.beginPath(); g.arc(0, -92, 12, 0, TAU); g.fill(); g.restore();
        g.strokeStyle = COL.vfx; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + gx2 * 70, cy + gy2 * 70); g.stroke();
        say(g, 'gravity', cx + gx2 * 80 - 20, cy + gy2 * 80 + 6, { font: 'bold 16px sans-serif', col: COL.vfx });
      }
    }, [wx + 1.4, 2.7, -2.3]);

    let rig0 = '', frame = 0;
    const inst = {
      go(st) {
        const r = st ? st.rig : inst.rig;
        if (r === 'wire') wmode = wy >= 2.79 ? 'land' : 'fly';
        if (r === 'ratchet') { inst.reset(st); rt = 0; rPh = 'pull'; }
        if (r === 'gimbal') bumpy = !bumpy;
        if (r === 'room') spinning = !spinning;
        if (r === 'cable') ca = 0;
      },
      reset(st) {
        const r = st ? st.rig : inst.rig;
        if (r === 'wire') { wy = 0; wv = 0; wmode = 'hold'; }
        if (r === 'ratchet') { rt = -1; rX = startX; rV = 0; rPh = 'ready'; rFall = 0; rPeak = 0; hist.length = 0; }
        if (r === 'room') { phi = 0; spinning = false; }
        if (r === 'gimbal') bumpy = false;
      },
      rig: 'wire',
      update(dt, s) {
        dt = Math.max(0, dt); frame++;
        const narrow = narrowFit(stage, Object.entries(labels).filter(([id]) => id !== s.rig).map(([, l]) => l), -0.1);
        inst.rig = s.rig;
        if (rig0 !== s.rig) {
          rig0 = s.rig;
          if (!inReel() && stage.home) stage.setView(...RIGS[s.rig].view, 1.0);
          const bx = { wire: [wx + 1.4, 2.7, -2.3], cable: [0, 4.2, -3.2], ratchet: [rx + 0.6, 2.9, -2.0], gimbal: [gx + 2.0, 3.4, -2.2], room: [ox + 3.4, 3.0, -1.2] }[s.rig];
          board.mesh.position.set(...bx); board.mesh.scale.setScalar(1.3); board.home = null;
          if (s.rig === 'room') spinning = true;
        }
        for (const [id, l] of Object.entries(labels)) l.element.classList.toggle('hot', id === s.rig);
        const bp = board.home ? board.home.p : board.mesh.position;
        const rb = { wire: [wx + 0.6, 5.5, -2.3], room: [ox, 5.0, -1.6] }[s.rig] || [bp.x, bp.y + 1.6, bp.z];
        reelPlace([[board, rb, 0.9]]);

        // 1. wire flying (Atwood machine with a brake at the top)
        const m = s.m, Mw = s.cw;
        let a = 0, T = m * G;
        if (wmode === 'fly') {
          a = ((Mw - m) * G) / (Mw + m); T = (2 * Mw * m * G) / (Mw + m);
          if (wy <= 0 && a < 0) { a = 0; wv = 0; T = Mw * G; }
          wv += a * dt; wy += wv * dt;
          if (wy >= 2.8) { wy = 2.8; wv = 0; wmode = 'hold'; }
          if (wy <= 0) { wy = 0; wv = Math.max(0, wv); }
        } else if (wmode === 'land') {
          wv = -0.5; wy += wv * dt; T = m * G;
          if (wy <= 0) { wy = 0; wv = 0; wmode = 'hold'; }
        } else { T = wy > 0 ? m * G : Math.min(m, Mw) * G; }
        flyer.position.y = 0.3 + wy;
        flyer.set({ armL: wy > 0.1 ? 2.6 : 0.2, armR: wy > 0.1 ? 0.6 : 0.2, spread: wy > 0.1 ? 0.2 : 0, step: wy > 0.1 ? 0.2 : 0 });
        const hy = flyer.position.y + 1.05, sy = hy + 0.7;
        spreader.position.set(wx, sy, 0);
        lw1.span([wx - 0.18, hy, 0], [wx - 0.3, sy, 0]); lw2.span([wx + 0.18, hy, 0], [wx + 0.3, sy, 0]);
        lMain.span([wx, sy, 0], [pA[0], pA[1] - 0.13, 0]); lTop.span([pA[0], pA[1] + 0.13, 0], [pB[0], pB[1] + 0.13, 0]);
        const cwTop = 4.4 - wy; arbor.position.set(pB[0] + 0.13, cwTop, 0); lDown.span([pB[0] + 0.13, pB[1], 0], [pB[0] + 0.13, cwTop, 0]);
        wheelA.rotation.z = -wy / 0.13; wheelB.rotation.z = -wy / 0.13;
        inst.wire = { a: wmode === 'fly' ? a : 0, T, v: wv, y: wy, mode: wmode };

        // 2. cable cam: trolley shuttles along the span
        ca += dt * 0.12;
        const aPos = (0.5 - 0.42 * Math.cos(ca * TAU * 0.25)) * SPAN;
        const P = 25 * G, Tc = s.tension * 1000, sag = (P * aPos * (SPAN - aPos)) / (Tc * SPAN);
        const tx = t1[0] + aPos, ty = t1[1] - sag;
        trolley.position.set(tx, ty - 0.1, t1[2]); c1.span(t1, [tx, ty, t1[2]]); c2.span([tx, ty, t1[2]], t2);
        inst.cable = { sag, a: aPos, T: Tc };

        // 3. ratchet: pull phase (x decreases), then free flight onto the mat
        const Fp = s.bar * 1e5 * BORE_A, acc = Fp / RATIO / 75;           // 75 kg performer
        if (rPh === 'pull') { rt += dt; rV += acc * dt; rX -= rV * dt; if (startX - rX >= STROKE * RATIO) rPh = 'fly'; rPeak = acc; }
        else if (rPh === 'fly') { rt += dt; rX -= rV * dt; rV = Math.max(0, rV - 1.5 * dt); rFall = Math.min(1, rFall + dt * 2.2); if (rFall >= 1) rPh = 'down'; }
        else if (rPh === 'down') { rt += dt; rV = 0; }
        if (rPh !== 'ready' && rt <= 1.2 && frame % 2 === 0) hist.push([rt, rV]);
        faller.position.set(rX, rFall > 0 ? 0.05 + 0.45 * rFall : 0.05, 0);
        faller.body.rotation.z = rPh === 'ready' ? 0 : rPh === 'pull' ? -0.35 : -0.35 - rFall * 1.2;
        faller.rotation.z = rFall * 0.25;
        faller.set({ armL: rPh === 'ready' ? 0.2 : 1.3, armR: rPh === 'ready' ? 0.2 : 1.5, step: rPh === 'pull' ? 0.25 : 0, lean: rPh === 'ready' ? 0 : -0.35 - rFall * 1.2 });
        const hX = rX, hY = faller.position.y + 1.0;
        const rodEnd = rx - 2.1 + Math.min(STROKE, (startX - rX) / RATIO);
        rod.position.set(rodEnd + 0.35, 0.12, -1.1);
        rc1.span([hX - 0.2, hY, 0], [rx - 2.3, 1.15, 0]); rc2.span([rx - 2.35, 1.15, 0], [rx - 2.35, 0.12, -1.1]); rc3.span([rx - 2.35, 0.12, -1.1], [rodEnd, 0.12, -1.1]);
        inst.ratchet = { F: Fp, g: acc / G, v: Math.max(...hist.map((h) => h[1]), rV), ph: rPh };

        // 4. gimbal: tilt and bumps
        bumpT += dt;
        const bump = bumpy ? 0.03 * Math.sin(bumpT * 11) + 0.02 * Math.sin(bumpT * 23 + 1) : 0;
        const roll = s.roll * D2R;
        plat.rotation.set(roll + bump * 0.8, 0, bump * 0.5);
        plat.position.y = 1.0 + bump;
        plat.updateMatrixWorld(); gG.updateMatrixWorld();
        const v3 = new THREE.Vector3();
        for (const A of acts) {
          v3.set(A.x, -0.05, A.z); plat.localToWorld(v3); gG.worldToLocal(v3);
          const b0 = [gx + A.x, 0.25, A.z], mid = [(b0[0] + v3.x) / 2, (b0[1] + v3.y) / 2, (b0[2] + v3.z) / 2];
          A.c.span(b0, mid); A.r.span(mid, [v3.x, v3.y, v3.z]);
        }
        led.material.color.setHSL(0.6, 0.5, 0.22 + 0.04 * Math.sin(bumpT * 3));

        // 5. rotating room
        const w = (s.rpm * TAU) / 60;
        if (spinning) phi += w * dt;
        room.rotation.x = -phi;
        const pm = ((phi % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2), off = pm > Math.PI / 4 ? Math.PI / 2 - pm : pm;
        const down = ROOM_R / Math.cos(off);
        walker.position.set(ox + 0.1, AX - down + 0.03, 0);
        walker.set({ step: spinning && s.rpm > 0 ? 0.35 * Math.sin(bumpT * 4) : 0, armL: 0.2 * Math.sin(bumpT * 4), armR: -0.2 * Math.sin(bumpT * 4) });
        walker.rotation.set(0, -Math.PI / 2, 0);
        inst.room = { phi, w };

        // board
        const key = s.rig === 'wire' ? `${m}|${Mw}|${Math.round(T)}|${wmode}` : s.rig === 'cable' ? `${frame % 3}` : s.rig === 'ratchet' ? `${hist.length}|${s.bar}` : s.rig === 'gimbal' ? `${s.roll}` : `${frame % 2}`;
        if (key !== inst.key) { inst.key = key; bd = { rig: s.rig, m: Math.round(m), cw: Math.round(Mw), T, a: inst.wire.a, sag, a2: aPos, bar: s.bar, g: acc / G, v: inst.ratchet.v, roll: s.roll, phi }; bd.a = s.rig === 'cable' ? aPos : inst.wire.a; if (s.rig === 'cable') bd.T = Tc; board.redraw(); }
        if (narrow) labels[s.rig].visible = true;
      },
      readout(s) {
        const r = s.rig;
        if (r === 'wire') {
          const W = inst.wire || { a: 0, T: s.m * G, y: 0, mode: 'hold' };
          const aIdeal = ((s.cw - s.m) * G) / (s.cw + s.m);
          return `<div class="big">Wire flying</div>
            <div class="row"><span>Acceleration when released</span><b>${aIdeal > 0 ? fmt(aIdeal, 2) + ' m/s² up' : 'none: stays down'}</b></div>
            <div class="row"><span>Wire tension now</span><b>${fmt(W.T)} N</b></div>
            <div class="row"><span>Design factor (4.8 mm wire)</span><b>${fmt(MBS / W.T, 0)}×</b></div>
            <div class="row"><span>Height</span><b>${fmt(W.y, 2)} m · ${W.mode === 'fly' ? 'flying' : W.mode === 'land' ? 'lowering' : 'brake on'}</b></div>
            ${MBS / W.T >= 10 ? '<div class="ok">Wire holds more than 10× the load.</div>' : '<div class="no">Below a 10× margin: use a thicker wire.</div>'}`;
        }
        if (r === 'cable') { const C = inst.cable || { sag: 0, T: s.tension * 1000 }; return `<div class="big">Cable cam</div><div class="row"><span>Span</span><b>${fmt(SPAN, 1)} m</b></div><div class="row"><span>Cable tension</span><b>${fmt(C.T)} N</b></div><div class="row"><span>Dip under the camera</span><b>${fmt(C.sag * 100, 1)} cm</b></div><small>A camera and trolley of 25 kg. Real systems use winches in each tower to steer it anywhere over a stadium.</small>`; }
        if (r === 'ratchet') { const Fp = s.bar * 1e5 * BORE_A, acc = Fp / RATIO / 75; return `<div class="big">Ratchet</div><div class="row"><span>Cylinder force p × A</span><b>${fmt(Fp)} N</b></div><div class="row"><span>Pull on a 75 kg performer (3:1)</span><b>${fmt(Fp / RATIO)} N = ${fmt(acc / G, 2)} g</b></div><div class="row"><span>Speed after ${fmt(STROKE * RATIO, 1)} m</span><b>${fmt(Math.sqrt(2 * acc * STROKE * RATIO), 1)} m/s</b></div><small>Teams test with a sandbag dummy first, then raise the pressure in steps.</small>`; }
        if (r === 'gimbal') { const a = G * Math.sin(Math.abs(s.roll) * D2R); return `<div class="big">Car on a gimbal</div><div class="row"><span>Tilt</span><b>${fmt(s.roll, 1)}°</b></div><div class="row"><span>Sideways push felt</span><b>${fmt(a / G, 2)} g</b></div><div class="row"><span>Same as a bend at 50 km/h, radius</span><b>${a > 0.01 ? fmt((50 / 3.6) ** 2 / a) + ' m' : 'straight road'}</b></div><div class="row"><span>Road bumps</span><b>${bumpy ? 'on' : 'off'} (press Go)</b></div>`; }
        const w = (s.rpm * TAU) / 60;
        return `<div class="big">Rotating room</div>
          <div class="row"><span>One full turn</span><b>${s.rpm > 0 ? fmt(60 / s.rpm, 0) + ' s' : 'stopped'}</b></div>
          <div class="row"><span>Walking speed to stay at the bottom</span><b>${fmt(w * ROOM_R, 2)} m/s</b></div>
          <div class="row"><span>Centrifugal effect ω²r</span><b>${fmt((w * w * ROOM_R / G) * 100, 2)}% of g</b></div>
          <small>Gravity still points down; the camera turns with the room.</small>`;
      },
      pick(o) { let x = o; while (x && !x.userData.rig) x = x.parent; if (x) pressSeg(x.userData.rig); },
    };
    return inst;
  },
};
