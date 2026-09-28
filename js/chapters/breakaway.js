// Chapter 3: breakaways. Four props made to break safely: a window pane, a bottle, a chair and ceiling
// rubble. "Hit it" throws a soft ball; the prop breaks into generic pieces that fly, fall, bounce and
// settle under gravity (the debris engine in sfx.js). A board compares each breakaway with the real thing.
// Numbers (densities and strengths are typical published values; breakaway recipes vary and are not given):
//  - Window: 0.9 × 1.1 m, 3 mm. Soda-lime glass 2,500 kg/m³ (Wikipedia "Soda–lime glass"); sugar glass is
//    mostly amorphous sugar, about 1,500 kg/m³ (sucrose crystal is 1,587 kg/m³; the glassy form is a little
//    less dense). Real glass breaks into long, razor-sharp shards; sugar glass is weak and crumbles into
//    blunt, light pieces.
//  - Bottle: a 330 mL glass bottle weighs about 200 g of glass. A breakaway resin bottle of the same wall
//    volume in a light polymer (about 1,050 kg/m³, like polystyrene) weighs about 0.42 times as much.
//  - Chair: 7 litres of wood. Red oak: 700 kg/m³, bending strength (MOR) 99 MPa. Balsa: 160 kg/m³, MOR 20 MPa
//    (The Wood Database, wood-database.com).
//  - Rubble: a 30 cm block. Concrete 2,400 kg/m³ → 65 kg. Polyurethane or polystyrene foam about 30 kg/m³
//    → 0.8 kg.
//  - Energy of a falling piece: E = m g h (h = the drop to the floor).
import { THREE, M, box, clamp } from '../kit.js';
import {
  makeBoard, bg, heading, say, bar, wrapText, COL, narrowFit, reelPlace, pressSeg, seeded, lookAtXZ, fmt, G, inReel,
  makeFigure, makeCamera, debris, TAU,
} from '../sfx.js';

export const PROPS = {
  window: {
    name: 'Window pane', x: -3.4, drop: 1.5,
    real: { name: 'Window glass', kg: 0.99 * 0.003 * 2500, piece: 0.06 * 0.9 * 1.1 * 0.003 * 2500 },
    fake: { name: 'Sugar glass', kg: 0.99 * 0.003 * 1500, piece: 0.06 * 0.9 * 1.1 * 0.003 * 1500 },
    edge: ['long, razor-sharp shards', 'small, blunt crumbs'],
    why: 'Sugar glass is mostly sugar cooked into a clear glass. It is weak and brittle, so it shatters with a light tap into blunt pieces. Modern versions use a clear resin that behaves the same way.',
  },
  bottle: {
    name: 'Bottle', x: -1.05, drop: 0.9,
    real: { name: 'Glass bottle', kg: 0.2, piece: 0.2 / 10 },
    fake: { name: 'Breakaway resin', kg: 0.2 * 0.42, piece: 0.2 * 0.42 / 10 },
    edge: ['sharp curved shards', 'thin, soft-edged flakes'],
    why: 'Breakaway bottles are cast in thin, brittle resin. They look like glass, weigh less than half as much and burst on contact instead of cutting.',
  },
  chair: {
    name: 'Chair', x: 1.3, drop: 0.5,
    real: { name: 'Oak chair', kg: 0.007 * 700, piece: 0.007 * 700 / 6, mpa: 99 },
    fake: { name: 'Balsa chair', kg: 0.007 * 160, piece: 0.007 * 160 / 6, mpa: 20 },
    edge: ['splinters, hard corners', 'snaps cleanly, soft wood'],
    why: 'Balsa is the lightest common timber. It is about a quarter the weight of oak and a fifth as strong, and the joints are pre-weakened so the chair falls apart on cue.',
  },
  rubble: {
    name: 'Ceiling rubble', x: 3.7, drop: 3.0,
    real: { name: 'Concrete block', kg: 0.027 * 2400, piece: 0.027 * 2400 },
    fake: { name: 'Foam block', kg: 0.027 * 30, piece: 0.027 * 30 },
    edge: ['crushing weight', 'bounces off'],
    why: 'Painted foam looks like concrete but weighs about 1/80 as much. Falling 3 m, a real 30 cm block lands with about 1,900 joules, like a grown-up dropping from a 3 m wall. The foam one lands with about 24 joules, like a cushion.',
  },
};

// Radial-and-ring crack pattern from an impact point, clipped to the pane rectangle.
function crackCells(w, h, px, py, rnd) {
  const K = 12, rings = [0.08, 0.2, 0.36, 0.58, 0.9, 1.5];
  const ang = Array.from({ length: K }, (_, k) => (k / K) * TAU + (rnd() - 0.5) * 0.35);
  const cells = [];
  const clip = (poly) => {
    const edges = [[(p) => p.x >= -w / 2, (a, b) => { const k = (-w / 2 - a.x) / (b.x - a.x); return { x: -w / 2, y: a.y + k * (b.y - a.y) }; }],
      [(p) => p.x <= w / 2, (a, b) => { const k = (w / 2 - a.x) / (b.x - a.x); return { x: w / 2, y: a.y + k * (b.y - a.y) }; }],
      [(p) => p.y >= -h / 2, (a, b) => { const k = (-h / 2 - a.y) / (b.y - a.y); return { x: a.x + k * (b.x - a.x), y: -h / 2 }; }],
      [(p) => p.y <= h / 2, (a, b) => { const k = (h / 2 - a.y) / (b.y - a.y); return { x: a.x + k * (b.x - a.x), y: h / 2 }; }]];
    let out = poly;
    for (const [inside, cut] of edges) {
      const inp = out; out = [];
      for (let i = 0; i < inp.length; i++) {
        const a = inp[i], b = inp[(i + 1) % inp.length];
        if (inside(b)) { if (!inside(a)) out.push(cut(a, b)); out.push(b); } else if (inside(a)) out.push(cut(a, b));
      }
      if (!out.length) break;
    }
    return out;
  };
  for (let k = 0; k < K; k++) {
    const a0 = ang[k], a1 = ang[(k + 1) % K] + (k === K - 1 ? TAU : 0);
    let r0 = 0;
    for (const r1 of rings) {
      const jr = r1 * (0.9 + rnd() * 0.2);
      const poly = r0 === 0
        ? [{ x: px, y: py }, { x: px + Math.cos(a0) * jr, y: py + Math.sin(a0) * jr }, { x: px + Math.cos((a0 + a1) / 2) * jr, y: py + Math.sin((a0 + a1) / 2) * jr }, { x: px + Math.cos(a1) * jr, y: py + Math.sin(a1) * jr }]
        : [{ x: px + Math.cos(a0) * r0, y: py + Math.sin(a0) * r0 }, { x: px + Math.cos(a0) * jr, y: py + Math.sin(a0) * jr }, { x: px + Math.cos(a1) * jr, y: py + Math.sin(a1) * jr }, { x: px + Math.cos(a1) * r0, y: py + Math.sin(a1) * r0 }];
      const c = clip(poly);
      if (c.length >= 3) cells.push({ poly: c, r: (r0 + jr) / 2 });
      r0 = jr;
    }
  }
  return cells;
}

export default {
  id: 'breakaway',
  short: 'Breakaways',
  title: 'Glass, bottles and chairs that break safely',
  subtitle: 'Hit a sugar-glass window, a resin bottle, a balsa chair and foam rubble, and compare them with the real thing.',
  view: { pos: [0.9, 3.9, 10.2], target: [-0.9, 2.3, -0.5] },
  learn: `<p>In a fight scene someone crashes through a window, a bottle smashes over a head, a chair splinters across a back. None of it is real. These are <b>breakaways</b>: props built to look solid but to <b>break easily</b> and <b>safely</b>.</p>
    <p><b>Sugar glass</b> is sugar cooked until it turns into a clear, glassy sheet, like hard candy. Today most breakaway glass is a clear <b>resin</b>. Both are weak and brittle: a light tap shatters them into <b>small, blunt</b> pieces instead of long, razor-sharp shards. Breakaway <b>bottles</b> are thin resin shells. <b>Chairs and tables</b> are made of <b>balsa</b>, the lightest wood, with joints weakened so they fall apart on cue. <b>Rubble</b> and bricks are painted <b>foam</b>, about 1/80 of the weight of concrete.</p>
    <p>Why does it matter? A falling piece hits with energy <b>m × g × h</b>: mass times gravity times height. Make the mass tiny and the edges blunt, and the hit becomes harmless. Even so, crews rehearse, actors wear eye protection where they can, and nobody breaks a real pane on a person. Breakaways are one-shot, so each take needs a fresh one, and a big scene may use dozens.</p>
    <p class="tip"><b>Try it:</b> pick a prop and press “Hit it”. Watch the pieces fall and bounce. Compare the real and breakaway numbers on the board, then press “Reset” and try the next.</p>`,
  terms: [
    { t: 'Breakaway', d: 'A prop built to break easily and safely on camera.' },
    { t: 'Sugar glass', d: 'Clear, brittle "glass" made of cooked sugar; it breaks into blunt, light pieces.' },
    { t: 'Resin', d: 'A liquid plastic that sets hard; cast thin, it makes breakaway glass and bottles.' },
    { t: 'Balsa', d: 'The lightest common timber, about a quarter the weight of oak.' },
    { t: 'Brittle', d: 'Breaking suddenly with little bending, like glass or dry biscuits.' },
    { t: 'Kinetic energy', d: 'The energy of movement; for a falling object it equals m × g × h just before it lands.' },
  ],
  defaults: { prop: 'window', auto: false },
  controls: [
    { key: 'prop', type: 'seg', label: 'Prop (or tap one)', options: Object.entries(PROPS).map(([v, p]) => ({ v, label: p.name.replace('Ceiling ', '') })) },
    { key: 'go', type: 'buttons', label: 'Action', items: [
      { label: 'Hit it', act: (s, inst) => inst.hit?.() },
      { label: 'Reset', act: (s, inst) => inst.reset?.() },
    ] },
    { key: 'auto', type: 'toggle', label: 'Keep breaking', hint: 'Resets and breaks the chosen prop every few seconds.' },
  ],
  quiz: [
    { q: 'Why is sugar glass safer than window glass?', options: ['It is harder', 'It is weak, lighter and breaks into blunt pieces', 'It does not break', 'It is invisible'], answer: 1, why: 'Sugar glass is brittle and weak, so it crumbles into small, blunt, light pieces instead of sharp shards.' },
    { q: 'Breakaway chairs are usually made of…', options: ['Oak', 'Steel', 'Balsa wood', 'Sugar'], answer: 2, why: 'Balsa is very light and weak, and the joints are pre-weakened so the chair falls apart on cue.' },
    { q: 'A falling block hits with energy m × g × h. Why is foam rubble so much safer than concrete?', options: ['It falls more slowly than gravity', 'Its mass is about 80 times smaller, so the energy is 80 times smaller', 'It is painted', 'It is colder'], answer: 1, why: 'Energy is proportional to mass. A 30 cm foam block weighs under 1 kg, a concrete one about 65 kg.' },
  ],
  reel: [
    { ms: 5000, caption: 'Breakaway glass is weak and light, so it shatters into small, blunt pieces.', set: { prop: 'window', auto: false }, act: (s, inst) => { inst.reset?.(); inst.hit?.(0.6); }, spin: 0, view: { pos: [-2.9, 2.0, 3.2], target: [-3.2, 1.35, -0.2] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = seeded(23);
    const deck = box(10.5, 0.05, 5, M.matte(0x3a332d, { roughness: 0.85 })); deck.position.set(0.1, 0.025, -0.4); root.add(deck);
    const back = box(10.5, 3.6, 0.1, M.matte(0x252a35)); back.position.set(0.1, 1.8, -2.9); root.add(back);
    const floorY = 0.05;
    const D = debris(floorY);
    const groups = {}, pieces = {}, labels = {};
    const wood = M.matte(0x7a5534, { roughness: 0.7 });

    // ---------------------------------------------------------------- window
    const W = 0.9, H = 1.1, P = PROPS;
    const win = new THREE.Group(); win.position.set(P.window.x, 0, 0); root.add(win);
    for (const [w, h, x, y] of [[W + 0.16, 0.08, 0, 2.04], [W + 0.16, 0.08, 0, 0.96], [0.08, H + 0.16, -W / 2 - 0.04, 1.5], [0.08, H + 0.16, W / 2 + 0.04, 1.5]]) { const b = box(w, h, 0.1, wood); b.position.set(x, y, 0); win.add(b); }
    for (const x of [-W / 2 - 0.04, W / 2 + 0.04]) { const leg = box(0.08, 0.92, 0.08, wood); leg.position.set(x, 0.46, 0); win.add(leg); const ft = box(0.08, 0.05, 0.6, wood); ft.position.set(x, 0.05, 0); win.add(ft); }
    const glassMat = M.clear(0xdff3ff, 0.35, { depthWrite: true });
    const cells = crackCells(W, H, 0.12, 0.05, rnd);
    pieces.window = cells.map(({ poly, r }) => {
      const cx = poly.reduce((a, p) => a + p.x, 0) / poly.length, cy = poly.reduce((a, p) => a + p.y, 0) / poly.length;
      const shape = new THREE.Shape(poly.map((p) => new THREE.Vector2(p.x - cx, p.y - cy)));
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.006, bevelEnabled: false }); geo.translate(0, 0, -0.003);
      const m = new THREE.Mesh(geo, glassMat); m.position.set(P.window.x + cx, 1.5 + cy, 0); root.add(m);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })); m.add(edges);
      const d = D.add(m, 0.004); d.r = r; d.c = [cx, cy]; return d;
    });
    groups.window = win;

    // ---------------------------------------------------------------- bottle on a table
    const tbl = new THREE.Group(); tbl.position.set(P.bottle.x, 0, 0); root.add(tbl);
    const top = box(1.0, 0.05, 0.6, wood); top.position.y = 0.76; tbl.add(top);
    for (const x of [-0.42, 0.42]) for (const z of [-0.24, 0.24]) { const l = box(0.05, 0.74, 0.05, wood); l.position.set(x, 0.39, z); tbl.add(l); }
    const bottleMat = M.clear(0x5fae6a, 0.6, { depthWrite: true, roughness: 0.1 });
    const bottleY = 0.785;
    // the bottle as tiles on its surface: rings × columns, each a small curved-ish box
    const prof = [[0, 0.034], [0.16, 0.036], [0.19, 0.03], [0.22, 0.015], [0.28, 0.013]];
    const rAt = (y) => { for (let i = 1; i < prof.length; i++) if (y <= prof[i][0]) { const [y0, r0] = prof[i - 1], [y1, r1] = prof[i]; return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0); } return 0.013; };
    pieces.bottle = [];
    for (let j = 0; j < 7; j++) for (let k = 0; k < 8; k++) {
      const y = 0.02 + j * 0.037, r = rAt(y), a = (k / 8) * TAU;
      const m = box(Math.max(0.01, r * 0.78), 0.036, 0.004, bottleMat);
      m.position.set(P.bottle.x + Math.cos(a) * r, bottleY + y, 0.05 + Math.sin(a) * r); m.rotation.y = -a + Math.PI / 2; root.add(m);
      const d = D.add(m, 0.004); d.a = a; d.j = j; pieces.bottle.push(d);
    }
    groups.bottle = tbl;

    // ---------------------------------------------------------------- balsa chair
    const balsa = M.matte(0xd9b98a, { roughness: 0.8 });
    const cx0 = P.chair.x;
    const chairParts = [];
    const cp = (w, h, d, x, y, z) => { const m = box(w, h, d, balsa); m.position.set(cx0 + x, y, z); root.add(m); chairParts.push(D.add(m, Math.min(w, h, d) / 2)); return m; };
    for (const x of [-0.2, 0.2]) for (const z of [-0.2, 0.2]) cp(0.04, 0.45, 0.04, x, 0.275, z);
    cp(0.22, 0.04, 0.46, -0.11, 0.52, 0); cp(0.22, 0.04, 0.46, 0.11, 0.52, 0);
    for (const x of [-0.2, 0.2]) cp(0.04, 0.5, 0.04, x, 0.79, -0.2);
    cp(0.44, 0.08, 0.03, 0, 0.98, -0.2); cp(0.44, 0.05, 0.03, 0, 0.78, -0.2);
    pieces.chair = chairParts;
    groups.chair = null;

    // ---------------------------------------------------------------- foam rubble from a ceiling rig
    const rx = P.rubble.x;
    const rig = new THREE.Group(); root.add(rig);
    rig.add(box(1.6, 0.08, 0.9, M.metal(0x5b6270)));
    rig.children[0].position.set(rx, 3.15, 0);
    for (const x of [-0.85, 0.85]) { const post = box(0.08, 3.15, 0.08, M.metal(0x5b6270)); post.position.set(rx + x, 1.6, -0.4); rig.add(post); }
    const foamMat = M.matte(0x9a9690, { roughness: 1 });
    pieces.rubble = [];
    for (let i = 0; i < 9; i++) {
      const s = 0.18 + rnd() * 0.14, m = box(s * (0.8 + rnd() * 0.5), s * 0.7, s, foamMat);
      m.position.set(rx - 0.55 + (i % 3) * 0.55, 3.0 - Math.floor(i / 3) * 0.02, -0.28 + Math.floor(i / 3) * 0.28); m.rotation.y = rnd(); root.add(m);
      pieces.rubble.push(D.add(m, s * 0.35));
    }
    const stunt = makeFigure({ top: 0x4a6fa5, legs: 0x2b3242 }); stunt.position.set(rx + 1.1, 0.05, 0.5); lookAtXZ(stunt, rx, 0); root.add(stunt);
    groups.rubble = rig;

    // name tags
    for (const [id, p] of Object.entries(PROPS)) labels[id] = stage.label(p.name, [p.x, id === 'rubble' ? 3.55 : 2.35, 0], root);
    // tapping a prop selects it
    const pick = [];
    for (const [id, list] of Object.entries(pieces)) for (const d of list) { d.mesh.userData.prop = id; pick.push(d.mesh); }
    win.traverse((o) => { o.userData.prop = 'window'; }); tbl.traverse((o) => { o.userData.prop = 'bottle'; }); rig.traverse((o) => { o.userData.prop = 'rubble'; });
    stage.pickables = [...pick, win, tbl, rig];

    // the soft ball that does the hitting
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 18, 12), M.matte(0xff7a59)); ball.visible = false; root.add(ball);
    const cam = makeCamera(1.2); cam.position.set(0.2, 0, 3.7); cam.rotation.y = Math.PI / 2; root.add(cam);

    // ---------------------------------------------------------------- comparison board
    let bd = { prop: 'window' };
    const board = makeBoard(root, 3.4, 2.23, 800, 525, (g, w, h) => {
      bg(g, w, h);
      const p = PROPS[bd.prop], E = (kg) => kg * G * p.drop;
      heading(g, `${p.name}: real vs breakaway`, `falling ${p.drop} m onto the floor`);
      const maxKg = p.real.kg, maxE = E(p.real.piece);
      bar(g, 24, 120, w - 48, 18, p.real.kg, maxKg, COL.bad, `${p.real.name}: weight`, `${fmt(p.real.kg, p.real.kg < 1 ? 2 : 1)} kg`);
      bar(g, 24, 168, w - 48, 18, p.fake.kg, maxKg, COL.good, `${p.fake.name}: weight`, `${fmt(p.fake.kg, p.fake.kg < 1 ? 2 : 1)} kg`);
      bar(g, 24, 236, w - 48, 18, E(p.real.piece), maxE, COL.bad, 'Energy of one piece landing (real)', `${fmt(E(p.real.piece), E(p.real.piece) < 10 ? 2 : 0)} J`);
      bar(g, 24, 284, w - 48, 18, E(p.fake.piece), maxE, COL.good, 'Energy of one piece landing (breakaway)', `${fmt(E(p.fake.piece), E(p.fake.piece) < 10 ? 2 : 0)} J`);
      say(g, `Real: ${p.edge[0]}`, 24, 340, { font: 'bold 19px sans-serif', col: COL.bad });
      say(g, `Breakaway: ${p.edge[1]}`, 24, 372, { font: 'bold 19px sans-serif', col: COL.good });
      wrapText(g, p.why, 24, 412, w - 48, 24, { font: '17px sans-serif', col: COL.soft });
    }, [2.3, 3.9, -2.8]);
    board.mesh.scale.setScalar(1.2);

    let hitT = -1, broken = false, autoT = 0, prop0 = '', cur = 'window';
    const inst = {
      hit(delay = 0.45) { if (broken) return; hitT = 0; inst.delay = delay; },
      reset() { D.reset(); broken = false; hitT = -1; ball.visible = false; },
      delay: 0.45,
      update(dt, s) {
        dt = Math.max(0, dt);
        const narrow = narrowFit(stage, Object.values(labels).filter((l, i) => Object.keys(PROPS)[i] !== s.prop), -0.12);
        reelPlace([[board, [-3.3, 3.3, -2.8], 0.85]]);
        cur = s.prop;
        if (prop0 !== s.prop) {
          if (prop0) inst.reset();
          prop0 = s.prop; bd = { prop: s.prop }; board.redraw();
        }
        for (const [id, l] of Object.entries(labels)) l.element.classList.toggle('hot', id === s.prop);
        if (s.auto) { autoT += dt; if (autoT > 4.5) { autoT = 0; inst.reset(); inst.hit(0.4); } }
        // the throw: a ball flies from the camera side to the prop in `delay` seconds, then it breaks
        if (hitT >= 0 && !broken) {
          hitT += dt;
          const p = PROPS[cur], tgt = cur === 'window' ? [p.x + 0.12, 1.55, 0] : cur === 'bottle' ? [p.x, 0.95, 0.05] : cur === 'chair' ? [p.x, 0.9, 0] : [p.x, 3.3, 0];
          const k = clamp(hitT / inst.delay, 0, 1), from = [p.x + 1.4, 1.3, 2.6];
          ball.visible = cur !== 'rubble';
          ball.position.set(from[0] + (tgt[0] - from[0]) * k, from[1] + (tgt[1] - from[1]) * k + Math.sin(k * Math.PI) * 0.4, from[2] + (tgt[2] - from[2]) * k);
          if (k >= 1) { broken = true; ball.visible = false; breakIt(cur); }
        }
        D.step(dt, { e: cur === 'rubble' ? 0.35 : cur === 'chair' ? 0.3 : 0.18, mu: cur === 'rubble' ? 0.25 : 0.45, k: cur === 'rubble' ? 0.6 : 0.3 });
        stunt.set({ armL: broken && cur === 'rubble' ? 2.4 : 0.2, armR: broken && cur === 'rubble' ? 2.2 : 0.2, lean: broken && cur === 'rubble' ? -0.1 : 0 });
        cam.tally.visible = hitT >= 0;
        if (narrow) labels[s.prop].visible = true;
      },
      readout(s) {
        const p = PROPS[s.prop], ratio = p.real.kg / p.fake.kg;
        return `<div class="big">${p.name}</div>
          <div class="row"><span>${p.real.name}</span><b>${fmt(p.real.kg, p.real.kg < 1 ? 2 : 1)} kg</b></div>
          <div class="row"><span>${p.fake.name}</span><b>${fmt(p.fake.kg, p.fake.kg < 1 ? 2 : 1)} kg (${fmt(ratio, ratio < 10 ? 1 : 0)}× lighter)</b></div>
          ${p.real.mpa ? `<div class="row"><span>Bending strength</span><b>${p.real.mpa} vs ${p.fake.mpa} MPa</b></div>` : ''}
          <div class="row"><span>Status</span><b>${broken ? (D.moving() ? 'breaking…' : 'broken: fit a new one') : 'ready'}</b></div>
`;
      },
      pick(o) { let x = o; while (x && !x.userData.prop) x = x.parent; if (x) pressSeg(x.userData.prop); },
    };
    function breakIt(id) {
      const p = PROPS[id];
      if (id === 'window') for (const d of pieces.window) {
        const [cx, cy] = d.c, dx = cx - 0.12, dy = cy - 0.05, r = Math.hypot(dx, dy) + 0.15, push = 1.1 / r;
        D.launch(d, [dx * push * 0.9 + (rnd() - 0.5) * 0.3, dy * push * 0.4 + rnd() * 0.5, -(0.6 + push * 0.8 + rnd() * 0.5)], [(rnd() - 0.5) * 12, (rnd() - 0.5) * 12, (rnd() - 0.5) * 8]);
      }
      if (id === 'bottle') for (const d of pieces.bottle) D.launch(d, [Math.cos(d.a) * (0.8 + rnd()), 0.6 + rnd() * 1.2 - d.j * 0.05, Math.sin(d.a) * (0.8 + rnd()) - 0.4], [(rnd() - 0.5) * 20, (rnd() - 0.5) * 20, (rnd() - 0.5) * 20]);
      if (id === 'chair') pieces.chair.forEach((d, i) => D.launch(d, [(d.mesh.position.x - p.x) * 3 + (rnd() - 0.5), 1.0 + rnd() * 1.4, -1.0 - rnd() * 1.2 + (d.mesh.position.z) * 2], [(rnd() - 0.5) * 9, (rnd() - 0.5) * 9, (rnd() - 0.5) * 9]));
      if (id === 'rubble') pieces.rubble.forEach((d, i) => D.launch(d, [(rnd() - 0.5) * 0.8, -0.2 - rnd() * 0.8, (rnd() - 0.5) * 0.6 + 0.2], [(rnd() - 0.5) * 5, (rnd() - 0.5) * 5, (rnd() - 0.5) * 5]));
    }
    return inst;
  },
};
