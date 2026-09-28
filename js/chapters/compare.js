// Chapter 1: SFX vs VFX. The same shot built twice, side by side. On the left the effect is real and
// happens on set, in front of the camera (special effects, SFX). On the right the actor performs on a
// green screen and the effect is a computer layer added weeks later (visual effects, VFX).
// Three effects to compare: rain, a breaking window and fire. The crew on the left are the SFX
// department: supervisor, technicians and a licensed pyrotechnic operator.
// The numbers here are about light and time, not about how to make anything:
//  - Real flames give off real light: a flame bar lights the actor orange and flickers at the flame's
//    own few-hertz rhythm (buoyant flames puff at roughly f ≈ 1.5/√D Hz, Pagni 1990 / Cetegen & Ahmed 1993;
//    for a 0.3 m flame that is about 2.7 Hz). Here the orange light flickers at that rate.
//  - Film rain falls at raindrop terminal speed, about 6.5 m/s for a 2 mm drop (Gunn & Kinzer 1949).
import { THREE, M, box, clamp } from '../kit.js';
import {
  makeBoard, bg, heading, say, roundRect, COL, narrowFit, reelPlace, pressSeg, seeded, particles, lookAtXZ,
  makeFigure, makeCamera, makeLamp, makeRainBar, makeExtinguisher, flameRGB, TAU,
} from '../sfx.js';

export const ROLES = {
  sup: { name: 'SFX supervisor', col: 0xffb547, what: 'Leads the special-effects department. Plans every effect with the director, budgets it, builds a safety plan and signs off each rig before it runs.' },
  tech: { name: 'SFX technician', col: 0x5ce1a9, what: 'Builds and runs the rigs: rain bars, wind machines, breakaways, wires and gas lines. Many are welders, carpenters, plumbers or electricians too.' },
  pyro: { name: 'Licensed pyro operator', col: 0xff5a4d, what: 'The only person allowed to handle fire and pyrotechnic effects. Holds a government licence, sets the safety distances and has the final say to stop.' },
  vfx: { name: 'VFX artist', col: 0x8ef0ff, what: 'Works after the shoot, on a computer. Builds digital rain, glass or fire and blends it into the filmed plate, frame by frame.' },
};
export const FX = {
  rain: {
    name: 'Rain', sfx: 'Water from a rain bar, backlit so the drops shine', vfx: 'Digital drops composited over a dry actor',
    rows: [['Light on the actor', 'real, wet sheen', 'painted in later'], ['Actor feels it', 'yes: cold and wet', 'no: acts it'], ['Reset for take 2', 'dry the costume', 'instant'], ['Change it later', 'hard', 'easy']],
  },
  glass: {
    name: 'Breaking window', sfx: 'A breakaway pane that shatters for real', vfx: 'An empty frame with digital shards added',
    rows: [['Light on the actor', 'real glints', 'matched by hand'], ['Actor feels it', 'yes: a real flinch', 'no: acts it'], ['Reset for take 2', 'fit a new pane', 'instant'], ['Change it later', 'hard', 'easy']],
  },
  fire: {
    name: 'Fire', sfx: 'A gas flame bar run by a licensed operator', vfx: 'Digital flames over a green screen',
    rows: [['Light on the actor', 'real, flickering orange', 'must be faked'], ['Actor feels it', 'yes: heat on the face', 'no: acts it'], ['Reset for take 2', 'seconds (turn the gas on)', 'instant'], ['Change it later', 'hard', 'easy']],
  },
};
const FLICKER_HZ = 1.5 / Math.sqrt(0.3);     // ≈ 2.7 Hz puffing of a 0.3 m flame (Cetegen & Ahmed 1993)
const L = -2.4, R = 2.4;                       // set centres

export default {
  id: 'compare',
  short: 'SFX vs VFX',
  title: 'The same shot, done two ways',
  subtitle: 'Real effects on set, or digital effects added later. Compare them side by side and meet the SFX crew.',
  view: { pos: [0.9, 3.3, 9.0], target: [0.5, 1.9, -0.6] },
  learn: `<p><b>Special effects (SFX)</b> are real, physical tricks done <b>on set</b>, in front of the camera: rain from pipes, wind from giant fans, windows that shatter safely, fire from gas burners, creatures moved by motors. <b>Visual effects (VFX)</b> are added <b>later, on computers</b>, after the shoot. VFXClear, coming in its own box, shows how that side works.</p>
    <p>On the left, the rain, glass or fire is really there. On the right, the actor performs in front of a <b>green screen</b> and an artist adds the effect weeks later. Both can look great. The difference is <b>real light</b> and <b>real reactions</b>. Real fire throws flickering orange light on a face. Real rain soaks a shirt. A real window makes an actor flinch. On a computer, all of that has to be imitated by hand.</p>
    <p>The <b>SFX department</b> is led by an <b>SFX supervisor</b>, who plans each effect and its safety. <b>Technicians</b> build and run the rigs. Anything with fire or explosions belongs to a <b>licensed pyrotechnic operator</b>, and nobody else touches it. Most big films now mix both: a practical effect for the part the actor touches, and VFX to make it bigger or to hide the rigs. See FilmClear for how the whole crew fits together.</p>
    <p class="tip"><b>Try it:</b> switch between rain, a breaking window and fire, and compare the two halves. Watch the actor's face on the left when the fire is on. Tap a crew member to see their job.</p>`,
  terms: [
    { t: 'Special effects (SFX)', d: 'Physical effects made for real on set, in front of the camera. Also called practical effects.' },
    { t: 'Visual effects (VFX)', d: 'Effects created or added on computers after the shoot.' },
    { t: 'In camera', d: 'Captured for real by the camera at the moment of filming, not added later.' },
    { t: 'Green screen', d: 'A bright green backdrop a computer can remove and replace.' },
    { t: 'Plate', d: 'The filmed shot that VFX work is added on top of.' },
    { t: 'SFX supervisor', d: 'The head of the special-effects department, responsible for design and safety.' },
    { t: 'Pyrotechnic operator', d: 'A licensed specialist, the only person allowed to run fire and explosive effects.' },
  ],
  defaults: { fx: 'rain', role: 'sup', roll: true },
  controls: [
    { key: 'fx', type: 'seg', label: 'The effect', options: Object.entries(FX).map(([v, f]) => ({ v, label: f.name })) },
    { key: 'role', type: 'seg', label: 'Who does it? (or tap a person)', options: Object.entries(ROLES).map(([v, r]) => ({ v, label: r.name.replace('Licensed ', '') })) },
    { key: 'roll', type: 'toggle', label: 'Keep rolling', hint: 'Runs the effect again and again, like takes.' },
  ],
  quiz: [
    { q: 'What is the main difference between SFX and VFX?', options: ['SFX is only for sound', 'SFX happens for real on set; VFX is added on computers later', 'VFX is always cheaper', 'SFX only means explosions'], answer: 1, why: 'Special effects are physical and captured in camera. Visual effects are created in post-production on computers.' },
    { q: 'Why might a director choose real fire over digital fire for a close-up?', options: ['It is always safer', 'Real flames light the actor’s face and the actor reacts to real heat', 'Cameras cannot see digital fire', 'It needs no crew'], answer: 1, why: 'Real light and real reactions are hard to fake. Digital fire needs its light painted onto the face by hand.' },
    { q: 'Who is allowed to handle fire and pyrotechnic effects on set?', options: ['Any actor', 'The camera operator', 'A licensed pyrotechnic operator', 'The VFX artist'], answer: 2, why: 'Fire and pyrotechnics are run only by a licensed operator, who sets safety distances and can stop the shot.' },
  ],
  reel: [
    { ms: 5200, caption: 'Special effects happen for real on set. Visual effects are added later on a computer.', set: { fx: 'rain', role: 'sup', roll: true }, spin: 0, view: { pos: [0.2, 2.6, 7.8], target: [0, 2.0, -0.6] } },
    { ms: 5000, caption: 'Real fire throws real, flickering light on the actor. Digital fire has to fake it.', set: { fx: 'fire', role: 'pyro', roll: true }, spin: 0, view: { pos: [-2.2, 1.9, 2.4], target: [-2.4, 1.4, -0.9] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = seeded(11);
    // ---------------------------------------------------------------- two sets
    const deckL = box(4.4, 0.06, 4.2, M.matte(0x3a3530, { roughness: 0.9 })); deckL.position.set(L, 0.03, -0.6); root.add(deckL);
    const deckR = box(4.4, 0.06, 4.2, M.matte(0x1a8f3f, { roughness: 1 })); deckR.position.set(R, 0.03, -0.6); root.add(deckR);
    const wallL = box(4.4, 3.4, 0.1, M.matte(0x1c2230)); wallL.position.set(L, 1.7, -2.7); root.add(wallL);
    for (let i = 0; i < 6; i++) { const w = box(0.45, 0.6, 0.03, M.glow(i % 2 ? 0xffd79a : 0x6f86b3)); w.position.set(L - 1.6 + i * 0.65, 2.3 + (i % 3) * 0.25, -2.63); root.add(w); }
    const green = M.matte(0x1c9e45, { roughness: 1 });
    const wallR = box(4.4, 3.4, 0.1, green); wallR.position.set(R, 1.7, -2.7); root.add(wallR);
    for (let i = 0; i < 12; i++) { const mk = new THREE.Group(); const a = box(0.16, 0.025, 0.01, M.glow(0xffffff)), b = box(0.025, 0.16, 0.01, M.glow(0xffffff)); mk.add(a, b); mk.position.set(R - 1.8 + (i % 4) * 1.2, 0.8 + Math.floor(i / 4) * 0.9, -2.64); root.add(mk); }
    const divider = box(0.05, 3.6, 4.4, M.glow(0x2a3142)); divider.position.set(0, 1.8, -0.6); root.add(divider);
    const lblL = stage.label('<b>ON SET</b> · special effects (SFX)', [L, 3.75, -2.6], root);
    const lblR = stage.label('<b>IN THE COMPUTER</b> · visual effects (VFX)', [R, 3.75, -2.6], root);
    lblL.element.style.setProperty('--c', COL.sfx); lblL.element.classList.add('hot');
    lblR.element.style.setProperty('--c', COL.vfx); lblR.element.classList.add('hot');

    // actors facing the camera (+z)
    const actL = makeFigure({ top: 0xc9a27a, legs: 0x39404e }); actL.position.set(L, 0.06, -0.8); actL.rotation.y = -Math.PI / 2; root.add(actL);
    const actR = makeFigure({ top: 0xc9a27a, legs: 0x39404e }); actR.position.set(R, 0.06, -0.8); actR.rotation.y = -Math.PI / 2; root.add(actR);
    const dryCol = new THREE.Color(0xc9a27a), wetCol = new THREE.Color(0x7d6147);
    // cameras in front of each set
    const camL = makeCamera(1.3); camL.position.set(L, 0, 2.6); camL.rotation.y = Math.PI / 2; root.add(camL);
    const camR = makeCamera(1.3); camR.position.set(R, 0, 2.6); camR.rotation.y = Math.PI / 2; root.add(camR);

    // ---------------------------------------------------------------- rain (left: real water; right: CG layer)
    const rainBar = makeRainBar(3.4, 4.2, 9); rainBar.position.set(L, 0, -0.9); root.add(rainBar);
    const backLamp = makeLamp(2.6, 0xe8f2ff, 0.2); backLamp.position.set(L + 1.3, 0.06, -2.3); root.add(backLamp); lookAtXZ(backLamp, L, 2.6); backLamp.head.rotation.z = -0.2;
    const N = 360, streak = new THREE.BoxGeometry(0.008, 0.2, 0.008);
    const dropsL = particles(N, streak, M.glow(0xdcecff, { transparent: true, opacity: 0.75 })); root.add(dropsL);
    const dropsR = particles(N, streak, M.glow(0x8ef0ff, { transparent: true, opacity: 0.6 })); root.add(dropsR);
    const seedsD = Array.from({ length: N }, () => [rnd() * 3.4 - 1.7, rnd(), rnd() * 1.6 - 0.8]);
    // the CG layer on the right: a thin frame floating in front of the actor
    const layer = new THREE.Group(); layer.position.set(R, 1.75, 0.7); root.add(layer);
    const lyPlane = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3.2), M.ghost(0x8ef0ff, 0.06)); layer.add(lyPlane);
    const lyEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(3.8, 3.2)), new THREE.LineBasicMaterial({ color: 0x8ef0ff, transparent: true, opacity: 0.8 })); layer.add(lyEdge);
    const lyLbl = stage.label('CG layer, added in post', [R + 1.2, 3.45, 0.7], root);

    // ---------------------------------------------------------------- window (left: breakaway pane; right: empty frame)
    const frameMat = M.matte(0x6b4a2e);
    const mkFrame = (x) => { const g = new THREE.Group(); g.position.set(x + 1.1, 1.5, -0.4); for (const [w, h, px, py] of [[1.0, 0.06, 0, 0.6], [1.0, 0.06, 0, -0.6], [0.06, 1.26, -0.5, 0], [0.06, 1.26, 0.5, 0]]) { const b = box(w, h, 0.08, frameMat); b.position.set(px, py, 0); g.add(b); } const legA = box(0.06, 0.9, 0.06, frameMat); legA.position.set(-0.45, -1.05, 0); const legB = legA.clone(); legB.position.x = 0.45; g.add(legA, legB); root.add(g); return g; };
    const winL = mkFrame(L), winR = mkFrame(R);
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 1.14), M.clear(0xd8f0ff, 0.3)); winL.add(pane);
    const NS = 70, shardGeo = new THREE.TetrahedronGeometry(0.05);
    const shardsL = particles(NS, shardGeo, M.clear(0xe8f6ff, 0.55, { depthWrite: true })); root.add(shardsL);
    const shardsR = particles(NS, new THREE.TetrahedronGeometry(0.05), new THREE.MeshBasicMaterial({ color: 0x8ef0ff, wireframe: true })); root.add(shardsR);
    const seedsS = Array.from({ length: NS }, () => [rnd() - 0.5, rnd() - 0.5, 1.2 + rnd() * 2.2, rnd() * 2 - 1, rnd() * 6]);

    // ---------------------------------------------------------------- fire (left: flame bar with real light; right: CG flames)
    const barMat = M.metal(0x6c7380);
    const fbL = box(1.8, 0.06, 0.06, barMat); fbL.position.set(L, 0.12, -1.8); root.add(fbL);
    const fbR = box(1.8, 0.06, 0.06, M.ghost(0x8ef0ff, 0.5)); fbR.position.set(R, 0.12, -1.8); root.add(fbR);
    const NF = 160, flameGeo = new THREE.SphereGeometry(0.1, 8, 6);
    const flamesL = particles(NF, flameGeo, M.glow(0xffffff, { transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })); root.add(flamesL);
    const flamesR = particles(NF, new THREE.SphereGeometry(0.1, 6, 4), new THREE.MeshBasicMaterial({ color: 0x8ef0ff, wireframe: true, transparent: true, opacity: 0.6 })); root.add(flamesR);
    const seedsF = Array.from({ length: NF }, () => [rnd() * 1.7 - 0.85, rnd(), rnd() * 0.3 - 0.15]);
    const fireLight = new THREE.PointLight(0xff8a3a, 0, 7, 1.6); fireLight.position.set(L, 1.2, -1.6); root.add(fireLight);
    const pyroBox = box(0.4, 0.5, 0.3, M.matte(0x3a3f4b)); pyroBox.position.set(L - 1.7, 0.3, 1.6); root.add(pyroBox);
    const armed = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), M.glow(0xff3344)); armed.position.set(L - 1.7, 0.6, 1.76); root.add(armed);
    const ext = makeExtinguisher(); ext.position.set(L - 1.3, 0.06, 1.2); root.add(ext);

    // ---------------------------------------------------------------- crew
    const crew = {}, rings = {}, labels = {};
    const addCrew = (id, x, z, lx, lz, pose = {}) => {
      const p = makeFigure({ top: ROLES[id].col, legs: 0x22252c, helmet: id === 'pyro' ? 0xffd166 : null });
      p.position.set(x, 0, z); lookAtXZ(p, lx, lz); p.set(pose); root.add(p); crew[id] = p;
      p.traverse((o) => { o.userData.role = id; });
      const r = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 36), M.glow(ROLES[id].col, { transparent: true, opacity: 0.9, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.set(x, 0.07, z); root.add(r); rings[id] = r;
      labels[id] = stage.label(ROLES[id].name, [x, 2.05, z], root);
    };
    addCrew('sup', L + 1.1, 2.4, L, -0.8, { armL: 0.3 });
    addCrew('tech', L + 1.9, 0.6, L, -0.8, { armL: 0.9, armR: 0.5 });
    addCrew('pyro', L - 2.0, 1.95, L, -1.8, { armL: 0.9, armR: 0.9 });
    const desk = box(1.0, 0.75, 0.6, M.matte(0x2a2d34)); desk.position.set(R + 1.4, 0.4, 2.2); root.add(desk);
    const scr = box(0.6, 0.36, 0.03, M.glow(0x1b3550)); scr.position.set(R + 1.4, 1.02, 2.0); root.add(scr);
    addCrew('vfx', R + 1.4, 2.9, R + 1.4, 2.0, { armL: 1.1, armR: 1.1 });
    stage.pickables = Object.values(crew);

    // ---------------------------------------------------------------- comparison board
    let bd = { fx: 'rain' };
    const board = makeBoard(root, 3.6, 1.55, 900, 388, (g, w, h) => {
      bg(g, w, h);
      const f = FX[bd.fx];
      heading(g, `${f.name}: on set vs in the computer`);
      say(g, 'ON SET (SFX)', 340, 88, { font: 'bold 18px sans-serif', col: COL.sfx });
      say(g, 'COMPUTER (VFX)', 640, 88, { font: 'bold 18px sans-serif', col: COL.vfx });
      f.rows.forEach(([k, a, b], i) => {
        const y = 130 + i * 58;
        g.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.07)'; roundRect(g, 16, y - 34, w - 32, 50, 8); g.fill();
        say(g, k, 30, y, { font: '19px sans-serif', col: 'rgba(255,255,255,.72)' });
        say(g, a, 340, y, { font: 'bold 19px sans-serif', col: '#fff' });
        say(g, b, 640, y, { font: 'bold 19px sans-serif', col: '#fff' });
      });
    }, [1.9, 4.45, -2.6]);

    let t = 0, fxKey = '';
    return {
      update(dt, s) {
        dt = Math.max(0, dt);
        const narrow = narrowFit(stage, [...Object.values(labels), lyLbl], -0.1);
        reelPlace([[board, [0, 4.7, -2.6], 1.2]]);
        if (fxKey !== s.fx) { fxKey = s.fx; bd = { fx: s.fx }; board.redraw(); t = 0; }
        if (s.roll) t += dt; else t = Math.min(t + dt, 3.9);
        const cyc = t % 4;                 // a 4-second "take"
        const rain = s.fx === 'rain', glass = s.fx === 'glass', fire = s.fx === 'fire';
        rainBar.visible = rain; backLamp.visible = rain; winL.visible = glass; winR.visible = glass;
        fbL.visible = fire; fbR.visible = fire; pyroBox.visible = fire; armed.visible = fire && Math.floor(t * 2) % 2 === 0; ext.visible = fire;
        // rain: drops fall at ≈ 6.5 m/s from the 4.2 m bar (Gunn & Kinzer 1949)
        if (rain) {
          for (let i = 0; i < N; i++) {
            const [x, ph, z] = seedsD[i], y = 4.1 - ((t * 6.5 + ph * 4.1) % 4.1);
            dropsL.put(i, L + x, y + 0.06, -0.9 + z);
            dropsR.put(i, R + x, y + 0.06, 0.72, 1, 0, 0, 0);
          }
        } else { dropsL.hide(); dropsR.hide(); }
        dropsL.done(); dropsR.done();
        actL.cloth.color.lerpColors(dryCol, wetCol, rain ? clamp(t / 2, 0, 1) : 0);
        // glass: the breakaway pane shatters at 1.2 s in each take
        const br = cyc - 1.2;
        pane.visible = glass && br < 0;
        if (glass && br >= 0) {
          for (let i = 0; i < NS; i++) {
            const [u, v, vz, vx, spin] = seedsS[i];
            const x = u * 0.9 + vx * 0.6 * br, z = vz * br, y = Math.max(0.04, 1.5 + v * 1.1 + 0.6 * br - 0.5 * 9.81 * br * br);
            const p = [winL.position.x + x, y, winL.position.z + z];
            shardsL.put(i, ...p, 1, spin * br, spin * 0.7 * br, 0);
            shardsR.put(i, p[0] - L + R, p[1], p[2] + 1.1, 1, spin * br, 0, spin * br);
          }
        } else { shardsL.hide(); shardsR.hide(); }
        shardsL.done(); shardsR.done();
        const flinch = glass && br >= 0 && br < 1.2 ? Math.sin((br / 1.2) * Math.PI) : 0;
        actL.set({ armL: 0.1 + flinch * 1.9, armR: 0.1 + flinch * 1.6, lean: -flinch * 0.15 });
        actR.set({ armL: 0.1, armR: 0.1 });
        // fire: flame particles rise and shrink; the left one lights the actor
        if (fire) {
          for (let i = 0; i < NF; i++) {
            const [x, ph, z] = seedsF[i], life = (t * 0.9 + ph) % 1, hgt = 1.9 * life;
            const sc = (1.6 - life * 1.3) * (0.9 + 0.3 * Math.sin(t * 7 + i));
            const sway = 0.12 * Math.sin(t * 3 + i * 0.7) * life;
            flamesL.put(i, L + x * (1 - 0.5 * life) + sway, 0.2 + hgt, -1.8 + z, sc, 0, 0, 0, sc * 1.6);
            flamesL.tint(i, ...flameRGB(life));
            flamesR.put(i, R + x * (1 - 0.5 * life) + sway, 0.2 + hgt, -1.8 + z, sc, 0, 0, 0, sc * 1.6);
          }
          fireLight.intensity = 9 * (1 + 0.25 * Math.sin(TAU * FLICKER_HZ * t) + 0.1 * Math.sin(TAU * 6.3 * t));
        } else { flamesL.hide(); flamesR.hide(); fireLight.intensity = 0; }
        flamesL.done(); flamesR.done();
        layer.visible = true; lyEdge.material.opacity = 0.5 + 0.3 * Math.sin(t * 2);
        camL.tally.visible = camR.tally.visible = Math.floor(t * 2) % 2 === 0;
        for (const id of Object.keys(ROLES)) { rings[id].material.opacity = id === s.role ? 0.95 : 0.12; labels[id].element.classList.toggle('hot', id === s.role); labels[id].visible = !narrow || id === s.role; }
        crew.pyro.visible = true;
      },
      readout(s) {
        const f = FX[s.fx], r = ROLES[s.role];
        const num = s.fx === 'fire' ? ['Flame flicker (0.3 m flame)', `≈ ${FLICKER_HZ.toFixed(1)} Hz`] : s.fx === 'rain' ? ['Drop speed (2 mm drop)', '≈ 6.5 m/s'] : ['Break lasts (24 fps)', '≈ 24 frames'];
        return `<div class="big">${f.name}</div>
          <div class="row"><span>SFX</span><b>on set, in camera</b></div>
          <div class="row"><span>VFX</span><b>in post, on a computer</b></div>
          <div class="row"><span>${num[0]}</span><b>${num[1]}</b></div>
          <small><b>${r.name}:</b> ${r.what.split('. ')[0]}.</small>`;
      },
      pick(o) { const id = o.userData.role; if (id) pressSeg(id); },
    };
  },
};
