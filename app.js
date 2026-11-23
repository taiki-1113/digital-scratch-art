const ART = [
  { id: 'pinocchio-workshop', title: 'ピノキオとひかるおもちゃ', subtitle: 'きのにんぎょうと にじいろのこうぼう', category: 'PINOCCHIO', color: 'assets/pinocchio-workshop.jpg' },
  { id: 'sports-day-drum', title: 'うんどうかいのたいこ', subtitle: 'にじのひかりに ひびくたいこ', category: 'SPORTS DAY', color: 'assets/sports-day-drum.jpg' },
  { id: 'panda-kuroshio', title: 'ぱんだくろしお', subtitle: 'うみべをはしる パンダのでんしゃ', category: 'PANDA EXPRESS', color: 'assets/panda-kuroshio.jpg' },
  { id: 'penguin-preschool', title: 'ペンギンのほいくえん', subtitle: 'あおいぼうしと ちょうちょのせんせい', category: 'PENGUIN PRESCHOOL', color: 'assets/penguin-preschool.jpg' },
  { id: 'fire-dragon', title: 'ほのおのドラゴン', subtitle: '火山にひびくドラゴンのほのお', category: 'FIRE DRAGON', color: 'assets/fire-dragon.jpg' },
];

const SOURCE_ART = [
  { id:'picked-01', title:'千と千尋の神隠し', subtitle:'夜の不思議な町', category:'GHIBLI', file:'images.jpg' },
  { id:'picked-02', title:'ジブリ イラスト集', subtitle:'いろいろな物語の世界', category:'GHIBLI', file:'images (1).jpg' },
  { id:'picked-03', title:'アニメのいろんな暮らし', subtitle:'にぎやかなイラストコレクション', category:'ANIME', file:'images (2).jpg' },
  { id:'picked-04', title:'サンリオキャラクター', subtitle:'お気に入りを探そう', category:'SANRIO', file:'images (3).jpg' },
  { id:'picked-05', title:'サンリオなかまたち', subtitle:'カラフルなキャラクターたち', category:'SANRIO', file:'images (4).jpg' },
  { id:'picked-06', title:'ポケモンの冒険', subtitle:'森の中で出会う仲間たち', category:'POKÉMON', file:'images (5).jpg' },
  { id:'picked-07', title:'ポケモンいっぱい', subtitle:'たくさんの仲間を見つけよう', category:'POKÉMON', file:'images (6).jpg' },
  { id:'picked-08', title:'ポケモンコレクション', subtitle:'お気に入りのポケモンはどこ？', category:'POKÉMON', file:'images (7).jpg' },
  { id:'picked-09', title:'トイ・ストーリー', subtitle:'おもちゃたちの大冒険', category:'DISNEY', file:'images (8).jpg' },
  { id:'picked-10', title:'ディズニーのなかまたち', subtitle:'みんなで楽しいひととき', category:'DISNEY', file:'images (9).jpg' },
];
for (const source of SOURCE_ART) {
  const color = `スクラッチアート作成用画像/${source.file}`;
  ART.push({ ...source, color: encodeURI(color), line: null });
}

const BASE_WIDTH = 900, MASK_SCALE = 0.5, STORE_KEY = 'scratch-art:v1:';
const BRUSH_RADIUS = 10;
const ZOOM_LEVELS = [1, 1.25, 1.5, 2, 2.5, 3];
let W = BASE_WIDTH, H = 650, MW = 450, MH = 325;
const grid = document.querySelector('#art-grid');
const gallery = document.querySelector('#gallery'), studio = document.querySelector('#studio');
const artboard = document.querySelector('#artboard'), canvasWrap = document.querySelector('#canvas-wrap');
const backButton = document.querySelector('#back-button');
const zoomOutButton = document.querySelector('#zoom-out');
const zoomInButton = document.querySelector('#zoom-in');
const zoomFitButton = document.querySelector('#zoom-fit');
const panButtons = document.querySelectorAll('[data-pan]');
const colorCanvas = document.querySelector('#color-layer'), scratchCanvas = document.querySelector('#scratch-layer'), lineCanvas = document.querySelector('#line-layer'), debrisCanvas = document.querySelector('#debris-layer');
const colorCtx = colorCanvas.getContext('2d'), scratchCtx = scratchCanvas.getContext('2d'), lineCtx = lineCanvas.getContext('2d'), debrisCtx = debrisCanvas.getContext('2d');
const offscreen = document.createElement('canvas');
let offCtx, mask = new Uint8Array(MW * MH), scratchBase = null;
let activeArt = null, strokePointer = null, previous = null, saveTimer = 0, dirty = false;
let returnCard = null;
let zoomIndex = 0, centerX = .5, centerY = .5;
let dust = [], dustFrame = 0, lastDust = 0;

for (const art of ART) {
  const button = document.createElement('button'); button.className = 'art-card'; button.type = 'button';
  button.innerHTML = `<span class="card-image"><img src="${art.color}" alt="" loading="lazy"><span class="card-chip">${art.category}</span></span><span class="card-info"><span><h3>${art.title}</h3><p>${art.subtitle}</p></span><span class="card-arrow" aria-hidden="true">↗</span></span>`;
  button.addEventListener('click', () => openArt(art, button)); grid.append(button);
}

function loadImage(src) {
  return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
}
function seededRandom(seed) {
  let n = seed >>> 0;
  return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; };
}
function resizeCanvases(height) {
  H = height; MW = Math.round(W * MASK_SCALE); MH = Math.round(H * MASK_SCALE);
  for (const canvas of [colorCanvas, scratchCanvas, lineCanvas, debrisCanvas]) { canvas.width = W; canvas.height = H; }
  offscreen.width = MW; offscreen.height = MH; offCtx = offscreen.getContext('2d', { alpha: true });
  dust = []; debrisCtx.clearRect(0, 0, W, H);
}

function renderView(panX = 0, panY = 0) {
  if (studio.hidden) return;
  const box = canvasWrap.getBoundingClientRect();
  if (!box.width || !box.height) return;
  const scale = Math.min(box.width / W, box.height / H) * ZOOM_LEVELS[zoomIndex];
  const width = W * scale, height = H * scale;
  const marginX = Math.min(.5, box.width / (2 * width));
  const marginY = Math.min(.5, box.height / (2 * height));
  centerX = Math.max(marginX, Math.min(1 - marginX, centerX + panX * box.width / width));
  centerY = Math.max(marginY, Math.min(1 - marginY, centerY + panY * box.height / height));

  const left = box.width / 2 - centerX * width;
  const top = box.height / 2 - centerY * height;
  artboard.style.width = `${width}px`;
  artboard.style.height = `${height}px`;
  artboard.style.left = `${left}px`;
  artboard.style.top = `${top}px`;

  const canPan = {
    left: left < -.5,
    up: top < -.5,
    down: top + height > box.height + .5,
    right: left + width > box.width + .5,
  };
  for (const button of panButtons) button.disabled = !canPan[button.dataset.pan];
  zoomOutButton.disabled = zoomFitButton.disabled = zoomIndex === 0;
  zoomInButton.disabled = zoomIndex === ZOOM_LEVELS.length - 1;
}

function resetView() {
  finishStroke();
  zoomIndex = 0;
  centerX = centerY = .5;
  renderView();
}

const panOffsets = { left: [-.25, 0], up: [0, -.25], down: [0, .25], right: [.25, 0] };
for (const button of panButtons) {
  button.addEventListener('click', () => {
    finishStroke();
    renderView(...panOffsets[button.dataset.pan]);
  });
}
zoomOutButton.addEventListener('click', () => { finishStroke(); zoomIndex--; renderView(); });
zoomInButton.addEventListener('click', () => { finishStroke(); zoomIndex++; renderView(); });
zoomFitButton.addEventListener('click', resetView);
new ResizeObserver(() => renderView()).observe(canvasWrap);

function makeScratchTexture(seed) {
  const rng = seededRandom(seed), image = offCtx.createImageData(MW, MH);
  for (let i = 0; i < image.data.length; i += 4) {
    const grain = rng() * 15, streak = rng() > .993 ? 13 : 0;
    image.data[i] = 28 + grain + streak; image.data[i + 1] = 29 + grain + streak;
    image.data[i + 2] = 37 + grain + streak; image.data[i + 3] = 255;
  }
  scratchBase = image.data;
}
function paintScratch() {
  const image = offCtx.createImageData(MW, MH), d = image.data;
  for (let p = 0, i = 0; p < mask.length; p++, i += 4) {
    const wear = mask[p], flicker = (p * 19 % 7) - 3;
    d[i] = scratchBase[i]; d[i + 1] = scratchBase[i + 1]; d[i + 2] = scratchBase[i + 2];
    d[i + 3] = Math.max(0, 255 - wear + (wear > 0 && wear < 230 ? flicker : 0));
  }
  offCtx.putImageData(image, 0, 0);
  scratchCtx.clearRect(0, 0, W, H); scratchCtx.drawImage(offscreen, 0, 0, W, H);
}
function savedMask(id) {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY + id) || 'null');
    if (parsed && typeof parsed.mask === 'string') {
      const raw = atob(parsed.mask), restored = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) restored[i] = raw.charCodeAt(i);
      const sameSize = restored.length === MW * MH;
      const sameShape = parsed.version === 2 && parsed.width === MW && parsed.height === MH;
      if (sameSize && (sameShape || parsed.version === 1)) return restored;
    }
  } catch (error) { console.warn('保存データを読み込めませんでした', error); }
  return new Uint8Array(MW * MH);
}
async function makeGuide(image, art) {
  if (art.generatedGuide) return art.generatedGuide;
  const source = document.createElement('canvas'); source.width = W; source.height = H;
  const ctx = source.getContext('2d', { willReadFrequently: true });
  ctx.filter = 'blur(0.7px)'; ctx.drawImage(image, 0, 0, W, H); ctx.filter = 'none';
  const pixels = ctx.getImageData(0, 0, W, H).data, gray = new Uint8Array(W * H);
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) gray[p] = pixels[i] * .299 + pixels[i + 1] * .587 + pixels[i + 2] * .114;
  const guide = document.createElement('canvas'); guide.width = W; guide.height = H;
  const guideCtx = guide.getContext('2d'), out = guideCtx.createImageData(W, H), data = out.data;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x;
    const gx = -gray[p-W-1] + gray[p-W+1] - 2*gray[p-1] + 2*gray[p+1] - gray[p+W-1] + gray[p+W+1];
    const gy = -gray[p-W-1] - 2*gray[p-W] - gray[p-W+1] + gray[p+W-1] + 2*gray[p+W] + gray[p+W+1];
    const alpha = Math.max(0, Math.min(238, (Math.hypot(gx, gy) - 90) * 1.25));
    const i = p * 4; data[i] = data[i+1] = data[i+2] = 255; data[i+3] = alpha;
  }
  guideCtx.putImageData(out, 0, 0); art.generatedGuide = guide; return guide;
}
async function openArt(art, card) {
  activeArt = art; document.querySelector('#work-name').textContent = art.title;
  document.querySelector('#save-state').textContent = '線画を準備しています…';
  try {
    const color = await loadImage(art.color);
    const aspect = color.naturalWidth / color.naturalHeight;
    const height = art.line ? 650 : Math.max(420, Math.min(1350, Math.round(W / aspect)));
    resizeCanvases(height);
    colorCtx.clearRect(0, 0, W, H); colorCtx.drawImage(color, 0, 0, W, H);
    const line = art.line ? await loadImage(art.line) : await makeGuide(color, art);
    lineCtx.clearRect(0, 0, W, H); lineCtx.drawImage(line, 0, 0, W, H);
    mask = savedMask(art.id); makeScratchTexture(art.id.split('').reduce((n, c) => n + c.charCodeAt(0), 77)); paintScratch();
    gallery.hidden = true;
    studio.hidden = false;
    document.body.classList.add('is-scratching');
    returnCard = card;
    resetView();
    backButton.focus({ preventScroll: true });
    document.querySelector('#save-state').textContent = 'この端末に保存されます';
  } catch (error) {
    console.error('作品を開けませんでした', error); activeArt = null;
    document.querySelector('#save-state').textContent = '画像を読み込めませんでした';
  }
}
function saveNow() {
  if (!activeArt || !dirty) return;
  const state = document.querySelector('#save-state'); state.textContent = '保存中…'; state.className = 'save-state saving';
  try {
    let binary = ''; const chunk = 0x8000;
    for (let i = 0; i < mask.length; i += chunk) binary += String.fromCharCode(...mask.subarray(i, i + chunk));
    localStorage.setItem(STORE_KEY + activeArt.id, JSON.stringify({ version: 2, width: MW, height: MH, mask: btoa(binary), updatedAt: Date.now() }));
    dirty = false; state.textContent = '保存しました'; state.className = 'save-state';
  } catch (error) { console.warn('作品を保存できませんでした', error); state.textContent = '保存できませんでした'; state.className = 'save-state error'; }
}
function queueSave() { dirty = true; clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 500); }
function dab(x, y, pressure = .5) {
  const cx = x * MW / W, cy = y * MH / H, radius = BRUSH_RADIUS * (.82 + Math.min(.6, pressure) * .3);
  const reach = Math.ceil(radius + 2), left = Math.max(0, Math.floor(cx - reach)), right = Math.min(MW - 1, Math.ceil(cx + reach));
  const top = Math.max(0, Math.floor(cy - reach)), bottom = Math.min(MH - 1, Math.ceil(cy + reach));
  for (let py = top; py <= bottom; py++) for (let px = left; px <= right; px++) {
    const dx = (px - cx) * (1 + Math.sin(py * .61 + px * .13) * .12), dy = py - cy;
    const dist = Math.hypot(dx, dy), edge = Math.max(0, Math.min(1, (radius - dist + (Math.random() - .5) * 2.8) / 2.8));
    if (dist < radius + 1.5 && Math.random() < edge * .85) {
      const idx = py * MW + px, amount = 2.4 + Math.random() * 1.4;
      mask[idx] = Math.min(244, mask[idx] + amount * (1 - dist / (radius + 1.5)));
    }
  }
}
function pointFromEvent(event) {
  const rect = scratchCanvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * W / rect.width, y: (event.clientY - rect.top) * H / rect.height, pressure: event.pressure || .5 };
}
function emitDust(point, count = 3) {
  for (let i = 0; i < count; i++) dust.push({ x:point.x, y:point.y, vx:(Math.random()-.5)*30, vy:-15-Math.random()*35, age:0, life:.28+Math.random()*.25, size:1+Math.random()*2.5 });
  if (!dustFrame) dustFrame = requestAnimationFrame(animateDust);
}
function animateDust() {
  const dt = .022; debrisCtx.clearRect(0, 0, W, H);
  dust = dust.filter(p => p.age < p.life);
  for (const p of dust) {
    p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 70 * dt;
    debrisCtx.globalAlpha = Math.max(0, 1 - p.age / p.life); debrisCtx.fillStyle = '#aeb0b3';
    debrisCtx.fillRect(p.x, p.y, p.size, p.size);
  }
  debrisCtx.globalAlpha = 1;
  if (dust.length) dustFrame = requestAnimationFrame(animateDust); else { dustFrame = 0; debrisCtx.clearRect(0,0,W,H); }
}
function drawSegment(a, b) {
  const distance = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.max(1, Math.ceil(distance / 3));
  for (let i = 0; i <= steps; i++) { const t = i / steps; dab(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, (a.pressure + b.pressure) / 2); }
  paintScratch(); queueSave();
  const now = performance.now(); if (now - lastDust > 35) { emitDust(b, 3); lastDust = now; }
}
scratchCanvas.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || strokePointer !== null) return;
  event.preventDefault(); strokePointer = event.pointerId; scratchCanvas.setPointerCapture(event.pointerId); previous = pointFromEvent(event); drawSegment(previous, previous); emitDust(previous, 5);
});
scratchCanvas.addEventListener('pointermove', event => {
  if (event.pointerId !== strokePointer) return;
  event.preventDefault();
  const viewport = canvasWrap.getBoundingClientRect();
  if (event.clientX < viewport.left || event.clientX > viewport.right || event.clientY < viewport.top || event.clientY > viewport.bottom) {
    previous = null;
    return;
  }
  const next = pointFromEvent(event);
  drawSegment(previous || next, next);
  previous = next;
});
function finishStroke(event) {
  if (strokePointer === null || (event && event.pointerId !== strokePointer)) return;
  const pointerId = strokePointer;
  strokePointer = null;
  previous = null;
  if (scratchCanvas.hasPointerCapture(pointerId)) scratchCanvas.releasePointerCapture(pointerId);
  if (dirty) saveNow();
}
scratchCanvas.addEventListener('pointerup', finishStroke); scratchCanvas.addEventListener('pointercancel', finishStroke); scratchCanvas.addEventListener('lostpointercapture', finishStroke);
backButton.addEventListener('click', () => {
  finishStroke();
  if (dirty) saveNow();
  studio.hidden = true;
  gallery.hidden = false;
  document.body.classList.remove('is-scratching');
  activeArt = null;
  returnCard?.focus();
});
document.querySelector('#reset-button').addEventListener('click', () => { if (!activeArt) return; mask = new Uint8Array(MW * MH); paintScratch(); dirty = true; saveNow(); });
window.addEventListener('pagehide', saveNow);
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(error => console.warn('オフライン準備に失敗しました', error));
