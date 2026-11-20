'use strict';

// Neon Vice Cover Studio — turns a photo and a caption into multi-panel
// GTA-style cover art and exports it as a PNG. Everything runs locally;
// photos never leave the machine.

const el = (id) => document.getElementById(id);
const canvas = el('coverCanvas');
const ctx = canvas.getContext('2d');

const GAP = 0.012;

const LAYOUTS = {
  solo: [{ x: 0, y: 0, w: 1, h: 1 }],
  duo: [
    { x: 0, y: 0, w: 0.56, h: 1 },
    { x: 0.572, y: 0, w: 0.428, h: 1 },
  ],
  trio: [
    { x: 0, y: 0, w: 1, h: 0.62 },
    { x: 0, y: 0.632, w: 0.494, h: 0.368 },
    { x: 0.506, y: 0.632, w: 0.494, h: 0.368 },
  ],
  quad: [
    { x: 0, y: 0, w: 0.494, h: 0.494 },
    { x: 0.506, y: 0, w: 0.494, h: 0.494 },
    { x: 0, y: 0.506, w: 0.494, h: 0.494 },
    { x: 0.506, y: 0.506, w: 0.494, h: 0.494 },
  ],
};

function defaultCrops(layout) {
  if (layout === 'solo') return [{ x: 0, y: -0.04, z: 1.12 }];
  if (layout === 'duo') return [
    { x: -0.1, y: 0, z: 1.35 },
    { x: 0.1, y: -0.04, z: 1.35 },
  ];
  if (layout === 'quad') return [
    { x: -0.1, y: -0.08, z: 1.45 },
    { x: 0.1, y: -0.08, z: 1.45 },
    { x: -0.1, y: 0.08, z: 1.45 },
    { x: 0.1, y: 0.08, z: 1.45 },
  ];
  return [
    { x: 0, y: -0.08, z: 1.18 },
    { x: -0.12, y: 0.06, z: 1.45 },
    { x: 0.12, y: 0.06, z: 1.45 },
  ];
}

const GRADES = {
  sunset: {
    filter: 'saturate(1.28) contrast(1.08) brightness(1.03)',
    overlays: [
      { kind: 'linear', from: 'rgba(255,150,60,0.20)', to: 'rgba(255,45,120,0.22)', blend: 'overlay' },
      { kind: 'fill', color: 'rgba(255,122,0,0.10)', blend: 'soft-light' },
    ],
    vignette: 0.32,
  },
  neon: {
    filter: 'saturate(1.55) contrast(1.16)',
    overlays: [
      { kind: 'linear', from: 'rgba(0,229,255,0.22)', to: 'rgba(255,0,168,0.22)', blend: 'overlay' },
      { kind: 'fill', color: 'rgba(122,0,255,0.07)', blend: 'screen' },
    ],
    vignette: 0.30,
  },
  vice: {
    filter: 'saturate(1.18) contrast(1.06) sepia(0.18)',
    overlays: [
      { kind: 'linear', from: 'rgba(0,180,180,0.20)', to: 'rgba(128,0,255,0.20)', blend: 'soft-light' },
    ],
    vignette: 0.34,
  },
  noir: {
    filter: 'grayscale(1) contrast(1.22) brightness(1.06)',
    overlays: [],
    vignette: 0.42,
  },
};

const SCENES = {
  '1': { layout: 'solo', grade: 'sunset', photo: 'samples/beach.jpg', photoName: 'Beach sample', title: 'SUNSET HEIST', subtitle: 'VICE CITY \u2022 EST. 2026', font: 'anton', color: '#ffd23f', size: '1080x1080' },
  '2': { layout: 'trio', grade: 'neon', photo: 'samples/city.jpg', photoName: 'City sample', title: 'NEON SHORE', subtitle: 'DRIVE ALL NIGHT', font: 'anton', color: '#00e5ff', size: '1080x1350' },
  '3': { layout: 'quad', grade: 'vice', photo: 'samples/beach.jpg', photoName: 'Beach sample', title: 'VICE CITY', subtitle: 'SAND \u2022 NEON \u2022 NOISE', font: 'bebas', color: '#ff2d78', size: '1080x1080' },
  '4': { layout: 'duo', grade: 'noir', photo: 'samples/city.jpg', photoName: 'City sample', title: 'MIDNIGHT DRIVE', subtitle: 'NO TURNING BACK', font: 'anton', color: '#ffffff', size: '1920x1080', preview: true },
};

const state = {
  photo: null,
  photoName: 'No photo yet',
  layout: 'trio',
  grade: 'sunset',
  title: 'SUNSET HEIST',
  subtitle: 'VICE CITY \u2022 EST. 2026',
  titleFont: 'anton',
  titleColor: '#ffd23f',
  size: '1080x1080',
  panels: defaultCrops('trio'),
  selected: 0,
  loadToken: 0,
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function panelRects(W, H) {
  return LAYOUTS[state.layout].map((r) => ({
    x: r.x * W,
    y: r.y * H,
    w: r.w * W,
    h: r.h * H,
  }));
}

function drawPhotoInPanel(c, rect, crop) {
  const img = state.photo;
  const grade = GRADES[state.grade];
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * crop.z;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const maxX = Math.max(0, (dw - rect.w) / 2 / rect.w);
  const maxY = Math.max(0, (dh - rect.h) / 2 / rect.h);
  crop.x = clamp(crop.x, -maxX, maxX);
  crop.y = clamp(crop.y, -maxY, maxY);
  const dx = rect.x + (rect.w - dw) / 2 + crop.x * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + crop.y * rect.h;
  c.save();
  c.beginPath();
  c.rect(rect.x, rect.y, rect.w, rect.h);
  c.clip();
  c.filter = grade.filter;
  c.drawImage(img, dx, dy, dw, dh);
  c.filter = 'none';
  for (const ov of grade.overlays) {
    c.save();
    c.globalCompositeOperation = ov.blend;
    if (ov.kind === 'linear') {
      const g = c.createLinearGradient(rect.x, rect.y, rect.x + rect.w * 0.35, rect.y + rect.h);
      g.addColorStop(0, ov.from);
      g.addColorStop(1, ov.to);
      c.fillStyle = g;
    } else {
      c.fillStyle = ov.color;
    }
    c.fillRect(rect.x, rect.y, rect.w, rect.h);
    c.restore();
  }
  c.restore();
}

function fitFont(c, text, family, startPx, maxWidth) {
  let px = startPx;
  c.font = `${px}px ${family}`;
  while (px > 24 && c.measureText(text).width > maxWidth) {
    px -= 2;
    c.font = `${px}px ${family}`;
  }
  return px;
}

function drawLettering(c, W, H) {
  const pad = W * 0.045;
  const title = state.title.trim() || 'UNTITLED';
  const family = state.titleFont === 'bebas' ? '"Bebas Neue", sans-serif' : 'Anton, "Arial Black", sans-serif';
  const band = c.createLinearGradient(0, H * 0.58, 0, H);
  band.addColorStop(0, 'rgba(4,4,12,0)');
  band.addColorStop(1, 'rgba(4,4,12,0.78)');
  c.fillStyle = band;
  c.fillRect(0, H * 0.58, W, H * 0.42);

  const subPx = Math.round(W * 0.03);
  const titlePx = fitFont(c, title.toUpperCase(), family, Math.round(W * 0.105), W - pad * 2);
  const subBaseline = H - W * 0.035;
  const titleBaseline = subBaseline - subPx * 1.5;
  const kickBaseline = titleBaseline - titlePx * 1.02;

  c.save();
  c.translate(pad, titleBaseline);
  c.rotate(-0.025);
  try { c.letterSpacing = `${Math.round(W * 0.012)}px`; } catch (e) { /* older canvas */ }
  const kickPx = Math.round(W * 0.028);
  c.font = `${kickPx}px "Bebas Neue", sans-serif`;
  c.fillStyle = '#ffd23f';
  c.textBaseline = 'alphabetic';
  c.fillText('N E O N   V I C E', 0, kickBaseline - titleBaseline);
  c.font = `${titlePx}px ${family}`;
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = titlePx * 0.08;
  c.shadowOffsetY = titlePx * 0.03;
  c.lineJoin = 'round';
  c.strokeStyle = '#0d0d18';
  c.lineWidth = Math.max(3, titlePx * 0.09);
  c.strokeText(title.toUpperCase(), 0, 0);
  c.fillStyle = state.titleColor;
  c.fillText(title.toUpperCase(), 0, 0);
  c.shadowColor = 'transparent';
  c.shadowBlur = 0;
  c.shadowOffsetY = 0;
  const sub = state.subtitle.trim();
  if (sub) {
    c.font = `${subPx}px "Bebas Neue", sans-serif`;
    try { c.letterSpacing = `${Math.round(W * 0.008)}px`; } catch (e) { /* older canvas */ }
    c.fillStyle = '#ffffff';
    c.fillText(sub.toUpperCase(), 0, subBaseline - titleBaseline);
  }
  try { c.letterSpacing = '0px'; } catch (e) { /* older canvas */ }
  c.restore();
}

function drawVignette(c, W, H) {
  const g = c.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${GRADES[state.grade].vignette})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

function drawScene(c, W, H, forExport) {
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#07070f';
  c.fillRect(0, 0, W, H);
  if (!state.photo) {
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#1b1b33');
    g.addColorStop(1, '#3a1040');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#f2f2fa';
    c.textAlign = 'center';
    c.font = `${Math.round(W * 0.05)}px Anton, sans-serif`;
    c.fillText('LOAD A PHOTO TO START', W / 2, H / 2);
    c.textAlign = 'left';
    return;
  }
  const rects = panelRects(W, H);
  rects.forEach((rect, i) => {
    drawPhotoInPanel(c, rect, state.panels[i]);
    c.strokeStyle = '#05050c';
    c.lineWidth = Math.max(2, W * 0.004);
    c.strokeRect(rect.x, rect.y, rect.w, rect.h);
  });
  drawVignette(c, W, H);
  drawLettering(c, W, H);
  if (!forExport) {
    const sel = rects[state.selected];
    if (sel) {
      c.save();
      c.strokeStyle = '#00e5ff';
      c.lineWidth = Math.max(3, W * 0.006);
      c.shadowColor = 'rgba(0,229,255,0.8)';
      c.shadowBlur = W * 0.012;
      c.strokeRect(sel.x, sel.y, sel.w, sel.h);
      c.restore();
    }
  }
}

function render() {
  drawScene(ctx, canvas.width, canvas.height, false);
}

function setSize(size) {
  state.size = size;
  const [w, h] = size.split('x').map(Number);
  canvas.width = w;
  canvas.height = h;
  document.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('active', b.dataset.size === size));
  render();
}

function setLayout(layout) {
  state.layout = layout;
  state.panels = defaultCrops(layout);
  state.selected = 0;
  document.querySelectorAll('.layout-btn').forEach((b) => b.classList.toggle('active', b.dataset.layout === layout));
  syncPanelControls();
  render();
}

function setGrade(grade) {
  state.grade = grade;
  document.querySelectorAll('.grade-btn').forEach((b) => b.classList.toggle('active', b.dataset.grade === grade));
  render();
}

function syncPanelControls() {
  const crop = state.panels[state.selected];
  el('panelLabel').textContent = `Panel ${state.selected + 1} of ${state.panels.length}`;
  el('zoomRange').value = String(crop.z);
  el('panXRange').value = String(crop.x);
  el('panYRange').value = String(crop.y);
}

function loadPhoto(src, name) {
  const token = ++state.loadToken;
  const img = new Image();
  img.onload = () => {
    if (token !== state.loadToken) return;
    state.photo = img;
    state.photoName = name;
    el('photoName').textContent = name;
    el('hint').textContent = 'Drag a panel to move the photo, scroll to zoom, click a panel to select it.';
    render();
  };
  img.onerror = () => {
    if (token !== state.loadToken) return;
    el('photoName').textContent = `Could not load ${name}.`;
  };
  img.src = src;
  return img;
}

function loadUserPhoto(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => loadPhoto(String(reader.result), file.name);
  reader.readAsDataURL(file);
}

function exportPNG(options) {
  const opts = options || {};
  const [w, h] = state.size.split('x').map(Number);
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const offCtx = off.getContext('2d');
  drawScene(offCtx, w, h, true);
  off.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    if (opts.download !== false) {
      const a = document.createElement('a');
      a.href = url;
      a.download = 'neon-vice-cover.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    const img = el('previewImg');
    img.src = url;
    const dl = el('previewDownload');
    dl.href = url;
    el('previewModal').hidden = false;
  }, 'image/png');
}

function applyScene(scene) {
  setSize(scene.size);
  setLayout(scene.layout);
  setGrade(scene.grade);
  state.title = scene.title;
  state.subtitle = scene.subtitle;
  state.titleFont = scene.font;
  state.titleColor = scene.color;
  el('titleInput').value = scene.title;
  el('subtitleInput').value = scene.subtitle;
  el('fontSelect').value = scene.font;
  document.querySelectorAll('.color-btn').forEach((b) => b.classList.toggle('active', b.dataset.color === scene.color));
  loadPhoto(scene.photo, scene.photoName);
  return scene;
}

function bindControls() {
  el('photoInput').addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) loadUserPhoto(file);
    e.target.value = '';
  });
  el('sampleBeach').addEventListener('click', () => loadPhoto('samples/beach.jpg', 'Beach sample'));
  el('sampleCity').addEventListener('click', () => loadPhoto('samples/city.jpg', 'City sample'));

  document.querySelectorAll('.layout-btn').forEach((b) => b.addEventListener('click', () => setLayout(b.dataset.layout)));
  document.querySelectorAll('.grade-btn').forEach((b) => b.addEventListener('click', () => setGrade(b.dataset.grade)));
  document.querySelectorAll('.size-btn').forEach((b) => b.addEventListener('click', () => setSize(b.dataset.size)));
  document.querySelectorAll('.color-btn').forEach((b) => b.addEventListener('click', () => {
    state.titleColor = b.dataset.color;
    document.querySelectorAll('.color-btn').forEach((x) => x.classList.toggle('active', x === b));
    render();
  }));

  el('titleInput').addEventListener('input', (e) => { state.title = e.target.value; render(); });
  el('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  el('fontSelect').addEventListener('change', (e) => { state.titleFont = e.target.value; render(); });

  el('zoomRange').addEventListener('input', (e) => {
    state.panels[state.selected].z = Number(e.target.value);
    render();
  });
  el('panXRange').addEventListener('input', (e) => {
    state.panels[state.selected].x = Number(e.target.value);
    render();
  });
  el('panYRange').addEventListener('input', (e) => {
    state.panels[state.selected].y = Number(e.target.value);
    render();
  });
  el('resetPanel').addEventListener('click', () => {
    state.panels[state.selected] = defaultCrops(state.layout)[state.selected];
    syncPanelControls();
    render();
  });

  el('exportBtn').addEventListener('click', () => exportPNG({ download: true }));
  el('previewClose').addEventListener('click', () => { el('previewModal').hidden = true; });
  el('previewModal').addEventListener('click', (e) => {
    if (e.target === el('previewModal')) el('previewModal').hidden = true;
  });

  const zone = el('dropZone');
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragging'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragging');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadUserPhoto(file);
  });

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (!state.photo) return;
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    const rects = panelRects(canvas.width, canvas.height);
    const hit = rects.findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
    if (hit >= 0) {
      state.selected = hit;
      syncPanelControls();
      render();
    }
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !state.photo) return;
    const rect = canvas.getBoundingClientRect();
    const rects = panelRects(canvas.width, canvas.height);
    const sel = rects[state.selected];
    const crop = state.panels[state.selected];
    crop.x += (e.clientX - lastX) / rect.width * (canvas.width / sel.w);
    crop.y += (e.clientY - lastY) / rect.height * (canvas.height / sel.h);
    lastX = e.clientX;
    lastY = e.clientY;
    syncPanelControls();
    render();
  });
  const stopDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);
  canvas.addEventListener('wheel', (e) => {
    if (!state.photo) return;
    e.preventDefault();
    const crop = state.panels[state.selected];
    crop.z = clamp(crop.z * Math.exp(-e.deltaY * 0.0012), 1, 3);
    syncPanelControls();
    render();
  }, { passive: false });
}

function init() {
  bindControls();
  setSize(state.size);
  setLayout(state.layout);
  setGrade(state.grade);
  document.querySelectorAll('.color-btn').forEach((b) => b.classList.toggle('active', b.dataset.color === state.titleColor));
  const params = new URLSearchParams(window.location.search);
  const scene = SCENES[params.get('scene') || ''] || SCENES['1'];
  const chosen = applyScene(scene);
  const boot = () => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => render()).catch(() => render());
    }
    render();
    if (chosen.preview) {
      setTimeout(() => exportPNG({ download: false }), 600);
    }
  };
  if (document.fonts) {
    Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('40px "Bebas Neue"'),
    ]).then(boot).catch(boot);
  } else {
    boot();
  }
  window.__cover = { state, render, exportPNG, loadPhoto, setLayout, setGrade, setSize };
}

init();
