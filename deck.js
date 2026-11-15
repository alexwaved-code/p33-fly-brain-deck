// Deck engine: navigation, steps, evidence, and the small interactive pieces.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const NOTES = window.NOTES, REFS = window.REFS, EVIDENCE = window.EVIDENCE;
const slides = $$(".slide"), TOTAL = slides.length;
const deck = $("#deck");
const stepsOf = (n) => +slides[n - 1].dataset.steps;
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const fmt = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
const sayHtml = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\[([^\]]+)\]/g, "<i>[$1]</i>").replace(/✂/g, "<i>✂</i>");

let n = 1, step = 0, K = 1;
let t0 = null;                      // clock start (ms), null until the talk starts

// ---------- layout ----------
const VIEW = document.documentElement.classList.contains("view");
function fit() {
  const fb = window.frameBox(); K = fb.k;
  if (VIEW) { deck.style.left = fb.x + fb.w / 2 + "px"; deck.style.top = fb.y + fb.h / 2 + "px"; }
  deck.style.transform = `scale(${K}) translate(-50%, -50%)`;
}
addEventListener("resize", fit); fit();

// ---------- tracker ----------
const track = $("#track");
track.innerHTML = NOTES.speakers.map((s) => `<span class="t" data-k="${s.key}">${s.stop}<em>${s.say}</em></span>`).join("");

// ---------- references slide ----------
$("#refs").innerHTML = window.REF_ORDER.map((k) => `<li>${REFS[k].apa}</li>`).join("");

// ---------- render ----------
function render(from) {
  const sl = slides[n - 1], note = NOTES.slides[n - 1];
  slides.forEach((s, i) => s.classList.toggle("cur", i === n - 1));
  sl.dataset.step = step;
  $$("[data-s]", sl).forEach((el) => el.classList.toggle("on", step >= +el.dataset.s));
  $$("[data-only]", sl).forEach((el) => el.classList.toggle("on", step === +el.dataset.only));
  const order = NOTES.speakers.map((s) => s.key), ci = order.indexOf(note.who);
  $$(".t", track).forEach((t, i) => { t.classList.toggle("done", i < ci); t.classList.toggle("cur", i === ci); });
  track.classList.toggle("hide", n === 1 || n === 12 || n >= 24);
  $("#pageno").textContent = `${n} / ${TOTAL}`;
  if (location.hash !== `#${n}.${step}`) history.replaceState(null, "", `#${n}.${step}`);
  window.Stage && window.Stage.go(n, step);
  fx(from);
  prompt();
  send();
  viewUi();
}
function go(nn, ss = 0) {
  nn = Math.max(1, Math.min(TOTAL, nn)); ss = Math.max(0, Math.min(stepsOf(nn), ss));
  if (nn === n && ss === step) return;
  const from = { n, step };
  n = nn; step = ss; render(from);
}
// The clock runs from 0:00, and only when someone starts it: S here, or the timer button on a phone.
function startClock() { t0 = Date.now(); }
const next = () => (step < stepsOf(n) ? go(n, step + 1) : go(n + 1, 0));
const prev = () => (step > 0 ? go(n, step - 1) : n > 1 ? go(n - 1, stepsOf(n - 1)) : 0);

// ---------- clock ----------
const clock = $("#clock");
setInterval(() => {
  const el = t0 === null ? 0 : (Date.now() - t0) / 1000;
  clock.textContent = fmt(el);
  const w = $("#prompter .who .time"); if (w) w.textContent = `${fmt(el)} · plan ${fmt(NOTES.slides[n - 1].mark)}`;
}, 500);

// ---------- prompter ----------
const prompter = $("#prompter");
function prompt() {
  const note = NOTES.slides[n - 1], sp = NOTES.speakers.find((s) => s.key === note.who);
  const nx = step < stepsOf(n) ? note.segs[step + 1] : n < TOTAL ? NOTES.slides[n].segs[0] : "";
  const handoff = step === stepsOf(n) && n < TOTAL && NOTES.slides[n].who !== note.who;
  $(".who", prompter).innerHTML = `<span>${sp.say} · ${n}. ${note.name} · ${step + 1}/${stepsOf(n) + 1}</span><span class="time"></span>`;
  $(".now", prompter).innerHTML = sayHtml(note.segs[step] || "");
  $(".next", prompter).innerHTML = nx ? (handoff ? "Next speaker ▸ " : "Next click ▸ ") + sayHtml(nx) : "";
}

// ---------- evidence ----------
const evidence = $("#evidence");
function openEvidence() {
  const items = EVIDENCE[n];
  $(".items", evidence).innerHTML = items ? items.map((e) => `<div class="ev"><p class="claim">${e.claim}</p>${e.quote ? `<blockquote>“${e.quote}”</blockquote>` : ""}${e.where ? `<p class="where">${e.where}</p>` : ""}${e.refs.map((r) => `<p class="apa">${REFS[r].apa}</p>`).join("")}</div>`).join("")
    : `<div class="ev"><p class="claim">No outside source is needed on this slide.</p><p class="where">The full reference list is on slide ${TOTAL}.</p></div>`;
  evidence.hidden = false;
}
document.addEventListener("click", (e) => {
  if (e.target.closest(".cite")) return openEvidence();
  const a = e.target.closest("aside"); if (a && (e.target === a || e.target.closest(".x"))) a.hidden = true;
});

function send() {}

// ---------- keys ----------
let digits = "";
function key(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  const open = $$("aside:not(#prompter)").find((a) => !a.hidden);
  if (k === "Escape") { if (open) open.hidden = true; digits = ""; return; }
  if (/^[0-9]$/.test(k)) { digits += k; return; }
  if (k === "Enter" && digits) { go(+digits); digits = ""; return; }
  if (k === "ArrowRight" || k === " " || k === "PageDown" || k === "ArrowDown") { e.preventDefault(); if (open) open.hidden = true; else next(); }
  else if (k === "ArrowLeft" || k === "PageUp" || k === "ArrowUp") { e.preventDefault(); prev(); }
  else if (k === "Home") go(1); else if (k === "End") go(TOTAL);
  else if (k === "e" || k === "E") evidence.hidden ? openEvidence() : (evidence.hidden = true);
  else if (k === "f" || k === "F") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  else if (k === "r" || k === "R") replay();
}
addEventListener("keydown", key);

// =====================================================================
// Interactive pieces
// =====================================================================
function countUp(el, to, ms = 1500) {
  const start = performance.now(); cancelAnimationFrame(el._raf);
  (function tick(now) {
    const u = Math.min(1, (now - start) / ms), v = u >= 1 ? to : Math.floor(to * (1 - Math.pow(1 - u, 4)));
    el.textContent = v.toLocaleString("en-US");
    if (u < 1) el._raf = requestAnimationFrame(tick);
  })(start);
}
function counters(sl) {
  for (const el of $$("[data-count], [data-to]", sl)) {
    const gate = el.closest("[data-s]"), vis = !gate || gate.classList.contains("on");
    if (vis && !el._vis) countUp(el, +(el.dataset.count || el.dataset.to), el.dataset.to ? 2200 : 1300);
    el._vis = vis;
  }
}
function replay() {
  if (n === 13 && step >= 1) window.Stage && window.Stage.signal();
  else if (n === 18) flood(SEED);
  else if (n === 11) { dotT = performance.now(); }
}

// --- slide 2: a fly that will not be caught ---
const bug = $("#bug");
const B = { x: 1180, y: 250, vx: 0, vy: 0, tx: 1180, ty: 250, a: 0, wait: 0, on: false, mx: -999, my: -999 };
function bugTarget() { B.tx = 140 + Math.random() * 1320; B.ty = 120 + Math.random() * 640; B.wait = 0.8 + Math.random() * 1.6; }
function bugDodge() {
  const dx = B.x - B.mx, dy = B.y - B.my, d = Math.hypot(dx, dy) || 1;
  B.tx = Math.max(100, Math.min(1500, B.x + (dx / d) * 520 + (Math.random() - 0.5) * 300));
  B.ty = Math.max(100, Math.min(800, B.y + (dy / d) * 380 + (Math.random() - 0.5) * 300));
  if (Math.hypot(B.tx - B.mx, B.ty - B.my) < 300) { B.tx = 1600 - B.mx; B.ty = 900 - B.my; }
  B.wait = 1.2;
}
deck.parentElement.addEventListener("pointermove", (e) => {
  B.mx = (e.clientX - innerWidth / 2) / K + 800; B.my = (e.clientY - innerHeight / 2) / K + 450;
});
bug.addEventListener("pointerdown", (e) => { e.preventDefault(); bugDodge(); });
let bugLast = 0;
function bugFrame(now) {
  if (!B.on) return;
  const dt = Math.min(0.05, (now - bugLast) / 1000); bugLast = now;
  if (Math.hypot(B.x - B.mx, B.y - B.my) < 190) bugDodge();
  const dx = B.tx - B.x, dy = B.ty - B.y, d = Math.hypot(dx, dy);
  if (d < 12) { B.wait -= dt; if (B.wait <= 0) bugTarget(); B.vx *= 0.8; B.vy *= 0.8; }
  else { const sp = Math.min(1500, 260 + d * 5); B.vx += ((dx / d) * sp - B.vx) * Math.min(1, dt * 9); B.vy += ((dy / d) * sp - B.vy) * Math.min(1, dt * 9); }
  B.x += B.vx * dt; B.y += B.vy * dt;
  if (Math.hypot(B.vx, B.vy) > 30) B.a = Math.atan2(B.vy, B.vx);
  bug.style.transform = `translate(${B.x - 42}px, ${B.y - 34 + Math.sin(now / 90) * 3}px) rotate(${B.a}rad)`;
  requestAnimationFrame(bugFrame);
}

// --- slide 11: one square per cell type ---
const dots = $("#dots"), dctx = dots.getContext("2d");
const COLS = 112, CELL = 14.4, NTYPES = 7205 + 114 + 262 + 69;
let dotT = 0, dotOn = false;
function dotFrame(now) {
  if (!dotOn) return;
  const cBlue = css("--blue"), cs = [css("--amber"), css("--pink"), css("--violet")], grey = "#dcd7ca";
  dctx.clearRect(0, 0, dots.width, dots.height);
  const t = (now - dotT) / 1000, rows = Math.ceil(NTYPES / COLS);
  for (let i = 0; i < NTYPES; i++) {
    const c = i % COLS, r = (i / COLS) | 0, x = 14 + c * CELL, y = 6 + r * CELL;
    let col = grey, s = 1;
    if (i < 7205) { if (step >= 1) { const u = step > 1 ? 1 : t * 1.5 - (c / COLS) * 0.7 - (r / rows) * 0.7; if (u > 0) { col = cBlue; s = u < 0.25 ? 1 + (0.25 - u) * 1.6 : 1; } } }
    else if (step >= 2) {
      const j = i - 7205, u = t * 1.4 - (j / 445) * 1.2;
      if (u > 0) { col = j < 114 ? cs[0] : j < 376 ? cs[1] : cs[2]; s = u < 0.3 ? 1 + (0.3 - u) * 2.4 : 1; }
    }
    dctx.fillStyle = col; dctx.globalAlpha = col === cBlue && step >= 2 ? 0.55 : 1;
    const w = (CELL - 3.4) * s; dctx.fillRect(x + (CELL - w) / 2, y + (CELL - w) / 2, w, w);
  }
  dctx.globalAlpha = 1;
  requestAnimationFrame(dotFrame);
}

// --- slide 12: vote, then the game ---
const game = $("#game");
function loadGame() {
  if (game.src) return;
  game.src = game.dataset.src;
  game.addEventListener("load", () => { try { game.contentWindow.addEventListener("keydown", (e) => key(e)); } catch {} });
}

// --- slide 13: the signal lights the list ---
const pathItems = $$("#pathlist li"), ORDER = { lc4: 0, gf: 1, ttmn: 2 };
addEventListener("signal", (e) => {
  const id = e.detail.id;
  if (id === "start") pathItems.forEach((li) => li.classList.remove("lit", "hot"));
  else if (id === "end") pathItems.forEach((li) => li.classList.remove("hot"));
  else pathItems.forEach((li, i) => { li.classList.toggle("hot", i === ORDER[id]); if (i <= ORDER[id]) li.classList.add("lit"); });
});
$("#replay").addEventListener("click", replay);

// --- slide 16: data flowing through four stages ---
const flow = $("#flow"), fctx = flow.getContext("2d");
let flowOn = false; const parts = Array.from({ length: 150 }, () => ({ x: Math.random(), y: Math.random(), v: 0.05 + Math.random() * 0.07, r: 5 + Math.random() * 9 }));
let flowLast = 0;
function flowFrame(now) {
  if (!flowOn) return;
  const dt = Math.min(0.05, (now - flowLast) / 1000); flowLast = now;
  const cols = [css("--blue"), css("--amber"), css("--violet"), css("--green")], W = flow.width, H = flow.height;
  fctx.clearRect(0, 0, W, H);
  fctx.strokeStyle = "#e0dcd1"; fctx.lineWidth = 4; fctx.beginPath(); fctx.moveTo(20, H / 2); fctx.lineTo(W - 20, H / 2); fctx.stroke();
  for (const p of parts) {
    p.x += p.v * dt; if (p.x > 1) { p.x = 0; p.y = Math.random(); }
    const stage = Math.min(3, (p.x * 4) | 0), squeeze = 1 - p.x * 0.75;   // raw voxels narrow into clean answers
    fctx.globalAlpha = Math.min(1, p.x * 12, (1 - p.x) * 12) * 0.85; fctx.fillStyle = cols[stage];
    const y = H / 2 + (p.y - 0.5) * (H - 24) * squeeze, r = p.r * (0.6 + 0.4 * squeeze);
    if (stage === 0) fctx.fillRect(p.x * W - r, y - r, r * 2, r * 2); else { fctx.beginPath(); fctx.arc(p.x * W, y, r, 0, 7); fctx.fill(); }
  }
  fctx.globalAlpha = 1;
  requestAnimationFrame(flowFrame);
}

// --- slide 18: flood fill from one voxel ---
const vox = $("#voxels"), VC = 16, VR = 9;
const SHAPE = [
  "................",
  "..#......##.....",
  "..##....##......",
  "...##..##...##..",
  "....####...##...",
  "..#####.####....",
  ".##...###.......",
  ".#......##......",
  ".........##.....",
];
const SEED = 4 * VC + 5;
const cells = [];
for (let r = 0; r < VR; r++) for (let c = 0; c < VC; c++) {
  const el = document.createElement("i"); el.dataset.i = r * VC + c;
  if (SHAPE[r][c] === "#") el.className = "cell"; vox.appendChild(el); cells.push(el);
}
let floodRun = 0;
function clearFlood() { floodRun++; cells.forEach((c) => c.classList.remove("fill", "seed")); cells[SEED].classList.add("seed"); }
function flood(seed) {
  clearFlood(); const run = floodRun; cells[SEED].classList.remove("seed"); cells[seed].classList.add("seed");
  const seen = new Set([seed]); let front = [seed];
  (function wave() {
    if (run !== floodRun || !front.length) return;
    const nxt = [];
    for (const i of front) {
      cells[i].classList.remove("seed"); cells[i].classList.add("fill");
      const r = (i / VC) | 0, c = i % VC;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const rr = r + dr, cc = c + dc, j = rr * VC + cc;
        if (rr < 0 || cc < 0 || rr >= VR || cc >= VC || seen.has(j) || SHAPE[rr][cc] !== "#") continue;
        seen.add(j); nxt.push(j);
      }
    }
    front = nxt; setTimeout(wave, 150);
  })();
}
vox.addEventListener("click", (e) => { const el = e.target.closest("i.cell"); if (el) flood(+el.dataset.i); });

// ---------- per-slide effects ----------
function fx(from) {
  const sl = slides[n - 1], entered = !from || from.n !== n;
  if (entered) $$("[data-count], [data-to]").forEach((el) => { if (!sl.contains(el)) el._vis = false; });
  counters(sl);

  const bugOn = n === 2; if (bugOn && !B.on) { B.on = true; bugLast = performance.now(); bugTarget(); requestAnimationFrame(bugFrame); } else if (!bugOn) B.on = false;

  const dOn = n === 11; if (dOn && (entered || from.step !== step)) dotT = performance.now();
  if (dOn && !dotOn) { dotOn = true; requestAnimationFrame(dotFrame); } else if (!dOn) dotOn = false;

  if (n === 11 || n === 12) loadGame();
  if (n === 12 && step === 1) setTimeout(() => game.focus(), 300);

  if (n === 13) {
    if (step === 0) pathItems.forEach((li) => li.classList.remove("lit", "hot"));
    else if (step === 1 && (entered || from.step === 0)) setTimeout(() => n === 13 && step === 1 && window.Stage && window.Stage.signal(), entered ? 900 : 150);
    else pathItems.forEach((li) => { li.classList.add("lit"); li.classList.remove("hot"); });
  }

  const fOn = n === 16 && step >= 1; if (fOn && !flowOn) { flowOn = true; flowLast = performance.now(); requestAnimationFrame(flowFrame); } else if (!fOn) { flowOn = false; fctx.clearRect(0, 0, flow.width, flow.height); }

  if (n === 18) { if (step === 0) clearFlood(); else if (step === 1 && (entered || from.step === 0)) flood(SEED); else if (entered) flood(SEED); }
}

// ---------- self-guided view: Back and Next on screen, a tap on the slide, and a hand that shows where to tap ----------
let hintTimer = 0;
function viewUi() {
  if (!VIEW) return;
  $("#vpos").textContent = `${n} / ${TOTAL}`;
  let done = 0, all = 0; for (let i = 1; i <= TOTAL; i++) { all += stepsOf(i) + 1; if (i < n) done += stepsOf(i) + 1; }
  $("#vfill").style.width = ((done + step) / (all - 1)) * 100 + "%";
  $("#vprev").disabled = n === 1 && step === 0;
  const end = n === TOTAL && step === stepsOf(n); $("#vnext").disabled = end;
  const hint = $("#taphint"), first = n === 1 && step === 0;
  $("span", hint).textContent = first ? "Tap Next to begin" : step < stepsOf(n) ? "Tap Next · more on this slide" : "Tap Next · next slide";
  hint.classList.toggle("on", first && !end);
  clearTimeout(hintTimer); if (!first && !end) hintTimer = setTimeout(() => hint.classList.add("on"), 7000);
}
if (VIEW) {
  $("#vnext").onclick = next; $("#vprev").onclick = prev;
  let down = null;
  addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY, t: e.timeStamp }; });
  addEventListener("pointerup", (e) => {
    const d = down; down = null;
    if (!d || e.timeStamp - d.t > 500 || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) return;      // a drag turns the 3D model
    if (e.target.closest("button, a, input, iframe, aside, nav, .cite, #voxels, #bug")) return;
    next();
  });
}

// ---------- start ----------
const h = location.hash.match(/^#(\d+)(?:\.(\d+))?/);
if (h) { n = Math.max(1, Math.min(TOTAL, +h[1])); step = Math.max(0, Math.min(stepsOf(n), +(h[2] || 0))); }
render(null);
window.Deck = { go, next, prev, get n() { return n; }, get step() { return step; } };
