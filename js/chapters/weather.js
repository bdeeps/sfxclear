// Chapter 2: weather on demand. A rain bar over the actor, a big lamp you can swing from behind the actor
// (backlight) round to beside the camera (front light), a wind machine, a paper-snow hopper and a hazer.
// A board shows the camera's view, so you can see why film rain must be backlit.
// Physics and sources:
//  - Drops: a 2 mm raindrop falls at about 6.5 m/s (Gunn & Kinzer 1949, J. Meteorology 6: 243). With
//    linear drag its speed approaches that with time constant τ = v_t/g ≈ 0.66 s, so a drop released
//    at rest has fallen s(t) = v_t (t − τ(1 − e^(−t/τ))). Sideways it is dragged up to the wind speed
//    with the same τ, so its drift is w (t − τ(1 − e^(−t/τ))). Paper snow falls at about 1 m/s
//    (similar to real flakes, Langleben 1954), so τ ≈ 0.1 s and it follows the wind almost at once.
//  - Why backlight: water drops scatter light mostly forwards. We use the Henyey–Greenstein phase
//    function with asymmetry g = 0.87, typical of large water drops (Hansen & Travis 1974, Space Sci.
//    Rev. 16: 527). A drop between the lamp and the lens (small scattering angle) is tens of times
//    brighter than one lit from the camera side. The camera board maps brightness with a square root,
//    roughly how a film image compresses it.
//  - Rain rate: the bar wets about 10 m² (5 m × 2 m), so rate in mm/h = L/min × 60 / 10. For scale, the
//    India Meteorological Department calls 100 mm in an hour over a small area a cloudburst (IMD FAQ).
//  - Wind load on the actor: F = ½ ρ v² (C_D A), ρ = 1.2 kg/m³, C_D A ≈ 0.84 m² for a standing adult
//    (Hoerner, Fluid-Dynamic Drag, 1965: about 9 ft²).
//  - Haze: light fades as e^(−σ d) (Beer–Lambert). Meteorological visibility V = 3.912/σ (Koschmieder).
import { THREE, M, box, clamp } from '../kit.js';
import {
  makeBoard, bg, heading, say, COL, narrowFit, reelPlace, seeded, particles, fmt, D2R, G,
  makeFigure, makeCamera, makeLamp, makeRainBar, makeWindMachine, makeHazer, TAU,
} from '../sfx.js';

const VT = 6.5, TAU_R = VT / G;            // rain terminal speed and time constant
const VS = 1.0, TAU_S = VS / G;            // paper snow
const BAR_H = 5.0, WET_AREA = 10;          // m, m²
const HG_G = 0.87;
const hg = (cos) => (1 - HG_G * HG_G) / Math.pow(1 + HG_G * HG_G - 2 * HG_G * cos, 1.5);
const fallDist = (t, v, tau) => v * (t - tau * (1 - Math.exp(-t / tau)));
const fallTime = (h, v, tau) => { let lo = 0, hi = 10; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (fallDist(m, v, tau) < h) lo = m; else hi = m; } return lo; };
const T_RAIN = fallTime(BAR_H, VT, TAU_R), T_SNOW = fallTime(4.6, VS, TAU_S);
const CAM = new THREE.Vector3(0, 1.6, 6);
const DROP = new THREE.Vector3(0, 2.2, 0);
export const lampPos = (deg) => new THREE.Vector3(3.6 * Math.sin(deg * D2R), 2.9, -3.6 * Math.cos(deg * D2R));
// Scattering angle (degrees) and brightness relative to perfect backlight at 20°.
export function scatter(deg) {
  const Lp = lampPos(deg), inDir = DROP.clone().sub(Lp).normalize(), outDir = CAM.clone().sub(DROP).normalize();
  const c = clamp(inDir.dot(outDir), -1, 1);
  return { theta: Math.acos(c) / D2R, rel: hg(c) / hg(Math.cos(20 * D2R)) };
}

export default {
  id: 'weather',
  short: 'Weather on demand',
  title: 'Rain, wind, snow and fog, on cue',
  subtitle: 'Run a rain bar, a wind machine, paper snow and a hazer, and see why film rain has to be lit from behind.',
  view: { pos: [2.4, 4.3, 11.8], target: [-0.7, 2.9, -0.5] },
  learn: `<p>A film can't wait for the weather, so the SFX team makes it. <b>Rain</b> comes from <b>rain bars</b>: pipes full of nozzles, hung on stands or cranes, or <b>rain towers</b> fed by pumps and hoses. <b>Wind</b> comes from <b>wind machines</b>, huge fans on wheels. <b>Snow</b> is usually shredded paper or a biodegradable foam or starch flake, blown or sprinkled from above. <b>Fog and haze</b> come from machines that turn a special fluid into a fine mist.</p>
    <p>Here's the surprise: rain you can see with your eyes often <b>vanishes on camera</b>. Each drop is a tiny ball of water that sends most of the light it catches <b>forwards</b>. So the lamp must be <b>behind</b> the rain, shining towards the lens, with a dark background. Then every drop glitters. Light the rain from the camera side and it almost disappears. Film rain is also far <b>heavier</b> than real rain, often many times a monsoon cloudburst, so it still reads on screen.</p>
    <p>Wind does the same for mood. At 15 m/s a wind machine pushes on an actor with about the weight of an 11 kg bag, so hair, coats and rain all stream sideways. Haze makes beams of light visible, because the tiny droplets scatter light into the lens. Crews check the fluids are approved and keep the set ventilated.</p>
    <p class="tip"><b>Try it:</b> swing the lamp from behind the actor to beside the camera and watch the camera view. Then turn up the wind and see which falls more sideways, rain or snow. Add haze to see the light beam.</p>`,
  terms: [
    { t: 'Rain bar', d: 'A pipe with a row of nozzles, hung above the set to make rain.' },
    { t: 'Backlight', d: 'A light behind the subject, shining towards the camera. It makes rain, smoke and hair glow.' },
    { t: 'Forward scattering', d: 'When particles send most of the light they catch onwards in nearly the same direction.' },
    { t: 'Wind machine', d: 'A large fan on a wheeled base, used to make wind on set.' },
    { t: 'Hazer', d: 'A machine that fills the air with a fine, even mist so light beams show.' },
    { t: 'Terminal velocity', d: 'The steady speed a falling object reaches when air drag balances its weight.' },
  ],
  defaults: { flow: 60, light: 20, wind: 4, snow: false, haze: 0.25, rain: true },
  controls: [
    { key: 'rain', type: 'toggle', label: 'Rain bar on' },
    { key: 'flow', type: 'range', label: 'Water flow', min: 5, max: 120, step: 1, ends: ['drizzle', 'downpour'], fmt: (v) => `${Math.round(v)} L/min` },
    { key: 'light', type: 'range', label: 'Where is the lamp?', min: 0, max: 160, step: 1, ends: ['behind the rain', 'beside the camera'], fmt: (v) => `${Math.round(v)}° round` },
    { key: 'wind', type: 'range', label: 'Wind machine', min: 0, max: 20, step: 0.5, ends: ['still', 'gale'], fmt: (v) => `${v.toFixed(1)} m/s (${Math.round(v * 3.6)} km/h)` },
    { key: 'snow', type: 'toggle', label: 'Paper snow', hint: 'Biodegradable flakes from a hopper above the set.' },
    { key: 'haze', type: 'range', label: 'Haze', min: 0, max: 1, step: 0.01, ends: ['clear air', 'thick haze'], fmt: (v) => `${Math.round(v * 100)}%` },
  ],
  quiz: [
    { q: 'Why is film rain usually lit from behind?', options: ['It keeps the lamp dry', 'Drops send most light forwards, so backlit drops shine into the lens', 'Water absorbs front light', 'It makes the rain fall faster'], answer: 1, why: 'Water drops scatter light mostly forwards. Backlit, they glitter against a dark background. Front-lit, they nearly vanish.' },
    { q: 'In the same wind, which gets blown further sideways?', options: ['Rain drops', 'Paper snow', 'Both the same', 'Neither'], answer: 1, why: 'Snow falls slowly (about 1 m/s) and catches the wind almost at once, so it drifts much further than fast-falling rain.' },
    { q: 'What does a hazer do?', options: ['Dries the set', 'Makes a fine mist so light beams become visible', 'Cools the actors', 'Makes snow'], answer: 1, why: 'The fine droplets scatter light into the camera, so beams and depth show up.' },
  ],
  reel: [
    { ms: 5400, caption: 'Film rain comes from a rain bar, and it only shines on camera when it is backlit.', set: { rain: true, flow: 80, wind: 2, snow: false, haze: 0.3, light: 150 }, anim: { light: [150, 15] }, spin: 0, view: { pos: [2.6, 3.2, 8.6], target: [1.2, 2.3, -0.2] } },
    { ms: 5000, caption: 'A wind machine blows rain aside, and light paper snow drifts much further.', set: { rain: true, flow: 50, light: 20, snow: true, haze: 0.2, wind: 0 }, anim: { wind: [0, 16] }, spin: 0.3, view: { pos: [-1.5, 3.4, 9.0], target: [-0.6, 2.0, 0] } },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const rnd = seeded(5);
    const deck = box(9, 0.05, 6, M.matte(0x2b2f38, { roughness: 0.4, metalness: 0.1 })); deck.position.set(0, 0.025, -0.5); root.add(deck);
    const back = box(9, 5.2, 0.1, M.matte(0x0c0e14)); back.position.set(0, 2.6, -4.2); root.add(back);
    const actor = makeFigure({ top: 0x6f7f96, legs: 0x2b3242 }); actor.position.set(0, 0.05, 0); actor.rotation.y = -Math.PI / 2; root.add(actor);
    const coat = new THREE.Color(0x6f7f96), wet = new THREE.Color(0x3f4a5a);
    const camera = makeCamera(1.45); camera.position.set(0, 0, 6); camera.rotation.y = Math.PI / 2; root.add(camera);
    const bar = makeRainBar(4.2, BAR_H, 11); bar.position.set(0, 0, 0); root.add(bar);
    const barLbl = stage.label('Rain bar', [1.6, BAR_H + 0.35, 0], root);
    const lamp = makeLamp(2.9, 0xf1f6ff, 0.28); root.add(lamp);
    const lampLbl = stage.label('Lamp', [0, 3.6, 0], root);
    const spot = new THREE.SpotLight(0xe8f1ff, 60, 14, 0.45, 0.5, 1.2); root.add(spot, spot.target); spot.target.position.copy(DROP);
    // the visible beam in haze: an open cone from the lamp towards the actor
    const beamGeo = new THREE.ConeGeometry(1.5, 1, 32, 1, true); beamGeo.translate(0, -0.5, 0);
    const beamMat = M.glow(0xdfeaff, { transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beamM = new THREE.Mesh(beamGeo, beamMat); root.add(beamM);
    const fan = makeWindMachine(0.8); fan.position.set(-4.7, 0.05, 0.2); root.add(fan);
    const fanLbl = stage.label('Wind machine', [-4.7, 2.4, 0.2], root);
    const hopper = new THREE.Group(); hopper.position.set(0.3, 4.75, -1.1); root.add(hopper);
    const hop = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.2, 0.4, 4, 1, true), M.matte(0xd8d8d0, { side: THREE.DoubleSide })); hop.rotation.y = Math.PI / 4; hopper.add(hop);
    const hopLbl = stage.label('Snow hopper', [1.2, 5.1, -1.1], root);
    const hazer = makeHazer(); hazer.position.set(-3.2, 0.05, -2.8); root.add(hazer);
    const hazeLbl = stage.label('Hazer', [-3.2, 0.75, -2.8], root);
    const hazeVol = box(9, 5, 7, M.ghost(0xb8c6dc, 0)); hazeVol.position.set(0, 2.55, -0.6); root.add(hazeVol);
    // a flag on a pole shows the wind
    const pole = box(0.04, 2.6, 0.04, M.metal(0x9aa3b2)); pole.position.set(-2.3, 1.35, -1.6); root.add(pole);
    const flagPivot = new THREE.Group(); flagPivot.position.set(-2.3, 2.6, -1.6); root.add(flagPivot);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.35), M.matte(0xffb547, { side: THREE.DoubleSide })); flag.position.set(0.3, -0.18, 0); flagPivot.add(flag);

    // particles
    const NR = 700, NSN = 300;
    const drops = particles(NR, new THREE.BoxGeometry(0.009, 0.22, 0.009), M.glow(0xeaf4ff, { transparent: true, opacity: 0.8 })); root.add(drops);
    const flakes = particles(NSN, new THREE.PlaneGeometry(0.035, 0.035), M.glow(0xffffff, { side: THREE.DoubleSide })); root.add(flakes);
    const dS = Array.from({ length: NR }, () => [rnd() * 4.2 - 2.1, rnd(), rnd() * 1.6 - 0.8]);
    const sS = Array.from({ length: NSN }, () => [rnd() * 1.2 - 0.6, rnd(), rnd() * 1.0 - 0.5, rnd() * 6]);

    // camera-view board: what the lens sees
    let view = { pts: [], flk: [], alpha: 1, haze: 0, rel: 1, theta: 0, wind: 0 };
    const camB = makeBoard(root, 3.0, 2.25, 640, 480, (g, w, h) => {
      g.clearRect(0, 0, w, h); g.fillStyle = '#05060a'; g.fillRect(0, 0, w, h);
      // haze glow where the lamp shines through towards the lens
      if (view.haze > 0.01) {
        const gx = w / 2 + clamp(Math.sin(view.theta * D2R), -1, 1) * w * 0.35;
        const rg = g.createRadialGradient(gx, h * 0.22, 10, gx, h * 0.22, w * 0.6);
        rg.addColorStop(0, `rgba(200,215,240,${0.55 * view.haze * clamp(view.rel, 0.08, 1)})`); rg.addColorStop(1, 'rgba(200,215,240,0)');
        g.fillStyle = rg; g.fillRect(0, 0, w, h);
      }
      // the actor as a silhouette, rim-lit when backlit
      const X = (x) => w / 2 + x * 95, Y = (y) => h - 20 - y * 88;
      g.fillStyle = '#1a1e27'; g.strokeStyle = `rgba(230,240,255,${0.9 * clamp(view.rel, 0, 1)})`; g.lineWidth = 3;
      g.beginPath(); g.ellipse(X(0), Y(1.66), 16, 20, 0, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(X(-0.26), Y(1.45)); g.lineTo(X(0.26), Y(1.45)); g.lineTo(X(0.2), Y(0.9)); g.lineTo(X(0.14), Y(0)); g.lineTo(X(-0.14), Y(0)); g.lineTo(X(-0.2), Y(0.9)); g.closePath(); g.fill(); g.stroke();
      // rain streaks
      g.strokeStyle = `rgba(235,244,255,${view.alpha})`; g.lineWidth = 2;
      g.beginPath();
      for (const [x, y, vx, vy] of view.pts) { const l = 0.22 / Math.hypot(vx, vy); g.moveTo(X(x), Y(y)); g.lineTo(X(x - vx * l), Y(y - vy * l)); }
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,.9)';
      for (const [x, y] of view.flk) g.fillRect(X(x) - 2, Y(y) - 2, 4, 4);
      g.fillStyle = 'rgba(9,11,17,.8)'; g.fillRect(0, 0, w, 58);
      say(g, 'CAMERA VIEW', 20, 38, { font: 'bold 24px sans-serif', col: '#fff' });
      say(g, `drops ${view.rel >= 0.5 ? 'glitter' : view.rel >= 0.1 ? 'faint' : 'almost invisible'}`, w - 20, 38, { font: 'bold 22px sans-serif', col: view.rel >= 0.5 ? COL.good : view.rel >= 0.1 ? COL.hot : COL.bad, align: 'right' });
      g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
      const rec = Math.floor(view.t * 2) % 2; if (rec) { g.fillStyle = '#ff3344'; g.beginPath(); g.arc(w - 26, h - 24, 8, 0, TAU); g.fill(); }
    }, [3.4, 2.3, -2.2]);
    camB.mesh.rotation.y = -0.25; camB.mesh.scale.setScalar(1.25);

    let t = 0, frame = 0;
    const minor = [barLbl, lampLbl, fanLbl, hopLbl, hazeLbl];
    return {
      update(dt, s) {
        dt = Math.max(0, dt); t += dt; frame++;
        narrowFit(stage, minor, -0.12);
        reelPlace([[camB, [0.2, 6.9, -1.5], 1.25]]);
        // the lamp on its circle, aimed at the rain over the actor
        const Lp = lampPos(s.light);
        lamp.position.set(Lp.x, 0.05, Lp.z); lamp.rotation.y = Math.atan2(Lp.z, -Lp.x);
        lamp.head.rotation.z = -Math.atan2(Lp.y - DROP.y, Math.hypot(Lp.x, Lp.z)) * 0.6;
        lampLbl.position.set(Lp.x, 3.55, Lp.z);
        spot.position.copy(Lp);
        const sc = scatter(s.light);
        // beam in haze: its brightness follows haze and the scattering towards the lens
        const dir = DROP.clone().sub(Lp), len = dir.length();
        beamM.position.copy(Lp); beamM.scale.set(1, len * 1.25, 1); beamM.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
        beamMat.opacity = 0.35 * s.haze * clamp(Math.sqrt(sc.rel), 0.12, 1);
        hazeVol.material.opacity = 0.09 * s.haze;
        // wind machine
        fan.rotor.rotation.x -= dt * s.wind * 2.2;
        flagPivot.rotation.y = 0; flag.rotation.x = 0;
        const hang = Math.atan2(s.wind * s.wind, 20);       // a light flag lifts towards horizontal as v² grows
        flagPivot.rotation.z = -Math.PI / 2 + hang; flag.rotation.x = 0.15 * Math.sin(t * (3 + s.wind)) * clamp(s.wind / 5, 0, 1);
        const wEff = s.wind;                                // wind at the actor (the jet spreads, kept uniform here)
        // rain
        const nOn = s.rain ? Math.round(NR * clamp(s.flow / 120, 0, 1)) : 0;
        const pts = [];
        for (let i = 0; i < NR; i++) {
          if (i >= nOn) { drops.put(i, 0, -50, 0, 0.0001); continue; }
          const [x0, ph, z0] = dS[i], age = (t + ph * T_RAIN) % T_RAIN;
          const y = BAR_H - fallDist(age, VT, TAU_R), x = x0 + fallDist(age, wEff, TAU_R);
          const vy = VT * (1 - Math.exp(-age / TAU_R)), vx = wEff * (1 - Math.exp(-age / TAU_R));
          drops.put(i, x, Math.max(0.05, y), z0, 1, 0, 0, Math.atan2(vx, Math.max(0.3, vy)));
          if (i % 2 === 0 && y > 0.1 && x > -3.2 && x < 3.2) pts.push([x, y, vx, Math.max(0.3, vy)]);
        }
        drops.done();
        drops.material.opacity = 0.2 + 0.7 * clamp(Math.sqrt(sc.rel), 0, 1);
        // paper snow
        const flk = [];
        hopper.visible = s.snow; hopLbl.visible = s.snow && !(stage.host.clientWidth < 560);
        for (let i = 0; i < NSN; i++) {
          if (!s.snow) { flakes.put(i, 0, -50, 0, 0.0001); continue; }
          const [x0, ph, z0, sp] = sS[i], age = (t + ph * T_SNOW) % T_SNOW;
          const y = 4.55 - fallDist(age, VS, TAU_S), x = 0.3 + x0 + fallDist(age, wEff, TAU_S) + 0.1 * Math.sin(t * 2 + sp);
          flakes.put(i, x, Math.max(0.05, y), -1.1 + z0 + 0.1 * Math.cos(t * 1.7 + sp), 1, t * sp, t * 1.3, 0);
          if (i % 2 === 0 && x < 3.2) flk.push([x, y]);
        }
        flakes.done();
        // the actor gets wet and leans into the wind
        const F = 0.5 * 1.2 * wEff * wEff * 0.84;
        actor.cloth.color.lerp(s.rain && s.flow > 5 ? wet : coat, 1 - Math.exp(-dt * 0.8));
        actor.set({ armL: 0.15, armR: 0.15, lean: 0, tilt: -clamp(F / 900, 0, 0.12) });
        view = { t, pts, flk, alpha: clamp(0.06 + 0.94 * Math.sqrt(sc.rel), 0, 1) * (s.rain ? 1 : 0), haze: s.haze, rel: sc.rel, theta: sc.theta, wind: wEff };
        if (frame % 2 === 0) camB.redraw();
      },
      readout(s) {
        const sc = scatter(s.light), rate = s.rain ? (s.flow * 60) / WET_AREA : 0;
        const F = 0.5 * 1.2 * s.wind * s.wind * 0.84;
        const driftR = fallDist(fallTime(BAR_H - 1.7, VT, TAU_R), s.wind, TAU_R), tS = fallTime(4.55 - 1.7, VS, TAU_S), driftS = fallDist(tS, s.wind, TAU_S);
        const sig = 0.9 * s.haze, vis = sig > 0.001 ? 3.912 / sig : Infinity;
        const bright = sc.rel >= 0.8 ? 'full (backlit)' : `1/${fmt(1 / sc.rel)} as bright`;
        return `<div class="big">${s.rain ? fmt(rate) + ' mm/h of rain' : 'Rain off'}</div>
          <div class="row"><span>Drops at ${Math.round(sc.theta)}° to the lens</span><b>${bright}</b></div>
          <div class="row"><span>Wind push on the actor</span><b>${fmt(F)} N (≈ ${fmt(F / G, 1)} kg)</b></div>
          <div class="row"><span>Drift at head height</span><b>rain ${fmt(driftR, 1)} m${s.snow ? ` · snow ${fmt(driftS, 1)} m` : ''}</b></div>
          <div class="row"><span>Visibility in the haze</span><b>${vis === Infinity ? 'clear' : fmt(vis, 1) + ' m'}</b></div>
          ${s.rain ? (rate > 100 ? `<div class="ok">${fmt(rate / 100, 1)}× a cloudburst: heavy enough to show.</div>` : '<div class="no">Lighter than a cloudburst: may not show on camera.</div>') : ''}`;
      },
    };
  },
};
