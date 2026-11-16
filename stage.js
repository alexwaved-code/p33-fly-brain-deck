// The 3D stage: the published MaleCNS shapes, one persistent scene that moves with the talk.
import * as THREE from "./vendor/three.module.js";
THREE.ColorManagement.enabled = false;

const C = { blue: "#2f6fed", amber: "#f2a007", green: "#1f9d4d", violet: "#8455e8", pink: "#e11d59", ink: "#16150f", shell: "#8f9bb0", dim: "#bcb7ab" };
const canvas = document.getElementById("stage");
const labelLayer = document.getElementById("labels");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: false });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 5, 20000);
const lightDir = new THREE.Vector3(0.3, 0.8, 0.5).normalize();

function shellMaterial(hex) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { color: { value: new THREE.Color(hex) }, opacity: { value: 0 }, solid: { value: 0 }, lightDir: { value: lightDir } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 p = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-p.xyz); gl_Position = projectionMatrix * p; }`,
    fragmentShader: `uniform vec3 color; uniform float opacity; uniform float solid; uniform vec3 lightDir; varying vec3 vN; varying vec3 vV;
      void main(){ vec3 n = normalize(vN); float ndv = abs(dot(n, normalize(vV)));
        float rim = pow(1.0 - ndv, 1.5); float lam = 0.5 + 0.5 * abs(dot(n, lightDir));
        vec3 c = mix(color * (0.62 + 0.38 * lam), color * (0.8 + 0.3 * lam), solid);
        float a = opacity * mix(0.10 + 0.9 * rim, 0.42 + 0.5 * rim, solid);
        gl_FragColor = vec4(c, a); }`,
  });
}
function neuronMaterial(hex) {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { color: { value: new THREE.Color(hex) }, grey: { value: new THREE.Color(C.dim) }, shown: { value: 0 }, front: { value: 0 }, maxd: { value: 1 }, alpha: { value: 1 }, lightDir: { value: lightDir } },
    vertexShader: `attribute float dist; varying float vD; varying vec3 vN;
      void main(){ vD = dist; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 color; uniform vec3 grey; uniform float shown; uniform float front; uniform float maxd; uniform float alpha; uniform vec3 lightDir; varying float vD; varying vec3 vN;
      void main(){ if (vD > shown * maxd || alpha < 0.01) discard;
        float f = front * maxd * 1.02; float lit = step(vD, f);
        float head = (front > 0.001 && front < 0.999) ? smoothstep(maxd * 0.12, 0.0, abs(vD - f)) : 0.0;
        vec3 c = mix(grey, color, lit); c = mix(c, vec3(1.0), head * 0.75);
        float lam = 0.84 + 0.16 * max(dot(normalize(vN), lightDir), 0.0);
        gl_FragColor = vec4(c * lam, alpha); }`,
  });
}
function tube(lines, radius) {
  const radial = 6, pos = [], nor = [], dis = [], idx = [];
  let base = 0;
  for (const flat of lines) {
    const n = flat.length / 4; if (n < 2) continue;
    let nx = 1, ny = 0, nz = 0;
    for (let i = 0; i < n; i++) {
      const x = flat[i * 4], y = flat[i * 4 + 1], z = flat[i * 4 + 2], d = flat[i * 4 + 3];
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      let dx = flat[b * 4] - flat[a * 4], dy = flat[b * 4 + 1] - flat[a * 4 + 1], dz = flat[b * 4 + 2] - flat[a * 4 + 2];
      const len = Math.hypot(dx, dy, dz) || 1; dx /= len; dy /= len; dz /= len;
      const dot = nx * dx + ny * dy + nz * dz; nx -= dx * dot; ny -= dy * dot; nz -= dz * dot;
      let nl = Math.hypot(nx, ny, nz);
      if (nl < 1e-5) { nx = dy; ny = -dx; nz = 0; nl = Math.hypot(nx, ny, nz) || 1; }
      nx /= nl; ny /= nl; nz /= nl;
      const bx = dy * nz - dz * ny, by = dz * nx - dx * nz, bz = dx * ny - dy * nx;
      for (let k = 0; k < radial; k++) {
        const t = (k / radial) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
        const ox = nx * c + bx * s, oy = ny * c + by * s, oz = nz * c + bz * s;
        pos.push(x + ox * radius, y + oy * radius, z + oz * radius); nor.push(ox, oy, oz); dis.push(d);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < radial; k++) {
      const k2 = (k + 1) % radial, p = base + i * radial + k, q = base + i * radial + k2, r = base + (i + 1) * radial + k, s = base + (i + 1) * radial + k2;
      idx.push(p, r, q, q, r, s);
    }
    base += n * radial;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("dist", new THREE.Float32BufferAttribute(dis, 1));
  g.setIndex(idx);
  return g;
}
// The published skeletons arrive as short sampled pieces. Join each piece to its nearest neighbour so a cell reads as one cable.
function joinPieces(lines, limit) {
  const P = [], owner = [];
  lines.forEach((l, li) => { for (let i = 0; i < l.length; i += 4) { P.push(l[i], l[i + 1], l[i + 2], l[i + 3]); owner.push(li); } });
  const comp = lines.map((_, i) => i), find = (a) => { while (comp[a] !== a) a = comp[a] = comp[comp[a]]; return a; };
  const out = lines.slice(), L2 = limit * limit;
  for (let pass = 0; pass < 4; pass++) {
    const cand = [];
    lines.forEach((l, li) => {
      const me = find(li);
      for (const e of [0, l.length - 4]) {
        let best = L2, bi = -1;
        for (let k = 0; k < owner.length; k++) {
          const dx = P[k * 4] - l[e], dy = P[k * 4 + 1] - l[e + 1], dz = P[k * 4 + 2] - l[e + 2], d = dx * dx + dy * dy + dz * dz;
          if (d < best && find(owner[k]) !== me) { best = d; bi = k; }
        }
        if (bi >= 0) cand.push([best, li, e, bi]);
      }
    });
    if (!cand.length) break;
    cand.sort((a, b) => a[0] - b[0]);
    for (const [, li, e, k] of cand) {
      const a = find(li), b = find(owner[k]); if (a === b) continue;
      comp[a] = b; const l = lines[li];
      out.push([l[e], l[e + 1], l[e + 2], l[e + 3], P[k * 4], P[k * 4 + 1], P[k * 4 + 2], P[k * 4 + 3]]);
    }
  }
  return out;
}
function loadScript(src) { return new Promise((ok, bad) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); }); }
function centroid(v) { let x = 0, y = 0, z = 0; const n = v.length / 3; for (let i = 0; i < v.length; i += 3) { x += v[i]; y += v[i + 1]; z += v[i + 2]; } return new THREE.Vector3(x / n, y / n, z / n); }

// ---------- scene objects ----------
const world = new THREE.Group(); scene.add(world);
const male = new THREE.Group(); world.add(male);            // carries maleX
const root = new THREE.Group(); male.add(root); root.rotation.y = Math.PI / 2;
const cordGroup = new THREE.Group(); root.add(cordGroup);
const female = new THREE.Group(); world.add(female); female.visible = false;
const shell = {};   // key -> [materials]
const neuron = {};  // id -> material
const anchors = {}; // name -> {v: Vector3 (root local), cord: bool}
const SHELL_KEY = { "Central brain": "brain", "Left optic lobe": "eye", "Right optic lobe": "eye", "Neck": "neck", "Ventral nerve cord": "cord" };
let cutDir = new THREE.Vector3();
let femaleMat = null;

async function build() {
  await loadScript("demo/data.js");
  const B = window.BRAIN;
  for (const s of B.shells) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(s.vertices, 3));
    g.setIndex(new THREE.Uint32BufferAttribute(s.faces, 1)); g.computeVertexNormals();
    const key = SHELL_KEY[s.name], m = shellMaterial(C.shell);
    (shell[key] = shell[key] || []).push(m);
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 2;
    (key === "cord" ? cordGroup : root).add(mesh);
    const c = centroid(s.vertices);
    anchors[s.name === "Left optic lobe" ? "eyeL" : s.name === "Right optic lobe" ? "eyeR" : key] = { v: c, cord: key === "cord" };
  }
  const JOIN = { lc4: 14, gf: 70, pip10: 40, ttmn: 40 };
  const R = { lc4: 1.7, gf: 4.4, pip10: 2.6, ttmn: 3.0 }, COL = { lc4: C.blue, gf: C.amber, pip10: C.pink, ttmn: C.green };
  for (const n of B.neurons) {
    const lines = joinPieces(n.lines, JOIN[n.id]);
    const m = neuronMaterial(COL[n.id]); m.uniforms.maxd.value = n.max; neuron[n.id] = m;
    const mesh = new THREE.Mesh(tube(lines, R[n.id]), m); mesh.frustumCulled = false; mesh.renderOrder = 1;
    (n.id === "ttmn" ? cordGroup : root).add(mesh);
    let x = 0, y = 0, z = 0, k = 0;
    for (const l of lines) for (let i = 0; i < l.length; i += 4) { x += l[i]; y += l[i + 1]; z += l[i + 2]; k++; }
    anchors[n.id] = { v: new THREE.Vector3(x / k, y / k, z / k), cord: n.id === "ttmn" };
  }
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root); root.position.sub(box.getCenter(new THREE.Vector3()));
  root.updateMatrixWorld(true);
  const wNeck = root.localToWorld(anchors.neck.v.clone()), wCord = root.localToWorld(anchors.cord.v.clone());
  cutDir = new THREE.Vector3(Math.sign(wCord.x - wNeck.x), 0, 0).applyQuaternion(root.quaternion.clone().invert());
  flipX = wCord.x < wNeck.x ? -1 : 1;   // keep the brain on the left of the screen
  window.BRAIN = null;
  ready = true; canvas.classList.toggle("on", cur.vis > 0.01);
  loadScript("demo/brain.js").then(buildFemale);
}
function buildFemale() {
  const F = window.FLYBRAIN; if (!F) return;
  femaleMat = shellMaterial("#8455e8"); femaleMat.uniforms.solid.value = 0.35;
  const inner = new THREE.Group();
  for (const p of F.parts) {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p.vertices, 3)); g.setIndex(p.faces); g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, femaleMat); mesh.frustumCulled = false; mesh.renderOrder = 2; inner.add(mesh);
  }
  const b = new THREE.Box3().setFromObject(inner), c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
  inner.position.sub(c);
  const holder = new THREE.Group(); holder.add(inner);
  // widest axis of the brain (eye to eye) is x here; lay it along world z like the male, front of the brain facing up
  holder.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  holder.scale.setScalar(733 / Math.max(s.x, s.y, s.z));
  female.add(holder); window.FLYBRAIN = null;
}

// ---------- state ----------
const N0 = () => ({ shown: 0, front: 1, alpha: 1 });
function base() {
  return {
    vis: 0, spin: 0, cut: 0, maleX: 0, maleVis: 1, femaleVis: 0, femaleX: -640,
    cam: { a: 0.22, yaw: 0, r: 1950, ox: 0, oy: 0, at: "center" },
    shells: { eye: { c: C.shell, op: 0.55, solid: 0 }, brain: { c: C.shell, op: 0.55, solid: 0 }, neck: { c: C.shell, op: 0.55, solid: 0 }, cord: { c: C.shell, op: 0.55, solid: 0 } },
    neu: { lc4: N0(), gf: N0(), pip10: N0(), ttmn: N0() },
    tags: [],
  };
}
function mix(o, p) { for (const k in p) { if (p[k] && typeof p[k] === "object" && !Array.isArray(p[k])) { o[k] = o[k] || {}; mix(o[k], p[k]); } else o[k] = p[k]; } return o; }
const lit = (c, op = 0.9) => ({ c, op, solid: 1 });
const on = (front = 1) => ({ shown: 1, front, alpha: 1 });
const allNeu = { lc4: on(), gf: on(), pip10: on(), ttmn: on() };
const PARTS = [["eye", C.blue], ["brain", C.amber], ["neck", C.ink], ["cord", C.violet]];
const LEFT = { a: 0.22, yaw: 0, r: 1980, ox: -278, oy: 46, at: "center" };

const VIEWS = {
  1: () => ({ vis: 1, spin: 0.22, cam: { a: 0.6, yaw: 0.3, r: 2500, ox: 470, oy: -20 }, neu: allNeu, shells: { eye: { op: 0.6 }, brain: { op: 0.6 }, neck: { op: 0.6 }, cord: { op: 0.6 } } }),
  6: (s) => ({ vis: 1, spin: 0.22, cam: { a: 0.6, yaw: 0.3, r: 2600, ox: 480, oy: -40 }, neu: allNeu,
    shells: s >= 2 ? { eye: lit(C.amber, 0.7), brain: lit(C.amber, 0.7), neck: lit(C.ink, 0.8), cord: lit(C.violet, 0.7) } : {} }),
  8: (s) => ({ vis: 1, femaleVis: 1, maleVis: s >= 1 ? 1 : 0, maleX: 640, cam: { a: 0.22, yaw: 0, r: 3300, ox: 0, oy: -95, at: "origin" },
    shells: { eye: lit(C.amber, 0.75), brain: lit(C.amber, 0.75), neck: lit(C.amber, 0.75), cord: lit(C.amber, 0.75) } }),
  9: (s) => {
    const sh = {}, tags = [];
    PARTS.forEach(([k, c], i) => { if (s >= i + 1) sh[k] = lit(c); });
    if (s >= 1) tags.push({ id: "p1a", t: "1", c: C.blue, at: "eyeL" }, { id: "p1b", t: "1", c: C.blue, at: "eyeR" });
    if (s >= 2) tags.push({ id: "p2", t: "2", c: C.amber, at: "brain" });
    if (s >= 3) tags.push({ id: "p3", t: "3", c: C.ink, at: "neck", dy: -46 });
    if (s >= 4) tags.push({ id: "p4", t: "4", c: C.violet, at: "cord", dx: 110, dy: -70 });
    if (s >= 5) { tags.push({ id: "p5", t: "5", c: C.green, at: "ttmn", dy: 60 }); sh.cord = lit(C.violet, 0.45); }
    return { vis: 1, cam: LEFT, shells: sh, neu: { ttmn: s >= 5 ? on() : N0() }, tags };
  },
  10: (s) => s < 2 ? ({ vis: 1, cut: s === 0 ? 1 : 0, cam: { a: 0.3, yaw: 0.1, r: 1050, ox: -330, oy: 40, at: "neck" },
      shells: { neck: lit(s === 0 ? C.pink : C.ink, 0.5), eye: { op: 0.35 }, brain: { op: 0.5 }, cord: { op: 0.5 } },
      neu: { gf: s >= 1 ? on() : N0() },
      tags: [{ id: "tb", t: "BRAIN", txt: 1, at: "brain", dy: -250 }, { id: "tn", t: "NECK", txt: 1, at: "neck", dy: -90 }, { id: "tc", t: "NERVE CORD", txt: 1, at: "neck", dx: 250, dy: -190 }] })
    : ({ vis: 1, cam: LEFT, shells: { eye: { op: 0.45 }, brain: { op: 0.45 }, neck: lit(C.ink, 0.5), cord: { op: 0.45 } }, neu: { lc4: on(), gf: on(), ttmn: on() } }),
  12: (s) => ({ vis: 1, cam: LEFT, shells: { eye: { op: 0.4 }, brain: { op: 0.4 }, neck: { op: 0.4 }, cord: { op: 0.4 } },
    neu: { lc4: on(s >= 1 ? 1 : 0), gf: on(s >= 1 ? 1 : 0), ttmn: on(s >= 1 ? 1 : 0) },
    tags: s >= 1 ? [{ id: "s1", t: "1", c: C.blue, at: "lc4", dx: -70, dy: 40 }, { id: "s2", t: "2", c: C.amber, at: "neck", dy: -50 }, { id: "s3", t: "3", c: C.green, at: "ttmn", dy: 64 }] : [] }),
  13: (s) => ({ vis: 1, cam: { a: 0.55, yaw: -0.15, r: 780, ox: -380, oy: 30, at: "brain" },
    shells: { eye: { op: 0.1 }, brain: lit(C.ink, 0.28), neck: { op: 0.05 }, cord: { op: 0 } },
    neu: { lc4: N0(), gf: N0(), ttmn: N0(), pip10: s >= 1 ? on() : N0() },
    tags: s >= 1 ? [{ id: "pp", t: "pIP10", txt: 1, c: C.pink, at: "pip10", dx: 90, dy: -40 }] : [] }),
  24: () => ({ vis: 1, spin: 0.22, cam: { a: 0.6, yaw: 0.3, r: 2400, ox: 460, oy: 0 }, neu: allNeu }),
};

let ready = false, flipX = 1;
let tgt = base(), cur = base();
let userA = 0, userYaw = 0, spinA = 0, signalRun = 0;
const tagEls = new Map();

function go(n, step) {
  const v = VIEWS[n];
  tgt = mix(base(), v ? v(step) : {});
  if (!v) { tgt.cam = { ...cur.cam }; tgt.shells = JSON.parse(JSON.stringify(cur.shells)); tgt.neu = JSON.parse(JSON.stringify(cur.neu)); tgt.maleX = cur.maleX; tgt.spin = cur.spin; tgt.femaleVis = cur.femaleVis; tgt.maleVis = cur.maleVis; }
  userA = userYaw = 0; signalRun++;
  canvas.classList.toggle("on", ready && tgt.vis > 0);
  canvas.style.pointerEvents = tgt.vis > 0 ? "auto" : "none";
  syncTags();
}
function syncTags() {
  const want = new Set(tgt.vis > 0 ? tgt.tags.map((t) => t.id) : []);
  for (const [id, el] of tagEls) if (!want.has(id)) { el.classList.remove("on"); setTimeout(() => { if (!el.classList.contains("on")) { el.remove(); tagEls.delete(id); } }, 400); }
  if (tgt.vis > 0) for (const t of tgt.tags) {
    let el = tagEls.get(t.id);
    if (!el) { el = document.createElement("div"); el.className = "tag" + (t.txt ? " txt" : ""); el.textContent = t.t; labelLayer.appendChild(el); tagEls.set(t.id, el); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("on"))); }
    else el.classList.add("on");
    el.style.setProperty("--c", t.c || C.ink); el._t = t;
  }
}
// one signal: LC4, then the giant fiber, then TTMn
function signal() {
  const run = ++signalRun, seq = [["lc4", 750], ["gf", 950], ["ttmn", 650]];
  for (const [id] of seq) { cur.neu[id].front = 0; tgt.neu[id].front = 0; cur.neu[id].shown = tgt.neu[id].shown = 1; }
  let i = 0, t0 = performance.now();
  window.dispatchEvent(new CustomEvent("signal", { detail: { id: "start" } }));
  (function tick(now) {
    if (run !== signalRun) return;
    const [id, ms] = seq[i], u = Math.min(1, (now - t0) / ms);
    if (u === 0 || !tick.said) { window.dispatchEvent(new CustomEvent("signal", { detail: { id } })); tick.said = true; }
    cur.neu[id].front = tgt.neu[id].front = u;
    if (u >= 1) { i++; t0 = now; tick.said = false; if (i >= seq.length) { window.dispatchEvent(new CustomEvent("signal", { detail: { id: "end" } })); return; } }
    requestAnimationFrame(tick);
  })(t0);
}

// ---------- frame ----------
const tmpC = new THREE.Color(), tmpT = new THREE.Color(), v3 = new THREE.Vector3();
function approach(a, b, k) { return a + (b - a) * k; }
let last = performance.now(), W = 1, H = 1, K = 1;
function resize() {
  const fb = window.frameBox();
  if (fb.view) { W = fb.w; H = fb.h; K = fb.k; } else { W = innerWidth; H = innerHeight; K = Math.min(W / 1600, H / 900); }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.setSize(W, H, false);
  camera.aspect = W / H; labelLayer.style.setProperty("--k", K);
}
addEventListener("resize", resize); resize();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const k = 1 - Math.exp(-dt * 3.2), kf = 1 - Math.exp(-dt * 6);
  cur.vis = approach(cur.vis, tgt.vis, kf);
  if (!ready || (cur.vis < 0.004 && tgt.vis === 0)) return;
  for (const p of ["cut", "maleX", "maleVis", "femaleVis", "femaleX", "spin"]) cur[p] = approach(cur[p], tgt[p], k);
  for (const p of ["a", "yaw", "r", "ox", "oy"]) cur.cam[p] = approach(cur.cam[p], tgt.cam[p], k);
  cur.cam.at = tgt.cam.at;
  for (const key in shell) {
    const c = cur.shells[key], t = tgt.shells[key];
    c.op = approach(c.op, t.op, k); c.solid = approach(c.solid, t.solid, k);
    tmpC.set(c.c).lerp(tmpT.set(t.c), k); c.c = "#" + tmpC.getHexString();
    for (const m of shell[key]) { m.uniforms.color.value.copy(tmpC); m.uniforms.opacity.value = c.op * cur.maleVis; m.uniforms.solid.value = c.solid; }
  }
  for (const id in neuron) {
    const c = cur.neu[id], t = tgt.neu[id], u = neuron[id].uniforms;
    c.shown = t.shown > c.shown ? Math.min(t.shown, c.shown + dt * (id === "pip10" ? 0.45 : 0.7)) : t.shown;
    c.front = approach(c.front, t.front, kf); c.alpha = approach(c.alpha, t.alpha, k);
    u.shown.value = c.shown; u.front.value = c.front; u.alpha.value = c.alpha * cur.maleVis;
  }
  male.visible = cur.maleVis > 0.01; male.position.x = cur.maleX;
  cordGroup.position.copy(cutDir).multiplyScalar(cur.cut * 150);
  female.visible = cur.femaleVis > 0.01 && !!femaleMat; female.position.x = cur.femaleX;
  if (femaleMat) femaleMat.uniforms.opacity.value = 0.8 * cur.femaleVis;

  spinA += dt * cur.spin;
  const a = cur.cam.a + spinA * (cur.spin > 0.01 ? 1 : 0) + userA + Math.sin(now / 2600) * 0.05 * (1 - Math.min(1, cur.spin * 4));
  const yaw = cur.cam.yaw + userYaw + Math.sin(now / 3400) * 0.03;
  if (cur.spin < 0.01) spinA = 0;
  const T = v3.set(0, 0, 0);
  if (anchors[cur.cam.at]) { T.copy(anchors[cur.cam.at].v); root.localToWorld(T); }
  else if (cur.cam.at === "center") T.set(cur.maleX, 0, 0);
  camT.lerp(T, k);
  const r = cur.cam.r * (H / 900) / K;
  camera.position.set(camT.x + Math.sin(yaw) * r, camT.y + Math.cos(a) * Math.cos(yaw) * r, camT.z + Math.sin(a) * Math.cos(yaw) * r);
  camera.up.set(0, Math.sin(a) * flipX, -Math.cos(a) * flipX);
  camera.lookAt(camT);
  camera.setViewOffset(W, H, -cur.cam.ox * K, -cur.cam.oy * K, W, H);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);

  for (const [, el] of tagEls) {
    const t = el._t, an = anchors[t.at]; if (!an) continue;
    v3.copy(an.v); if (an.cord) v3.addScaledVector(cutDir, cur.cut * 150);
    root.localToWorld(v3); v3.project(camera);
    el.style.left = ((v3.x + 1) / 2 * W + (t.dx || 0) * K) + "px"; el.style.top = ((1 - v3.y) / 2 * H + (t.dy || 0) * K) + "px";
  }
}
const camT = new THREE.Vector3();
requestAnimationFrame(frame);

// drag to turn
let drag = null;
canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener("pointermove", (e) => { if (!drag) return; userYaw -= (e.clientX - drag.x) * 0.004; userA += (e.clientY - drag.y) * 0.005; userYaw = Math.max(-1.2, Math.min(1.2, userYaw)); drag = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener("pointerup", () => { drag = null; });
canvas.addEventListener("pointercancel", () => { drag = null; });

window.Stage = { go, signal, get ready() { return ready; } };
build();
window.dispatchEvent(new Event("stage-api"));
