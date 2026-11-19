// Neon Vice Cover Studio — editor wiring and screenshot scenes.
//
// Loads the user's photos (or the built-in samples), drives the live
// preview canvas from the cover renderer, and exports PNGs. It also serves
// the screenshot scenes the maker uses: ?shot=cover draws one exported
// cover full-frame, ?shot=editor opens the editor with a sample photo
// already loaded. Everything runs offline; photos never leave the machine.

import {
  LAYOUTS, GRADES, SIZES,
  drawCover, defaultState, panelRectsForLayout,
} from './cover.js';

const $ = (id) => document.getElementById(id);
const state = defaultState();
const photos = []; // HTMLImageElements, in load order
const photoNames = [];
let selectedPanel = 0;
let previewScale = 1;

const preview = $('preview');
const pctx = preview.getContext('2d');

function sampleUrl(name) {
  return `samples/${name}.jpg`;
}

function loadPhotoFromUrl(url, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      photos.push(img);
      photoNames.push(name);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function loadPhotoFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        photos.push(img);
        photoNames.push(file.name.replace(/\.[^.]+$/, ''));
        resolve(img);
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function loadSamples() {
  photos.length = 0;
  photoNames.length = 0;
  await loadPhotoFromUrl(sampleUrl('pier'), 'Pier');
  await loadPhotoFromUrl(sampleUrl('boulevard'), 'Boulevard');
}

// Fit the preview canvas to the chosen export size, capped for the screen.
function sizePreview() {
  const size = SIZES[state.size];
  const box = $('previewBox');
  const availW = Math.max(320, box.clientWidth - 8);
  const availH = Math.max(240, window.innerHeight - 220);
  const scale = Math.min(availW / size.w, availH / size.h, 1);
  previewScale = scale;
  preview.width = Math.round(size.w * scale);
  preview.height = Math.round(size.h * scale);
  preview.style.width = `${preview.width}px`;
  preview.style.height = `${preview.height}px`;
}

function renderPreview() {
  if (!photos.length) return;
  sizePreview();
  drawCover(preview, state, photos);
  $('photoCount').textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'} loaded`;
  $('panelLabel').textContent = `Panel ${selectedPanel + 1} of ${panelRectsForLayout(state.layout, 100, 100, 1).length}`;
  syncPanelControls();
}

function syncPanelControls() {
  const panel = state.panels[selectedPanel] || { photo: 0, zoom: 1, panX: 0, panY: 0 };
  $('panelPhoto').value = String(Math.min(panel.photo || 0, photos.length - 1));
  $('panelZoom').value = String(panel.zoom || 1);
  $('zoomVal').textContent = `${Math.round((panel.zoom || 1) * 100)}%`;
}

function rebuildPanelPhotoOptions() {
  const sel = $('panelPhoto');
  sel.innerHTML = '';
  photoNames.forEach((name, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${i + 1}. ${name}`;
    sel.appendChild(opt);
  });
}

function buildPickers() {
  const layoutBox = $('layoutPicker');
  Object.entries(LAYOUTS).forEach(([id, info]) => {
    const b = document.createElement('button');
    b.className = 'pick';
    b.dataset.value = id;
    b.textContent = info.name;
    b.addEventListener('click', () => {
      state.layout = id;
      selectedPanel = 0;
      markPicked(layoutBox, id);
      renderPreview();
    });
    layoutBox.appendChild(b);
  });
  const gradeBox = $('gradePicker');
  Object.entries(GRADES).forEach(([id, info]) => {
    const b = document.createElement('button');
    b.className = 'pick';
    b.dataset.value = id;
    b.textContent = info.name;
    b.addEventListener('click', () => {
      state.grade = id;
      markPicked(gradeBox, id);
      renderPreview();
    });
    gradeBox.appendChild(b);
  });
  const sizeBox = $('sizePicker');
  Object.entries(SIZES).forEach(([id, info]) => {
    const b = document.createElement('button');
    b.className = 'pick';
    b.dataset.value = id;
    b.textContent = info.label;
    b.addEventListener('click', () => {
      state.size = id;
      markPicked(sizeBox, id);
      renderPreview();
    });
    sizeBox.appendChild(b);
  });
  markPicked(layoutBox, state.layout);
  markPicked(gradeBox, state.grade);
  markPicked(sizeBox, state.size);
}

function markPicked(box, value) {
  box.querySelectorAll('.pick').forEach((b) => {
    b.classList.toggle('on', b.dataset.value === value);
  });
}

// Click a panel in the preview to select it; drag it to pan the photo.
function wirePreviewPointer() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let moved = false;

  function panelAt(clientX, clientY) {
    const box = preview.getBoundingClientRect();
    const x = (clientX - box.left) / previewScale;
    const y = (clientY - box.top) / previewScale;
    const size = SIZES[state.size];
    const rects = panelRectsForLayout(state.layout, size.w, size.h, Math.max(4, Math.round(Math.min(size.w, size.h) * 0.008)));
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
    }
    return 0;
  }

  preview.addEventListener('pointerdown', (e) => {
    dragging = true;
    moved = false;
    lastX = e.clientX;
    lastY = e.clientY;
    preview.setPointerCapture(e.pointerId);
  });
  preview.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = (e.clientX - lastX) / previewScale;
    const dy = (e.clientY - lastY) / previewScale;
    lastX = e.clientX;
    lastY = e.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
    const size = SIZES[state.size];
    const panel = state.panels[selectedPanel];
    panel.panX = Math.max(-0.5, Math.min(0.5, (panel.panX || 0) + dx / size.w));
    panel.panY = Math.max(-0.5, Math.min(0.5, (panel.panY || 0) + dy / size.h));
    renderPreview();
  });
  preview.addEventListener('pointerup', (e) => {
    dragging = false;
    if (!moved) {
      selectedPanel = panelAt(e.clientX, e.clientY);
      renderPreview();
    }
  });
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = state.panels[selectedPanel];
    const next = (panel.zoom || 1) * (e.deltaY < 0 ? 1.08 : 0.93);
    panel.zoom = Math.max(1, Math.min(3, next));
    renderPreview();
  }, { passive: false });
}

function wireControls() {
  $('fileInput').addEventListener('change', async (e) => {
    const files = [...e.target.files].filter((f) => f.type.startsWith('image/'));
    for (const f of files) await loadPhotoFromFile(f);
    rebuildPanelPhotoOptions();
    renderPreview();
    e.target.value = '';
  });
  $('dropZone').addEventListener('click', () => $('fileInput').click());
  $('dropZone').addEventListener('dragover', (e) => e.preventDefault());
  $('dropZone').addEventListener('drop', async (e) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    for (const f of files) await loadPhotoFromFile(f);
    rebuildPanelPhotoOptions();
    renderPreview();
  });
  $('loadSamples').addEventListener('click', async () => {
    await loadSamples();
    rebuildPanelPhotoOptions();
    renderPreview();
  });
  $('titleInput').addEventListener('input', (e) => {
    state.title = e.target.value;
    renderPreview();
  });
  $('subtitleInput').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    renderPreview();
  });
  $('frameToggle').addEventListener('change', (e) => {
    state.frame = e.target.checked;
    renderPreview();
  });
  $('grainToggle').addEventListener('change', (e) => {
    state.grain = e.target.checked;
    renderPreview();
  });
  $('panelPhoto').addEventListener('change', (e) => {
    state.panels[selectedPanel].photo = Number(e.target.value);
    renderPreview();
  });
  $('panelZoom').addEventListener('input', (e) => {
    state.panels[selectedPanel].zoom = Number(e.target.value);
    renderPreview();
  });
  $('exportOne').addEventListener('click', () => exportCover(state.size));
  $('exportAll').addEventListener('click', async () => {
    for (const id of Object.keys(SIZES)) {
      await exportCover(id);
      await new Promise((r) => setTimeout(r, 350));
    }
  });
}

function exportCover(sizeId) {
  return new Promise((resolve) => {
    const size = SIZES[sizeId];
    const canvas = document.createElement('canvas');
    canvas.width = size.w;
    canvas.height = size.h;
    const saved = state.size;
    state.size = sizeId;
    drawCover(canvas, state, photos);
    state.size = saved;
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cover-${sizeId}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, 'image/png');
  });
}

async function waitForFonts() {
  try {
    await Promise.all([
      document.fonts.load('80px Anton'),
      document.fonts.load('40px Pacifico'),
    ]);
    await document.fonts.ready;
  } catch (err) {
    // Fall back to system fonts; the cover still draws.
  }
}

// Screenshot scenes, driven by ?shot=.
//   ?shot=cover&photo=pier&caption=SUNSET%20HEIST&layout=hero3&grade=sunset&size=1920x1080
//   ?shot=editor&photo=boulevard&caption=BOULEVARD%20QUEEN
async function runShotMode(params) {
  const shot = params.get('shot');
  const caption = params.get('caption');
  if (caption) {
    state.title = caption.toUpperCase();
    $('titleInput').value = state.title;
  }
  const subtitle = params.get('subtitle');
  if (subtitle) {
    state.subtitle = subtitle;
    $('subtitleInput').value = subtitle;
  }
  const layout = params.get('layout');
  if (layout && LAYOUTS[layout]) state.layout = layout;
  const grade = params.get('grade');
  if (grade && GRADES[grade]) state.grade = grade;
  const size = params.get('size');
  if (size && SIZES[size]) state.size = size;

  const photo = params.get('photo') || 'pier';
  await loadPhotoFromUrl(sampleUrl(photo), photo);
  if (params.get('photo2')) {
    await loadPhotoFromUrl(sampleUrl(params.get('photo2')), params.get('photo2'));
  }
  await waitForFonts();

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const sizeInfo = SIZES[state.size];
    const canvas = $('shotCanvas');
    canvas.width = sizeInfo.w;
    canvas.height = sizeInfo.h;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.objectFit = 'contain';
    drawCover(canvas, state, photos);
    document.title = `Cover — ${state.title}`;
  } else {
    rebuildPanelPhotoOptions();
    renderPreview();
    document.title = `Editor — ${state.title}`;
  }
  document.documentElement.setAttribute('data-ready', '1');
}

async function boot() {
  buildPickers();
  wireControls();
  wirePreviewPointer();
  const params = new URLSearchParams(window.location.search);
  if (params.get('shot')) {
    await runShotMode(params);
    return;
  }
  await loadSamples();
  await waitForFonts();
  rebuildPanelPhotoOptions();
  renderPreview();
  window.addEventListener('resize', renderPreview);
  document.documentElement.setAttribute('data-ready', '1');
}

boot();
