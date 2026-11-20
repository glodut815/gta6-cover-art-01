"use strict";

/* Neon Vice Cover Studio — GTA 6-style poster maker.
   Everything runs locally: photos are drawn on canvas and never uploaded. */

const $ = (id) => document.getElementById(id);

const canvas = $("cover");
const ctx = canvas.getContext("2d");

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

function blankPanel() {
  return { img: null, src: "", zoom: 1, ox: 0, oy: 0 };
}

const state = {
  layout: "solo",
  grade: "sunset",
  size: "1080x1080",
  font: "Anton",
  ink: "#ffffff",
  outline: true,
  shadow: true,
  title: "SUNSET HEIST",
  subtitle: "VICE CITY \u2022 2026",
  selected: 0,
  panels: [blankPanel(), blankPanel(), blankPanel(), blankPanel()],
};

const LAYOUTS = {
  solo: [{ x: 0, y: 0, w: 1, h: 1 }],
  duo: [
    { x: 0, y: 0, w: 0.5, h: 1 },
    { x: 0.5, y: 0, w: 0.5, h: 1 },
  ],
  trio: [
    { x: 0, y: 0, w: 0.66, h: 1 },
    { x: 0.66, y: 0, w: 0.34, h: 0.5 },
    { x: 0.66, y: 0.5, w: 0.34, h: 0.5 },
  ],
  quad: [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ],
};

const GRADES = {
  sunset: {
    filter: "saturate(1.35) contrast(1.08) sepia(0.22) brightness(1.03)",
    overlay: ["#ff9a3d", "#ff5d8f"],
    alpha: 0.16,
  },
  neon: {
    filter: "saturate(1.65) contrast(1.14) hue-rotate(-12deg)",
    overlay: ["#ff2fb3", "#19c8ff"],
    alpha: 0.2,
  },
  vice: {
    filter: "saturate(1.45) contrast(1.06) hue-rotate(14deg)",
    overlay: ["#7b2fff", "#00d9a5"],
    alpha: 0.18,
  },
  noir: {
    filter: "grayscale(1) contrast(1.28) brightness(0.96)",
    overlay: null,
    alpha: 0,
  },
};

const SAMPLES = {
  sunset: "samples/sunset.jpg",
  skyline: "samples/skyline.jpg",
};

const SCENES = {
  1: { layout: "solo", grade: "sunset", sample: "sunset", title: "SUNSET HEIST", subtitle: "VICE CITY \u2022 2026" },
  2: { layout: "trio", grade: "neon", sample: "skyline", title: "NEON ALLEY", subtitle: "BACKSTREETS \u2022 AFTER DARK" },
  3: { layout: "quad", grade: "vice", sample: "sunset", title: "VICE CITY", subtitle: "FOUR WAYS TO GET CAUGHT" },
  4: { layout: "duo", grade: "noir", sample: "skyline", title: "MIDNIGHT DRIVE", subtitle: "NO WITNESSES \u2022 NO MERCY" },
};

/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */

function rects() {
  return LAYOUTS[state.layout];
}

function panelRect(i, W, H) {
  const r = rects()[i];
  return { x: r.x * W, y: r.y * H, w: r.w * W, h: r.h * H };
}

function drawPhoto(c, panel, r) {
  const img = panel.img;
  if (!img || !img.naturalWidth) {
    const g = c.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    g.addColorStop(0, "#3a1a5e");
    g.addColorStop(1, "#160a24");
    c.fillStyle = g;
    c.fillRect(r.x, r.y, r.w, r.h);
    c.fillStyle = "rgba(244,236,255,0.55)";
    c.font = `600 ${Math.max(14, r.w * 0.03)}px system-ui, sans-serif`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText("NO PHOTO YET", r.x + r.w / 2, r.y + r.h / 2);
    return;
  }
  const base = Math.max(r.w / img.naturalWidth, r.h / img.naturalHeight);
  const s = base * panel.zoom;
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  const dx = r.x + (r.w - dw) / 2 + panel.ox * r.w;
  const dy = r.y + (r.h - dh) / 2 + panel.oy * r.h;
  c.drawImage(img, dx, dy, dw, dh);
}

function drawOverlay(c, r) {
  const g = GRADES[state.grade];
  if (!g.overlay) return;
  const grad = c.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  grad.addColorStop(0, g.overlay[0]);
  grad.addColorStop(1, g.overlay[1]);
  c.save();
  c.globalAlpha = g.alpha;
  c.globalCompositeOperation = "overlay";
  c.fillStyle = grad;
  c.fillRect(r.x, r.y, r.w, r.h);
  c.restore();
}

function drawVignette(c, W, H) {
  const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.28)");
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

function drawCaption(c, W, H) {
  const title = (state.title || "").toUpperCase();
  const subtitle = (state.subtitle || "").toUpperCase();
  if (!title && !subtitle) return;
  const cx = W / 2;
  const baseY = H * 0.88;
  c.save();
  c.translate(cx, baseY);
  c.rotate(-0.045);
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  if (state.shadow) {
    c.shadowColor = "rgba(0,0,0,0.65)";
    c.shadowBlur = Math.round(W * 0.012);
    c.shadowOffsetY = Math.round(W * 0.006);
  }
  try { c.letterSpacing = `${Math.round(W * 0.004)}px`; } catch (e) { /* older canvas */ }
  if (title) {
    const size = Math.round(W * (state.font === "Anton" ? 0.085 : 0.095));
    c.font = `${size}px "${state.font}", "Anton", sans-serif`;
    if (state.outline) {
      c.lineWidth = Math.max(4, Math.round(size * 0.16));
      c.lineJoin = "round";
      c.strokeStyle = "#0d0616";
      c.strokeText(title, 0, 0);
    }
    c.fillStyle = state.ink;
    c.fillText(title, 0, 0);
  }
  if (subtitle) {
    const size = Math.round(W * 0.028);
    c.font = `600 ${size}px "Bebas Neue", "Anton", sans-serif`;
    if (state.outline) {
      c.lineWidth = Math.max(2, Math.round(size * 0.14));
      c.lineJoin = "round";
      c.strokeStyle = "#0d0616";
      c.strokeText(subtitle, 0, Math.round(W * 0.05));
    }
    c.fillStyle = state.ink;
    c.fillText(subtitle, 0, Math.round(W * 0.05));
  }
  c.restore();
}

function render(c, W, H) {
  const g = GRADES[state.grade];
  c.clearRect(0, 0, W, H);
  c.fillStyle = "#0d0616";
  c.fillRect(0, 0, W, H);
  const list = rects();
  try { c.filter = g.filter; } catch (e) { /* filter unsupported */ }
  for (let i = 0; i < list.length; i++) {
    drawPhoto(c, state.panels[i], panelRect(i, W, H));
  }
  try { c.filter = "none"; } catch (e) { /* noop */ }
  for (let i = 0; i < list.length; i++) {
    drawOverlay(c, panelRect(i, W, H));
  }
  // Panel dividers.
  c.strokeStyle = "rgba(13,6,22,0.9)";
  c.lineWidth = Math.max(2, Math.round(W * 0.004));
  for (let i = 0; i < list.length; i++) {
    const r = panelRect(i, W, H);
    c.strokeRect(r.x, r.y, r.w, r.h);
  }
  drawVignette(c, W, H);
  drawCaption(c, W, H);
}

function renderStage() {
  render(ctx, canvas.width, canvas.height);
  const n = rects().length;
  $("panel-label").textContent = `Panel ${state.selected + 1} of ${n} selected`;
  const hint = $("stage-hint");
  const anyPhoto = state.panels.some((p) => p.img);
  hint.style.display = anyPhoto ? "none" : "block";
  const p = state.panels[state.selected];
  $("zoom").value = String(p.zoom);
  $("zoom-out").textContent = `${p.zoom.toFixed(2)}\u00d7`;
  $("panx").value = String(p.ox);
  $("panx-out").textContent = p.ox.toFixed(2);
  $("pany").value = String(p.oy);
  $("pany-out").textContent = p.oy.toFixed(2);
}

function resizeStage() {
  const [w, h] = state.size.split("x").map(Number);
  const scale = 900 / w;
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  $("size-label").textContent = `Canvas ${w} \u00d7 ${h}`;
}

/* ------------------------------------------------------------------ */
/* Photos                                                              */
/* ------------------------------------------------------------------ */

const imageCache = new Map();

function loadImage(src) {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { imageCache.set(src, img); resolve(img); };
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function setPanelPhoto(i, src) {
  const img = await loadImage(src);
  const p = state.panels[i];
  p.img = img;
  p.src = src;
  p.zoom = 1;
  p.ox = 0;
  p.oy = 0;
  renderStage();
}

async function loadSample(key) {
  await setPanelPhoto(state.selected, SAMPLES[key]);
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("could not read file"));
    r.readAsDataURL(file);
  });
}

async function handleFiles(files) {
  const file = files && files[0];
  if (!file || !file.type.startsWith("image/")) return;
  const url = await fileToDataURL(file);
  await setPanelPhoto(state.selected, url);
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

function exportPNG() {
  const [w, h] = state.size.split("x").map(Number);
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const c = off.getContext("2d");
  render(c, w, h);
  return { dataUrl: off.toDataURL("image/png"), w, h };
}

function showExport() {
  const { dataUrl, w, h } = exportPNG();
  $("preview-img").src = dataUrl;
  $("preview-meta").textContent = `PNG ${w} \u00d7 ${h} \u00b7 ${state.layout} layout \u00b7 ${state.grade} grade`;
  const dl = $("download");
  dl.href = dataUrl;
  dl.download = `neon-vice-cover-${state.size}.png`;
  $("modal").hidden = false;
  window.__cover.lastExport = { w, h, bytes: dataUrl.length };
}

/* ------------------------------------------------------------------ */
/* Pointer interaction on the canvas                                   */
/* ------------------------------------------------------------------ */

function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  const list = rects();
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
  }
  return 0;
}

let drag = null;

canvas.addEventListener("pointerdown", (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i !== state.selected) {
    state.selected = i;
    renderStage();
  }
  drag = { x: e.clientX, y: e.clientY, ox: state.panels[i].ox, oy: state.panels[i].oy };
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const p = state.panels[state.selected];
  p.ox = Math.max(-0.5, Math.min(0.5, drag.ox + (e.clientX - drag.x) / rect.width));
  p.oy = Math.max(-0.5, Math.min(0.5, drag.oy + (e.clientY - drag.y) / rect.height));
  renderStage();
});

canvas.addEventListener("pointerup", () => { drag = null; });
canvas.addEventListener("pointercancel", () => { drag = null; });

canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const p = state.panels[state.selected];
  p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  renderStage();
}, { passive: false });

/* Drag & drop onto the stage. */
const dropzone = $("dropzone");
dropzone.addEventListener("dragover", (e) => { e.preventDefault(); });
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  state.selected = panelAt(e.clientX, e.clientY);
  handleFiles(e.dataTransfer.files).catch(() => {});
});

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

function bindSeg(id, key, onChange) {
  $(id).addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-" + key + "]");
    if (!btn) return;
    for (const b of $(id).querySelectorAll("button")) b.classList.remove("active");
    btn.classList.add("active");
    onChange(btn.dataset[key]);
  });
}

bindSeg("layout-seg", "layout", (v) => {
  state.layout = v;
  state.selected = 0;
  renderStage();
});
bindSeg("grade-seg", "grade", (v) => {
  state.grade = v;
  renderStage();
});

$("upload").addEventListener("change", (e) => {
  handleFiles(e.target.files).catch(() => {});
  e.target.value = "";
});
$("sample-sunset").addEventListener("click", () => loadSample("sunset").catch(() => {}));
$("sample-skyline").addEventListener("click", () => loadSample("skyline").catch(() => {}));

$("zoom").addEventListener("input", (e) => {
  state.panels[state.selected].zoom = Number(e.target.value);
  renderStage();
});
$("panx").addEventListener("input", (e) => {
  state.panels[state.selected].ox = Number(e.target.value);
  renderStage();
});
$("pany").addEventListener("input", (e) => {
  state.panels[state.selected].oy = Number(e.target.value);
  renderStage();
});
$("reset-panel").addEventListener("click", () => {
  const p = state.panels[state.selected];
  p.zoom = 1; p.ox = 0; p.oy = 0;
  renderStage();
});

$("title").addEventListener("input", (e) => { state.title = e.target.value; renderStage(); });
$("subtitle").addEventListener("input", (e) => { state.subtitle = e.target.value; renderStage(); });
$("font").addEventListener("change", (e) => { state.font = e.target.value; renderStage(); });
$("inks").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-ink]");
  if (!btn) return;
  for (const b of $("inks").querySelectorAll("button")) b.classList.remove("active");
  btn.classList.add("active");
  state.ink = btn.dataset.ink;
  renderStage();
});
$("outline").addEventListener("change", (e) => { state.outline = e.target.checked; renderStage(); });
$("shadow").addEventListener("change", (e) => { state.shadow = e.target.checked; renderStage(); });

$("size").addEventListener("change", (e) => {
  state.size = e.target.value;
  resizeStage();
  renderStage();
});

$("export").addEventListener("click", showExport);
$("close-modal").addEventListener("click", () => { $("modal").hidden = true; });
$("modal").addEventListener("click", (e) => {
  if (e.target === $("modal")) $("modal").hidden = true;
});

/* ------------------------------------------------------------------ */
/* Scene presets + boot                                               */
/* ------------------------------------------------------------------ */

async function applyScene(n) {
  const s = SCENES[n];
  if (!s) return;
  state.layout = s.layout;
  state.grade = s.grade;
  state.title = s.title;
  state.subtitle = s.subtitle;
  state.selected = 0;
  for (const b of $("layout-seg").querySelectorAll("button")) {
    b.classList.toggle("active", b.dataset.layout === s.layout);
  }
  for (const b of $("grade-seg").querySelectorAll("button")) {
    b.classList.toggle("active", b.dataset.grade === s.grade);
  }
  $("title").value = s.title;
  $("subtitle").value = s.subtitle;
  // Fill every panel of the layout with the scene photo.
  const jobs = [];
  for (let i = 0; i < rects().length; i++) jobs.push(setPanelPhoto(i, SAMPLES[s.sample]));
  await Promise.all(jobs);
  renderStage();
}

window.__cover = {
  state,
  render: renderStage,
  exportPNG,
  loadSample,
  applyScene,
  setLayout(v) { state.layout = v; state.selected = 0; renderStage(); },
  setGrade(v) { state.grade = v; renderStage(); },
  lastExport: null,
};

resizeStage();
renderStage();

const params = new URLSearchParams(location.search);
const scene = Number(params.get("scene") || 0);
if (scene >= 1 && scene <= 4) {
  applyScene(scene).catch(() => {});
} else {
  loadSample("sunset").catch(() => {});
}
