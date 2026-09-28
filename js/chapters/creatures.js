// Chapter 5: creatures and make-up. Left: a generic animatronic creature head (made up for this box, not
// any film's creature) with servos for the jaw, eyes, eyelids and ears. Sliders act as the puppeteers'
// controls; X-ray shows the skull frame, servos and cables under the foam skin. Right: a prosthetic
// make-up bust that steps through lifecast → sculpt → mould → foam appliance → glued and painted,
// with an age slider for old-age make-up.
// Numbers:
//  - Hobby-style RC servos are driven by a pulse every 20 ms (50 Hz). About 1.0 ms is one end of travel,
//    1.5 ms the centre and 2.0 ms the other end (a common convention; exact ranges vary by make). Here
//    1.0–2.0 ms spans 90°.
//  - Jaw load: a 0.35 kg jaw (frame plus foam skin) with its centre of mass 9 cm from the hinge needs
//    τ = m g r cos θ ≈ 0.31 N·m (3.2 kg·cm) to hold. A common metal-gear standard servo is rated around
//    10 kg·cm stall torque at 6 V (typical datasheet value), so it has about a 3× margin. Skin stretch adds
//    more load in practice (estimate).
import { THREE, M, box, clamp } from '../kit.js';
import {
  makeBoard, bg, heading, say, COL, narrowFit, reelPlace, pressSeg, link, lookAtXZ, fmt, G, D2R, inReel,
  makeFigure, makeCamera, TAU,
} from '../sfx.js';

const JAW_KG = 0.35, JAW_R = 0.09, SERVO_KGCM = 10;
const pulse = (deg) => 1.0 + clamp(deg, 0, 90) / 90;       // ms, 1.0–2.0 ms over 90°
export const STEPS = [
  { v: 'life', name: 'Lifecast', what: 'A plaster copy of the actor’s head, taken from a quick-setting mould of their face. The actor breathes through the nostrils while it sets.' },
  { v: 'sculpt', name: 'Sculpt', what: 'The artist sculpts the new features in clay on the lifecast: a heavier brow, a bigger nose, fuller cheeks.' },
  { v: 'mould', name: 'Mould', what: 'A hard mould is made over the sculpture. The clay is cleaned out, leaving a gap shaped exactly like the new features.' },
  { v: 'cast', name: 'Appliance', what: 'Foam latex or silicone is run into the gap and set. Out comes a soft, thin appliance with edges as fine as paper.' },
  { v: 'apply', name: 'Glue and paint', what: 'The appliance is glued to the actor with medical-grade adhesive, the edges blended, then painted to match the skin.' },
];
const AGES = ['young', '50s', '70s', '90s'];

export default {
  id: 'creatures',
  short: 'Creatures and make-up',
  title: 'Animatronics and prosthetic make-up',
  subtitle: 'Drive a creature’s jaw, eyes and ears with servos, and follow a prosthetic from lifecast to painted face.',
  view: { pos: [0.9, 2.3, 4.9], target: [-0.35, 1.75, 0] },
  learn: `<p>An <b>animatronic</b> is a robot puppet. Under a skin of foam latex or silicone sits a frame of metal or plastic, with small motors called <b>servos</b> at every joint: the jaw, the eyes, the eyelids, the ears, the lips. Cables run to <b>puppeteers</b> just out of shot, who drive it live with joysticks and dials, often several people for one head. Some moves are recorded and played back so they repeat exactly, take after take.</p>
    <p>Each servo is told where to go by a short electric <b>pulse</b>, repeated 50 times a second: about <b>1 ms</b> for one end, <b>2 ms</b> for the other. The motor must be strong enough to lift the jaw and stretch the skin, so builders work out the <b>torque</b>: weight × distance from the hinge. Stop-motion puppets, moved by hand one frame at a time, are a different trick; StopMotionClear, coming in its own box, covers them.</p>
    <p><b>Prosthetic make-up</b> changes a real face. It starts with a <b>lifecast</b> of the actor's head. The artist sculpts new features in clay on it, makes a <b>mould</b>, and casts a thin, soft <b>appliance</b> in foam latex or silicone. It is glued on, blended and painted. <b>Old-age make-up</b> adds sagging cheeks, bags under the eyes, wrinkles and grey hair in stages. Film <b>blood</b> is usually a sweet, food-based syrup, safe even in the mouth.</p>
    <p class="tip"><b>Try it:</b> move the jaw, eye and ear sliders, then switch on X-ray to see the servos. Turn on “Perform” to watch the puppeteers work. Step the bust from lifecast to painted face, then age it.</p>`,
  terms: [
    { t: 'Animatronic', d: 'A mechanical puppet moved by motors, cables or air, with a lifelike skin.' },
    { t: 'Servo', d: 'A small motor that turns to an exact angle when sent a timed pulse.' },
    { t: 'Puppeteer', d: 'A performer who controls a puppet or animatronic, often from out of shot.' },
    { t: 'Torque', d: 'The turning force of a motor: force × distance from the pivot.' },
    { t: 'Lifecast', d: 'An exact plaster copy of an actor’s face or body.' },
    { t: 'Prosthetic appliance', d: 'A soft foam latex or silicone piece glued onto the skin to change a face.' },
    { t: 'Foam latex', d: 'Whipped, baked latex rubber: light and squashy, like a sponge.' },
  ],
  defaults: { jaw: 12, eyes: 0, lids: 0.1, ears: 0, xray: false, perform: true, step: 'apply', age: 0 },
  controls: [
    { key: 'perform', type: 'toggle', label: 'Perform (puppeteers drive it)', hint: 'Turn off to drive the servos yourself.' },
    { key: 'jaw', type: 'range', label: 'Jaw servo', min: 0, max: 30, step: 0.5, ends: ['shut', 'open'], fmt: (v) => `${v.toFixed(1)}° · ${pulse(v).toFixed(2)} ms` },
    { key: 'eyes', type: 'range', label: 'Eye servos (look)', min: -1, max: 1, step: 0.01, ends: ['left', 'right'], fmt: (v) => `${Math.round(v * 30)}°` },
    { key: 'lids', type: 'range', label: 'Eyelid servos', min: 0, max: 1, step: 0.01, ends: ['open', 'closed'], fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'ears', type: 'range', label: 'Ear servos', min: -30, max: 30, step: 0.5, ends: ['back', 'forward'], fmt: (v) => `${v.toFixed(0)}°` },
    { key: 'xray', type: 'toggle', label: 'X-ray: see inside' },
    { key: 'step', type: 'seg', label: 'Prosthetic make-up step', options: STEPS.map((x) => ({ v: x.v, label: x.name })) },
    { key: 'age', type: 'range', label: 'Old-age make-up', min: 0, max: 3, step: 1, ends: ['young', '90s'], fmt: (v) => AGES[Math.round(v)] },
  ],
  onChange(s, key) { if (['jaw', 'eyes', 'lids', 'ears'].includes(key)) s.perform = false; if (key === 'age' && s.age > 0) s.step = 'apply'; },
  quiz: [
    { q: 'What moves the jaw and eyes of an animatronic?', options: ['Magic', 'Small motors called servos, controlled by puppeteers', 'The actor inside', 'Wind'], answer: 1, why: 'Servos at each joint turn to exact angles. Puppeteers off camera drive them with joysticks, or play back recorded moves.' },
    { q: 'A servo is told its angle by…', options: ['The colour of a wire', 'The length of a short pulse, repeated 50 times a second', 'How loud a sound is', 'Its temperature'], answer: 1, why: 'About 1 ms means one end of travel, 2 ms the other, and 1.5 ms the middle.' },
    { q: 'What comes first when making a prosthetic appliance?', options: ['Painting', 'A lifecast of the actor’s head', 'Gluing', 'Filming'], answer: 1, why: 'The lifecast is an exact copy of the face. The new features are sculpted on it, then moulded and cast.' },
  ],
  reel: [
    { ms: 5200, caption: 'An animatronic hides servos under its skin; puppeteers drive them from out of shot.', set: { perform: true, xray: false, step: 'apply', age: 0 }, anim: { xray: [false, true] }, spin: 0, view: { pos: [-1.2, 1.8, 1.35], target: [-1.35, 1.52, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const deck = box(7, 0.05, 4.5, M.matte(0x2b2f38)); deck.position.set(0, 0.025, -0.5); root.add(deck);
    const labels = {};

    // ---------------------------------------------------------------- the creature head
    const HX = -1.3, HY = 1.55;
    const stand = box(0.14, HY - 0.3, 0.14, M.metal(0x3a3f4b)); stand.position.set(HX, (HY - 0.3) / 2, -0.15); root.add(stand);
    const head = new THREE.Group(); head.position.set(HX, HY, 0); root.add(head);
    const skin = M.matte(0x5f8f5a, { roughness: 0.65 }), skinX = M.ghost(0x7fbf7a, 0.12);
    const skinParts = [];
    const sk = (mesh) => { skinParts.push(mesh); return mesh; };
    const cran = sk(new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 20), skin)); cran.scale.set(1.1, 0.9, 1.15); head.add(cran);
    const snout = sk(new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.3, 8, 20), skin)); snout.rotation.x = Math.PI / 2; snout.scale.set(1.15, 1, 0.7); snout.position.set(0, -0.02, 0.33); head.add(snout);
    const brow = sk(new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 12, 0, TAU, 0, Math.PI / 2), skin)); brow.scale.set(1.05, 0.35, 0.9); brow.position.set(0, 0.12, 0.12); head.add(brow);
    for (const x of [-0.07, 0.07]) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), M.matte(0x1d2a1b)); n.position.set(x, 0.05, 0.6); head.add(n); }
    // jaw on a hinge at the back of the mouth
    const jawP = new THREE.Group(); jawP.position.set(0, -0.1, 0.02); head.add(jawP);
    const jaw = sk(new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.34, 8, 18), skin)); jaw.rotation.x = Math.PI / 2; jaw.scale.set(1.1, 1, 0.45); jaw.position.set(0, -0.06, 0.28); jawP.add(jaw);
    const mouthIn = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), M.matte(0x5a1f24, { side: THREE.DoubleSide })); mouthIn.scale.set(1, 2, 1); mouthIn.rotation.x = -Math.PI / 2; mouthIn.position.set(0, -0.005, 0.3); jawP.add(mouthIn);
    const toothM = M.plastic(0xf2eee0);
    for (let i = 0; i < 7; i++) { const a = -0.9 + (i / 6) * 1.8; const t = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 8), toothM); t.position.set(Math.sin(a) * 0.13, 0.02, 0.28 + Math.cos(a) * 0.22); jawP.add(t); const u = t.clone(); u.rotation.x = Math.PI; u.position.set(Math.sin(a) * 0.14, -0.1, 0.3 + Math.cos(a) * 0.22); head.add(u); }
    // eyes with lids
    const eyes = [], lids = [];
    for (const x of [-0.17, 0.17]) {
      const eg = new THREE.Group(); eg.position.set(x, 0.12, 0.26); head.add(eg);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 14), M.plastic(0xf4e9c8, { roughness: 0.2 })); eg.add(ball);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 10), M.plastic(0xd9a21b, { roughness: 0.15 })); iris.position.z = 0.045; iris.scale.z = 0.5; eg.add(iris);
      const pup = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), M.matte(0x0a0a0a)); pup.position.z = 0.065; pup.scale.set(0.5, 1, 0.4); eg.add(pup);
      eyes.push(eg);
      const lidP = new THREE.Group(); lidP.position.copy(eg.position); head.add(lidP);
      const lid = sk(new THREE.Mesh(new THREE.SphereGeometry(0.078, 20, 10, 0, TAU, 0, Math.PI / 2), skin)); lidP.add(lid); lids.push(lidP);
    }
    // ears on pivots
    const ears = [];
    for (const sgn of [-1, 1]) {
      const ep = new THREE.Group(); ep.position.set(sgn * 0.3, 0.14, -0.12); head.add(ep);
      const ear = sk(new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), skin)); ear.scale.set(0.15, 0.55, 1); ear.position.set(sgn * 0.04, 0.05, -0.12); ear.rotation.x = -0.4; ep.add(ear);
      ep.sgn = sgn; ears.push(ep);
    }
    // internals (seen with X-ray): frame, servos, push rods and a cable loom down the neck
    const inside = new THREE.Group(); head.add(inside);
    const alu = M.metal(0xc8ced8), servoM = M.plastic(0x2468d8), hot = M.glow(0xffb547);
    const frameBars = [[[-0.22, -0.05, -0.2], [0.22, -0.05, -0.2]], [[-0.22, -0.05, -0.2], [-0.12, -0.02, 0.45]], [[0.22, -0.05, -0.2], [0.12, -0.02, 0.45]], [[0, -0.05, -0.2], [0, 0.2, 0.05]], [[-0.2, 0.12, 0.1], [0.2, 0.12, 0.1]]];
    for (const [a, b] of frameBars) { const l = link(0.012, alu); l.span(a, b); inside.add(l); }
    const servoAt = (p, name) => { const s = box(0.08, 0.04, 0.04, servoM); s.position.set(...p); inside.add(s); const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 10), hot); hub.position.set(p[0], p[1] + 0.03, p[2]); inside.add(hub); return s; };
    servoAt([0, -0.04, -0.12], 'jaw'); servoAt([-0.12, 0.05, 0.12], 'eye'); servoAt([0.12, 0.05, 0.12], 'eye'); servoAt([0, 0.2, 0.12], 'lid'); servoAt([-0.22, 0.12, -0.12], 'ear'); servoAt([0.22, 0.12, -0.12], 'ear');
    const jawRod = link(0.006, hot); inside.add(jawRod);
    const loom = [];
    for (let i = 0; i < 4; i++) { const c = link(0.008, M.matte([0xff5a4d, 0x2b2b2b, 0xffd166, 0x5ce1a9][i])); root.add(c); loom.push(c); }
    const insideLbl = stage.label('Servos', [HX - 0.5, HY + 0.45, 0], root);

    // puppeteers at a control desk, out of the camera's frame
    const desk = box(1.1, 0.8, 0.55, M.matte(0x2a2d34)); desk.position.set(HX - 1.7, 0.4, -1.2); root.add(desk);
    const sticks = [];
    for (const x of [-0.25, 0.1, 0.35]) { const st = link(0.012, M.matte(0x111111)); root.add(st); sticks.push({ st, x: HX - 1.7 + x }); const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), M.glow(0xff5a4d)); root.add(knob); sticks[sticks.length - 1].knob = knob; }
    const pup1 = makeFigure({ top: 0x1d2027, legs: 0x1d2027 }); pup1.position.set(HX - 2.0, 0, -1.8); lookAtXZ(pup1, HX - 2.0, -1.2); root.add(pup1);
    const pup2 = makeFigure({ top: 0x1d2027, legs: 0x1d2027 }); pup2.position.set(HX - 1.35, 0, -1.8); lookAtXZ(pup2, HX - 1.35, -1.2); root.add(pup2);
    labels.pup = stage.label('Puppeteers (out of shot)', [HX - 1.7, 2.2, -1.6], root);
    const cam = makeCamera(1.35); cam.position.set(HX + 1.3, 0, 1.7); lookAtXZ(cam, HX, 0); root.add(cam);

    // ---------------------------------------------------------------- the make-up bust
    const BX = 1.35, BY = 1.45;
    const bust = new THREE.Group(); bust.position.set(BX, BY, 0); root.add(bust);
    const plinth = box(0.3, BY - 0.25, 0.3, M.matte(0x3a3f4b)); plinth.position.set(BX, (BY - 0.25) / 2, 0); root.add(plinth);
    const sh = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.25, 6, 16), M.matte(0x3a3f4b)); sh.rotation.z = Math.PI / 2; sh.scale.set(1, 1, 0.55); sh.position.y = -0.33; bust.add(sh);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.2, 16), M.matte(0xd6b08c)); neck.position.y = -0.18; bust.add(neck);
    // the face: a sphere with a painted canvas (eyes, brows, lips, wrinkles by age)
    let faceState = { age: 0, plaster: false };
    const faceTex = document.createElement('canvas'); faceTex.width = 512; faceTex.height = 256;
    const ftx = new THREE.CanvasTexture(faceTex); ftx.colorSpace = THREE.SRGBColorSpace;
    const drawFace = () => {
      const g = faceTex.getContext('2d'), w = 512, h = 256, a = faceState.age, pl = faceState.plaster;
      g.fillStyle = pl ? '#ece8df' : '#d6b08c'; g.fillRect(0, 0, w, h);
      const cx = w * 0.25;          // u = 0.25 faces +z
      if (!pl) {
        g.fillStyle = '#3a2a22'; for (const dx of [-26, 26]) { g.beginPath(); g.ellipse(cx + dx, 112, 9, 5, 0, 0, TAU); g.fill(); }
        g.strokeStyle = a ? `rgba(200,200,200,${0.4 + a * 0.2})` : '#3a2a22'; g.lineWidth = 5; for (const dx of [-26, 26]) { g.beginPath(); g.moveTo(cx + dx - 14, 98); g.lineTo(cx + dx + 14, 97); g.stroke(); }
        g.fillStyle = '#a4585a'; g.beginPath(); g.ellipse(cx, 168, 20, 5, 0, 0, TAU); g.fill();
        // wrinkles and age spots grow with age
        g.strokeStyle = 'rgba(90,55,40,.55)'; g.lineWidth = 1.6;
        for (let k = 0; k < a * 3; k++) { g.beginPath(); g.moveTo(cx - 34, 78 - k * 6); g.quadraticCurveTo(cx, 74 - k * 6 - 3, cx + 34, 78 - k * 6); g.stroke(); }
        if (a >= 1) for (const sg of [-1, 1]) { for (let k = 0; k < a * 2; k++) { g.beginPath(); g.moveTo(cx + sg * 38, 108 + k * 5); g.lineTo(cx + sg * (48 + k * 2), 104 + k * 7); g.stroke(); } g.beginPath(); g.moveTo(cx + sg * 14, 150); g.quadraticCurveTo(cx + sg * 30, 162, cx + sg * 26, 180 + a * 3); g.stroke(); }
        if (a >= 2) { g.fillStyle = 'rgba(120,80,50,.35)'; for (let k = 0; k < 10 * (a - 1); k++) { g.beginPath(); g.arc(cx - 60 + ((k * 37) % 120), 60 + ((k * 53) % 120), 2 + (k % 3), 0, TAU); g.fill(); } }
      }
      ftx.needsUpdate = true;
    };
    drawFace();
    const faceM = new THREE.MeshStandardMaterial({ map: ftx, roughness: 0.6 });
    const bhead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 40, 24), faceM); bhead.scale.set(0.92, 1.15, 1); bhead.castShadow = true; bust.add(bhead);
    const hairM = M.matte(0x2a1d16);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.178, 28, 12, 0, TAU, 0, 1.25), hairM); hair.scale.set(0.93, 1.15, 1.02); hair.rotation.x = -0.35; bust.add(hair);
    // the new features: clay → mould → appliance → painted skin
    const feat = new THREE.Group(); bust.add(feat);
    const featM = new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: 0.9 });
    const fBrow = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.14, 6, 12), featM); fBrow.rotation.z = Math.PI / 2; fBrow.position.set(0, 0.07, 0.15); feat.add(fBrow);
    const fNose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 10), featM); fNose.scale.set(0.8, 1, 1.1); fNose.position.set(0, 0.0, 0.18); feat.add(fNose);
    const cheeks = [-1, 1].map((sg) => { const c = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 10), featM); c.scale.set(0.8, 0.9, 0.55); c.position.set(sg * 0.085, -0.05, 0.13); feat.add(c); return c; });
    const bags = [-1, 1].map((sg) => { const c = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), featM); c.scale.set(1.2, 0.6, 0.6); c.position.set(sg * 0.055, 0.015, 0.16); feat.add(c); return c; });
    const jowls = [-1, 1].map((sg) => { const c = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), featM); c.scale.set(0.8, 1, 0.6); c.position.set(sg * 0.07, -0.13, 0.1); feat.add(c); return c; });
    const mould = new THREE.Group(); bust.add(mould);
    for (const sg of [-1, 1]) { const shell = new THREE.Mesh(new THREE.SphereGeometry(0.23, 24, 14, sg > 0 ? 0 : Math.PI, Math.PI), M.clear(0xc9a86a, 0.55, { depthWrite: true })); shell.scale.set(0.95, 1.1, 1.05); mould.add(shell); shell.userData.sg = sg; }
    labels.bust = stage.label('Make-up bust', [BX, BY + 0.45, 0], root);
    labels.head = stage.label('Animatronic head', [HX, HY + 0.62, 0], root);

    // step board
    let bd = { step: 'apply', age: 0 };
    const board = makeBoard(root, 2.2, 1.1, 660, 330, (g, w, h) => {
      bg(g, w, h);
      heading(g, 'Prosthetic make-up, step by step');
      const i0 = STEPS.findIndex((x) => x.v === bd.step);
      STEPS.forEach((x, i) => {
        const X = 24 + i * 126, on = i === i0, done = i < i0;
        g.fillStyle = on ? COL.sfx : done ? 'rgba(255,181,71,.35)' : 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(X + 20, 100, 16, 0, TAU); g.fill();
        say(g, String(i + 1), X + 20, 106, { font: 'bold 17px sans-serif', col: on ? '#111' : '#fff', align: 'center' });
        say(g, x.name, X + 20, 140, { font: `${on ? 'bold ' : ''}15px sans-serif`, col: on ? '#fff' : COL.soft, align: 'center' });
      });
      let y = 190; const words = STEPS[i0].what.split(' '); let line = '';
      g.font = '18px sans-serif';
      for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w - 48) { say(g, line, 24, y); y += 26; line = wd; } else line = t; }
      say(g, line, 24, y);
      if (bd.step === 'apply' && bd.age > 0) say(g, `Old-age make-up: ${AGES[bd.age]}`, 24, h - 18, { font: 'bold 18px sans-serif', col: COL.sfx });
    }, [0.6, 2.7, -1.1]);

    const inst = {
      update(dt, s, time) {
        dt = Math.max(0, dt);
        narrowFit(stage, [insideLbl, labels.pup], -0.12);
        reelPlace([[board, [HX, 2.42, -0.6], 0.68]]);
        // performance: the puppeteers' moves, or the sliders
        const tt = time || 0;
        const jawDeg = s.perform ? 14 + 13 * Math.sin(tt * 2.1) * Math.max(0, Math.sin(tt * 0.7)) : s.jaw;
        const look = s.perform ? 0.8 * Math.sin(tt * 0.6) : s.eyes;
        const blink = s.perform ? (Math.sin(tt * 1.3) > 0.97 ? 1 : 0.1) : s.lids;
        const earDeg = s.perform ? 20 * Math.sin(tt * 1.1 + 1) : s.ears;
        if (s.perform) { s.jaw = Math.round(jawDeg * 2) / 2; s.eyes = look; s.lids = blink; s.ears = earDeg; }
        jawP.rotation.x = jawDeg * D2R;
        eyes.forEach((e) => { e.rotation.y = look * 30 * D2R; });
        lids.forEach((l) => { l.rotation.x = -Math.PI / 2 + 0.25 + (1 - blink) * -1.4; });
        ears.forEach((e) => { e.rotation.x = -earDeg * D2R; e.rotation.z = e.sgn * 0.3; });
        head.rotation.y = s.perform ? 0.15 * Math.sin(tt * 0.4) : 0;
        // x-ray
        for (const p of skinParts) p.material = s.xray ? skinX : skin;
        inside.visible = s.xray; insideLbl.visible = s.xray && !(stage.host.clientWidth < 560);
        const ja = jawDeg * D2R;
        jawRod.span([0, -0.02, -0.12], [0, -0.1 - Math.sin(ja) * 0.08, 0.02 + Math.cos(ja) * 0.08]);
        // cable loom from the neck to the desk
        head.updateMatrixWorld();
        loom.forEach((c, i) => c.span([HX - 0.05 + i * 0.03, HY - 0.3, -0.2], [HX - 1.9 + i * 0.1, 0.8, -0.95]));
        sticks.forEach((st, i) => { const ang = [jawDeg / 30, look, earDeg / 30][i] * 0.5; const top = [st.x + Math.sin(ang) * 0.15, 0.95, -1.12]; st.st.span([st.x, 0.8, -1.12], top); st.knob.position.set(...top); });
        pup1.set({ armL: 1.1 + 0.1 * Math.sin(tt * 2), armR: 1.0 }); pup2.set({ armL: 1.0, armR: 1.1 + 0.1 * Math.cos(tt * 2) });
        // make-up bust
        const st = s.step, age = Math.round(s.age);
        const plaster = st === 'life' || st === 'sculpt' || st === 'mould';
        if (faceState.age !== age || faceState.plaster !== plaster) { faceState = { age, plaster }; drawFace(); }
        hair.visible = !plaster;
        hairM.color.setHex([0x2a1d16, 0x5a524c, 0xa9a49c, 0xe4e1dc][age]);
        feat.visible = st !== 'life';
        featM.color.setHex(st === 'sculpt' || st === 'mould' ? 0x8a7a66 : st === 'cast' ? 0xe8d7b0 : 0xd2a984);
        featM.roughness = st === 'cast' ? 0.95 : 0.7;
        feat.position.z = approachZ(feat.position.z, st === 'cast' ? 0.2 : 0, dt);
        const ageK = st === 'apply' ? age / 3 : 0;
        bags.forEach((b) => { b.visible = ageK > 0; b.scale.set(1.2, 0.6 + ageK * 0.5, 0.6 + ageK * 0.4); });
        jowls.forEach((j) => { j.visible = ageK > 0; j.position.y = -0.12 - ageK * 0.03; j.scale.set(0.8, 1 + ageK * 0.3, 0.6); });
        cheeks.forEach((c) => { c.position.y = -0.05 - ageK * 0.02; });
        mould.visible = st === 'mould';
        mould.children.forEach((m) => { m.position.x = m.userData.sg * 0.02 * (1 + Math.sin(tt * 1.5)); });
        faceM.color.setHex(plaster ? 0xffffff : 0xffffff);
        if (bd.step !== st || bd.age !== age) { bd = { step: st, age }; board.redraw(); }
      },
      readout(s) {
        const deg = s.jaw, torque = JAW_KG * G * JAW_R * Math.cos(deg * D2R), kgcm = (torque / G) * 100;
        const step = STEPS.find((x) => x.v === s.step);
        return `<div class="big">${s.perform ? 'Puppeteers performing' : 'You are the puppeteer'}</div>
          <div class="row"><span>Jaw angle · servo pulse</span><b>${fmt(deg, 1)}° · ${pulse(deg).toFixed(2)} ms every 20 ms</b></div>
          <div class="row"><span>Torque to hold the jaw</span><b>${fmt(torque, 2)} N·m (${fmt(kgcm, 1)} kg·cm)</b></div>
          <div class="row"><span>Servo rating · margin</span><b>${SERVO_KGCM} kg·cm · ${fmt(SERVO_KGCM / kgcm, 1)}×</b></div>
          <div class="row"><span>Make-up step</span><b>${step.name}${s.step === 'apply' && s.age > 0 ? ' · aged to ' + AGES[Math.round(s.age)] : ''}</b></div>`;
      },
    };
    const approachZ = (v, t, dt) => v + (t - v) * (1 - Math.exp(-6 * dt));
    return inst;
  },
};
