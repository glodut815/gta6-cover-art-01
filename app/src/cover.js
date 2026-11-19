// Neon Vice Cover Studio — the cover renderer.
//
// Draws a GTA 6-style multi-panel poster on any 2D canvas: panel photos
// with a Vice City sunset or neon grade, bold Anton caption lettering with a
// Pacifico script subtitle, white panel gutters, film grain and a vignette.
// Pure canvas 2D, no dependencies, no network. Used by the editor for its
// live preview and by the exporter for the full-size PNGs.

export const LAYOUTS = {
  hero3: { name: 'Hero + 3', panels: 4 },
  grid4: { name: 'Four grid', panels: 4 },
  fullbleed: { name: 'Full bleed', panels: 1 },
  nine: { name: 'Nine grid', panels: 9 },
};

export const GRADES = {
  sunset: { name: 'Vice Sunset' },
  neon: { name: 'Neon Night' },
  gold: { name: 'Golden Hour' },
  noir: { name: 'Noir' },
  clean: { name: 'Clean' },
};

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square 1080 × 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait 1080 × 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide 1920 × 1080' },
};

// A gradient map is a list of [position 0..1, r, g, b] stops. A pixel's
// luminance picks its colour by lerping between the two nearest stops.
const GRADE_STOPS = {
  sunset: [
    [0.0, 14, 6, 38],
    [0.25, 74, 18, 82],
    [0.5, 178, 44, 96],
    [0.75, 255, 122, 64],
    [1.0, 255, 214, 140],
  ],
  neon: [
    [0.0, 2, 16, 26],
    [0.3, 6, 74, 84],
    [0.55, 15, 181, 168],
    [0.8, 255, 79, 216],
    [1.0, 255, 190, 235],
  ],
  gold: [
    [0.0, 12, 8, 4],
    [0.3, 84, 52, 14],
    [0.6, 198, 128, 34],
    [0.85, 255, 196, 96],
    [1.0, 255, 244, 200],
  ],
  noir: [
    [0.0, 0, 0, 0],
    [0.2, 34, 30, 30],
    [0.5, 128, 122, 118],
    [0.8, 214, 208, 200],
    [1.0, 255, 250, 244],
  ],
  clean: null, // identity: only a gentle warm lift, applied separately
};

// Build a 256-entry RGB lookup table for one grade.
export function gradeLookup(gradeId) {
  const stops = GRADE_STOPS[gradeId];
  const table = new Uint8Array(256 * 3);
  if (!stops) {
    for (let i = 0; i < 256; i++) {
      table[i * 3] = i;
      table[i * 3 + 1] = i;
      table[i * 3 + 2] = i;
    }
    return table;
  }
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        a = stops[s];
        b = stops[s + 1];
        break;
      }
    }
    const span = b[0] - a[0] || 1;
    const f = Math.min(1, Math.max(0, (t - a[0]) / span));
    table[i * 3] = Math.round(a[1] + (b[1] - a[1]) * f);
    table[i * 3 + 1] = Math.round(a[2] + (b[2] - a[2]) * f);
    table[i * 3 + 2] = Math.round(a[3] + (b[3] - a[3]) * f);
  }
  return table;
}

// Panel rectangles for a layout, as fractions of the cover. Gutters are
// white, GTA poster style; `g` is the gutter in pixels at the target size.
export function panelRectsForLayout(layoutId, W, H, g) {
  const r = [];
  if (layoutId === 'hero3') {
    const split = Math.round(W * 0.62);
    r.push({ x: 0, y: 0, w: split - g, h: H });
    const rw = W - split - g;
    const rh = Math.round((H - 2 * g) / 3);
    for (let i = 0; i < 3; i++) {
      r.push({ x: split + g, y: i * (rh + g), w: rw, h: rh });
    }
  } else if (layoutId === 'grid4') {
    const cw = Math.round((W - g) / 2);
    const ch = Math.round((H - g) / 2);
    r.push({ x: 0, y: 0, w: cw, h: ch });
    r.push({ x: cw + g, y: 0, w: W - cw - g, h: ch });
    r.push({ x: 0, y: ch + g, w: cw, h: H - ch - g });
    r.push({ x: cw + g, y: ch + g, w: W - cw - g, h: H - ch - g });
  } else if (layoutId === 'nine') {
    const cw = Math.round((W - 2 * g) / 3);
    const ch = Math.round((H - 2 * g) / 3);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        r.push({ x: col * (cw + g), y: row * (ch + g), w: cw, h: ch });
      }
    }
  } else {
    // fullbleed
    r.push({ x: 0, y: 0, w: W, h: H });
  }
  return r;
}

// Draw one photo into a panel rect, cover-fit, with the panel's zoom and
// pan (panX/panY in -0.5..0.5 of the panel size). Returns the drawn rect.
function drawPanelPhoto(ctx, img, rect, panel) {
  const zoom = panel.zoom || 1;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (panel.panX || 0) * rect.w;
  const dy = rect.y + (rect.h - dh) / 2 + (panel.panY || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// Grade one rectangular region of a canvas in place, through a LUT.
// `strength` 0..1 blends the graded pixels with the original ones.
function applyGradeToRegion(ctx, rect, lookup, strength) {
  if (strength <= 0) return;
  const img = ctx.getImageData(rect.x, rect.y, rect.w, rect.h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    const gi = lum * 3;
    const gr = lookup[gi];
    const gg = lookup[gi + 1];
    const gb = lookup[gi + 2];
    d[i] = Math.round(d[i] + (gr - d[i]) * strength);
    d[i + 1] = Math.round(d[i + 1] + (gg - d[i + 1]) * strength);
    d[i + 2] = Math.round(d[i + 2] + (gb - d[i + 2]) * strength);
  }
  ctx.putImageData(img, rect.x, rect.y);
}

// A small pre-made noise tile, reused for the grain overlay.
let noiseTile = null;
function grainTile() {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 160;
  const g = c.getContext('2d');
  const img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

function drawGrain(ctx, W, H, amount) {
  if (amount <= 0) return;
  const tile = grainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function drawVignette(ctx, W, H) {
  const grad = ctx.createRadialGradient(
    W / 2, H / 2, Math.min(W, H) * 0.35,
    W / 2, H / 2, Math.max(W, H) * 0.75,
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(5,2,12,0.38)');
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// The caption title block: Anton caps, white with a dark outline and
// offset cyan/pink shadows (chromatic-aberration pop), plus a Pacifico
// script subtitle. Drawn over a soft dark gradient at the foot of the art.
function drawTitleBlock(ctx, W, H, state) {
  const title = (state.title || 'SUNSET HEIST').toUpperCase();
  const subtitle = state.subtitle || '';
  const bandH = Math.round(H * 0.24);
  const bandY = H - bandH;
  const grad = ctx.createLinearGradient(0, bandY - bandH * 0.5, 0, H);
  grad.addColorStop(0, 'rgba(8,4,18,0)');
  grad.addColorStop(1, 'rgba(8,4,18,0.72)');
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, bandY - bandH * 0.5, W, H - (bandY - bandH * 0.5));

  const pad = Math.round(W * 0.045);
  const maxTextW = W - pad * 2;
  let size = Math.round(H * 0.115);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const fitTitle = () => {
    ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
    return ctx.measureText(title).width <= maxTextW;
  };
  while (size > 24 && !fitTitle()) size -= 4;
  ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;

  const titleY = H - Math.round(H * 0.055) - (subtitle ? Math.round(H * 0.035) : 0);
  const off = Math.max(2, Math.round(size * 0.045));
  // Chromatic shadows, then the dark outline, then the white face.
  ctx.fillStyle = '#19e3ff';
  ctx.fillText(title, pad + off, titleY + off * 0.4);
  ctx.fillStyle = '#ff4fd8';
  ctx.fillText(title, pad - off, titleY - off * 0.4);
  ctx.lineWidth = Math.max(2, Math.round(size * 0.09));
  ctx.strokeStyle = 'rgba(10,4,20,0.9)';
  ctx.lineJoin = 'round';
  ctx.strokeText(title, pad, titleY);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, pad, titleY);

  if (subtitle) {
    const subSize = Math.round(size * 0.42);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.fillStyle = '#ffd166';
    ctx.fillText(subtitle, pad + Math.round(size * 0.06), H - Math.round(H * 0.028));
  }
  ctx.restore();
}

// Draw the whole cover. `photos` is an array of loaded HTMLImageElements.
// `state.panels` holds one entry per panel: { photo, zoom, panX, panY }.
export function drawCover(canvas, state, photos) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  const g = Math.max(4, Math.round(Math.min(W, H) * 0.008));
  const lookup = gradeLookup(state.grade || 'sunset');
  const strength = state.grade === 'clean' ? 0 : 0.82;

  // Backdrop: deep violet, so gutters read as poster seams.
  ctx.fillStyle = '#0d0a14';
  ctx.fillRect(0, 0, W, H);

  const rects = panelRectsForLayout(state.layout || 'hero3', W, H, g);
  const panels = state.panels || [];
  rects.forEach((rect, i) => {
    const panel = panels[i] || { photo: 0, zoom: 1, panX: 0, panY: 0 };
    const img = photos[panel.photo] || photos[0];
    if (!img) return;
    drawPanelPhoto(ctx, img, rect, panel);
    applyGradeToRegion(ctx, rect, lookup, strength);
    // Thin white seam around each panel, poster style.
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = Math.max(2, g * 0.35);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  });

  drawTitleBlock(ctx, W, H, state);
  if (state.frame) {
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, Math.round(Math.min(W, H) * 0.012));
    ctx.strokeRect(
      ctx.lineWidth / 2, ctx.lineWidth / 2,
      W - ctx.lineWidth, H - ctx.lineWidth,
    );
    ctx.restore();
  }
  if (state.grain) drawGrain(ctx, W, H, 0.16);
  drawVignette(ctx, W, H);
}

// Default state for a fresh cover: two sample photos, hero layout.
export function defaultState() {
  return {
    layout: 'hero3',
    grade: 'sunset',
    size: '1920x1080',
    title: 'SUNSET HEIST',
    subtitle: 'Vice City nights',
    frame: true,
    grain: true,
    panels: [
      { photo: 0, zoom: 1.15, panX: 0, panY: 0 },
      { photo: 1, zoom: 1.0, panX: 0, panY: 0.5 },
      { photo: 0, zoom: 1.4, panX: 0.08, panY: 0 },
      { photo: 1, zoom: 1.3, panX: -0.06, panY: 0.16 },
      { photo: 0, zoom: 1.2, panX: 0, panY: 0 },
      { photo: 1, zoom: 1.2, panX: 0, panY: 0.16 },
      { photo: 0, zoom: 1.35, panX: 0, panY: 0 },
      { photo: 1, zoom: 1.25, panX: 0, panY: 0.16 },
      { photo: 0, zoom: 1.2, panX: 0, panY: 0 },
    ],
  };
}
