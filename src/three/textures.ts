import * as THREE from 'three';

export function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is unavailable');
  return [canvas, ctx];
}

export function toTexture(canvas: HTMLCanvasElement, repeat = true): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }
  return texture;
}

function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

export function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  const u = smooth(xf);
  const v = smooth(yf);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

export function fbm(x: number, y: number, octaves = 3): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let i = 0; i < octaves; i += 1) {
    value += valueNoise(x * frequency, y * frequency) * amplitude;
    frequency *= 2.1;
    amplitude *= 0.5;
  }
  return value;
}

/** Horizontal log-cabin planks with grain and knots. */
export function woodTexture(base = '#76543a', dark = '#3a271a'): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 512, 512);
  const plank = 72;
  for (let row = 0; row < 512 / plank; row += 1) {
    const y = row * plank;
    const shade = 0.82 + hash(row, 3) * 0.3;
    ctx.fillStyle = `rgba(0,0,0,${0.08 + hash(row, 4) * 0.16})`;
    ctx.fillRect(0, y, 512, plank);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = base;
    ctx.globalAlpha = 1;
    ctx.strokeStyle = dark;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y + plank - 1);
    ctx.lineTo(512, y + plank - 1);
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 14; i += 1) {
      const gy = y + 6 + hash(row, i) * (plank - 12);
      ctx.strokeStyle = `rgba(28,17,10,${0.08 + hash(i, row) * 0.12})`;
      ctx.lineWidth = 0.8 + hash(i, row + 9) * 1.2;
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 16) {
        const wobble = Math.sin((x / 512) * Math.PI * (2 + hash(row, 5) * 5) + i) * 2.5;
        if (x === 0) ctx.moveTo(x, gy + wobble);
        else ctx.lineTo(x, gy + wobble);
      }
      ctx.stroke();
    }
    if (row % 2 === 0) {
      const kx = 80 + hash(row, 12) * 360;
      const ky = y + plank * 0.5;
      for (let r = 10; r > 1; r -= 2) {
        ctx.strokeStyle = `rgba(32,19,11,${0.22 - r * 0.012})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(kx, ky, r * 1.8, r, 0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(255,220,180,${0.02 + shade * 0.02})`;
    ctx.fillRect(0, y + 2, 512, 2);
  }
  return toTexture(canvas);
}

export function shingleTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#241f1c';
  ctx.fillRect(0, 0, 512, 512);
  const rowH = 42;
  const tileW = 54;
  for (let row = 0; row < 14; row += 1) {
    const y = row * rowH;
    const offset = row % 2 === 0 ? 0 : tileW / 2;
    for (let col = -1; col < 11; col += 1) {
      const x = col * tileW + offset;
      const shade = 0.75 + hash(row, col) * 0.45;
      ctx.fillStyle = `rgb(${Math.round(44 * shade)},${Math.round(38 * shade)},${Math.round(33 * shade)})`;
      ctx.fillRect(x + 1, y + 1, tileW - 4, rowH - 3);
      ctx.fillStyle = 'rgba(255,238,205,0.045)';
      ctx.fillRect(x + 2, y + 2, tileW - 6, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.fillRect(x + 1, y + rowH - 4, tileW - 3, 3);
    }
  }
  return toTexture(canvas);
}

export function stoneTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#353633';
  ctx.fillRect(0, 0, 512, 512);
  let y = 0;
  while (y < 512) {
    const h = 34 + hash(y, 1) * 30;
    let x = -20 + hash(y, 2) * 30;
    while (x < 512) {
      const w = 44 + hash(x, y) * 66;
      const shade = 0.7 + hash(x, y + 4) * 0.5;
      ctx.fillStyle = `rgb(${Math.round(74 * shade)},${Math.round(75 * shade)},${Math.round(69 * shade)})`;
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, w - 5, h - 5, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x + 2, y + h - 5, w - 5, 3);
      ctx.fillStyle = 'rgba(255,255,240,0.035)';
      ctx.fillRect(x + 4, y + 4, w - 10, 2);
      x += w;
    }
    y += h;
  }
  return toTexture(canvas);
}

export function groundTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(512, 512);
  ctx.fillStyle = '#1b2a1d';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2400; i += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const n = fbm(x / 60, y / 60, 3);
    const green = n > 0.55;
    ctx.fillStyle = green
      ? `rgba(${40 + n * 40},${62 + n * 52},${38 + n * 34},0.18)`
      : `rgba(${54 + n * 30},${44 + n * 24},${31 + n * 18},0.13)`;
    ctx.beginPath();
    ctx.ellipse(x, y, 2 + Math.random() * 11, 1 + Math.random() * 6, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 500; i += 1) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = `rgba(150,168,122,${0.02 + Math.random() * 0.05})`;
    ctx.fillRect(x, y, 1, 3 + Math.random() * 5);
  }
  return toTexture(canvas);
}

export function glowTexture(color = '255,235,196'): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128, 128);
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, `rgba(${color},1)`);
  gradient.addColorStop(0.18, `rgba(${color},0.78)`);
  gradient.addColorStop(0.44, `rgba(${color},0.22)`);
  gradient.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  return toTexture(canvas, false);
}

export function moonTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256, 256);
  const glow = ctx.createRadialGradient(128, 128, 26, 128, 128, 128);
  glow.addColorStop(0, 'rgba(255,241,204,0.9)');
  glow.addColorStop(0.34, 'rgba(255,236,190,0.32)');
  glow.addColorStop(0.7, 'rgba(246,222,164,0.08)');
  glow.addColorStop(1, 'rgba(246,222,164,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 256, 256);
  const disc = ctx.createRadialGradient(118, 116, 4, 128, 128, 58);
  disc.addColorStop(0, '#fff7df');
  disc.addColorStop(0.72, '#f2e2b6');
  disc.addColorStop(1, '#d9c18e');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(128, 128, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(128, 128, 56, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < 14; i += 1) {
    const x = 82 + hash(i, 2) * 92;
    const y = 82 + hash(i, 5) * 92;
    const r = 2 + hash(i, 8) * 9;
    ctx.fillStyle = `rgba(164,143,103,${0.06 + hash(i, 9) * 0.12})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return toTexture(canvas, false);
}

export function smokeTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128, 128);
  for (let i = 0; i < 8; i += 1) {
    const x = 40 + Math.random() * 48;
    const y = 40 + Math.random() * 48;
    const r = 20 + Math.random() * 30;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(198,208,194,0.22)');
    gradient.addColorStop(1, 'rgba(198,208,194,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  return toTexture(canvas, false);
}

/** Circular wolf-and-runes inlay for the centre of the table. */
export function runeDialTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(1024, 1024);
  const c = 512;
  ctx.clearRect(0, 0, 1024, 1024);

  const halo = ctx.createRadialGradient(c, c, 70, c, c, 500);
  halo.addColorStop(0, 'rgba(231,201,145,0.18)');
  halo.addColorStop(0.55, 'rgba(231,201,145,0.05)');
  halo.addColorStop(1, 'rgba(231,201,145,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 1024, 1024);

  ctx.strokeStyle = 'rgba(232,201,144,0.82)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(c, c, 440, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(232,201,144,0.5)';
  ctx.beginPath();
  ctx.arc(c, c, 410, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c, c, 300, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(232,201,144,0.3)';
  ctx.beginPath();
  ctx.arc(c, c, 190, 0, Math.PI * 2);
  ctx.stroke();

  // Nine seat marks.
  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2 - Math.PI / 2;
    const x = c + Math.cos(angle) * 370;
    const y = c + Math.sin(angle) * 370;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);
    ctx.strokeStyle = 'rgba(232,201,144,0.85)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    const glyph = i % 3;
    if (glyph === 0) {
      ctx.moveTo(-9, 10);
      ctx.lineTo(0, -12);
      ctx.lineTo(9, 10);
      ctx.moveTo(-5, 2);
      ctx.lineTo(5, 2);
    } else if (glyph === 1) {
      ctx.moveTo(0, -11);
      ctx.lineTo(0, 11);
      ctx.moveTo(-8, -4);
      ctx.lineTo(8, -4);
      ctx.moveTo(-6, 8);
      ctx.lineTo(6, 8);
    } else {
      ctx.moveTo(-9, -8);
      ctx.lineTo(0, 12);
      ctx.lineTo(9, -8);
      ctx.moveTo(0, 12);
      ctx.lineTo(0, -12);
    }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(232,201,144,0.7)';
    ctx.beginPath();
    ctx.arc(c + Math.cos(angle) * 447, c + Math.sin(angle) * 447, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // A minimal wolf sigil: two ears, a long muzzle, two eyes.
  ctx.strokeStyle = 'rgba(240,213,160,0.92)';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(430, 560);
  ctx.lineTo(440, 430);
  ctx.lineTo(492, 486);
  ctx.lineTo(532, 470);
  ctx.lineTo(572, 486);
  ctx.lineTo(624, 430);
  ctx.lineTo(634, 560);
  ctx.lineTo(588, 640);
  ctx.lineTo(532, 672);
  ctx.lineTo(476, 640);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(470, 552);
  ctx.lineTo(502, 566);
  ctx.moveTo(594, 552);
  ctx.lineTo(562, 566);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(532, 590);
  ctx.lineTo(518, 616);
  ctx.lineTo(546, 616);
  ctx.stroke();
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(angle) * 690, c + Math.sin(angle) * 690);
    ctx.lineTo(c + Math.cos(angle) * 750, c + Math.sin(angle) * 750);
    ctx.stroke();
  }

  return toTexture(canvas, false);
}

export function flameTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128, 256);
  const gradient = ctx.createRadialGradient(64, 150, 2, 64, 150, 96);
  gradient.addColorStop(0, 'rgba(255,244,206,1)');
  gradient.addColorStop(0.22, 'rgba(255,198,104,0.95)');
  gradient.addColorStop(0.52, 'rgba(226,112,48,0.6)');
  gradient.addColorStop(1, 'rgba(160,48,20,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(64, 150, 44, 100, 0, 0, Math.PI * 2);
  ctx.fill();
  return toTexture(canvas, false);
}

export function softParticleTexture(): THREE.CanvasTexture {
  return glowTexture('255,226,168');
}
