export interface ProceduralTextureSet {
  starfieldCanvas: HTMLCanvasElement;
  aluminumPattern: CanvasPattern | null;
  kaptonGoldPattern: CanvasPattern | null;
  solarCellPattern: CanvasPattern | null;
  earthAlbedoCanvas: HTMLCanvasElement;
}

let cachedTextures: ProceduralTextureSet | null = null;

function pseudoRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function getProceduralTextures(ctx: CanvasRenderingContext2D): ProceduralTextureSet {
  if (cachedTextures) return cachedTextures;

  const rand = pseudoRandom(20260412);

  // 1. Deep-Space Starfield + Subtle Nebula Canvas (900x520)
  const starfieldCanvas = document.createElement('canvas');
  starfieldCanvas.width = 900;
  starfieldCanvas.height = 520;
  const sCtx = starfieldCanvas.getContext('2d')!;
  sCtx.fillStyle = '#040812';
  sCtx.fillRect(0, 0, 900, 520);

  // Subtle cosmic dust glow
  const neb1 = sCtx.createRadialGradient(220, 140, 10, 220, 140, 260);
  neb1.addColorStop(0, 'rgba(30, 64, 175, 0.16)');
  neb1.addColorStop(1, 'rgba(4, 8, 18, 0)');
  sCtx.fillStyle = neb1;
  sCtx.fillRect(0, 0, 900, 520);

  const neb2 = sCtx.createRadialGradient(690, 380, 15, 690, 380, 240);
  neb2.addColorStop(0, 'rgba(14, 116, 144, 0.14)');
  neb2.addColorStop(1, 'rgba(4, 8, 18, 0)');
  sCtx.fillStyle = neb2;
  sCtx.fillRect(0, 0, 900, 520);

  for (let i = 0; i < 260; i++) {
    const x = rand() * 900;
    const y = rand() * 520;
    const r = rand() < 0.85 ? 0.8 + rand() * 0.9 : 1.8 + rand() * 1.1;
    const alpha = 0.25 + rand() * 0.75;
    sCtx.fillStyle =
      rand() > 0.82
        ? `rgba(186, 230, 253, ${alpha})`
        : `rgba(248, 250, 252, ${alpha})`;
    sCtx.beginPath();
    sCtx.arc(x, y, r, 0, Math.PI * 2);
    sCtx.fill();
  }

  // 2. Brushed Aerospace Aluminum Pattern (64x64)
  const alumCanvas = document.createElement('canvas');
  alumCanvas.width = 64;
  alumCanvas.height = 64;
  const aCtx = alumCanvas.getContext('2d')!;
  aCtx.fillStyle = '#64748b';
  aCtx.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y++) {
    const shade = 110 + Math.floor(rand() * 38);
    aCtx.fillStyle = `rgba(${shade}, ${shade + 12}, ${shade + 26}, 0.45)`;
    aCtx.fillRect(0, y, 64, 1);
  }
  aCtx.strokeStyle = 'rgba(15, 23, 42, 0.35)';
  aCtx.strokeRect(0.5, 0.5, 63, 63);

  // 3. Crinkled Gold Kapton MLI Thermal Foil Pattern (64x64)
  const kaptonCanvas = document.createElement('canvas');
  kaptonCanvas.width = 64;
  kaptonCanvas.height = 64;
  const kCtx = kaptonCanvas.getContext('2d')!;
  kCtx.fillStyle = '#d97706';
  kCtx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 42; i++) {
    const x = rand() * 64;
    const y = rand() * 64;
    const w = 6 + rand() * 14;
    const h = 6 + rand() * 14;
    kCtx.fillStyle = rand() > 0.5 ? 'rgba(253, 224, 71, 0.36)' : 'rgba(146, 64, 14, 0.42)';
    kCtx.beginPath();
    kCtx.moveTo(x, y);
    kCtx.lineTo(x + w, y + h * 0.4);
    kCtx.lineTo(x + w * 0.3, y + h);
    kCtx.closePath();
    kCtx.fill();
  }

  // 4. Gallium-Arsenide Photovoltaic Solar Cell Grid Pattern (48x48)
  const solarCanvas = document.createElement('canvas');
  solarCanvas.width = 48;
  solarCanvas.height = 48;
  const pCtx = solarCanvas.getContext('2d')!;
  pCtx.fillStyle = '#0f2952';
  pCtx.fillRect(0, 0, 48, 48);
  pCtx.strokeStyle = '#38bdf8';
  pCtx.lineWidth = 1;
  pCtx.strokeRect(1, 1, 22, 22);
  pCtx.strokeRect(25, 1, 22, 22);
  pCtx.strokeRect(1, 25, 22, 22);
  pCtx.strokeRect(25, 25, 22, 22);
  pCtx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  pCtx.beginPath();
  pCtx.moveTo(12, 0);
  pCtx.lineTo(12, 48);
  pCtx.moveTo(36, 0);
  pCtx.lineTo(36, 48);
  pCtx.stroke();

  // 5. Procedural Earth Albedo Map with Arid Desert Belts (512x256 equirectangular)
  const earthAlbedoCanvas = document.createElement('canvas');
  earthAlbedoCanvas.width = 512;
  earthAlbedoCanvas.height = 256;
  const eCtx = earthAlbedoCanvas.getContext('2d')!;

  // Deep ocean base
  const oceanGrad = eCtx.createLinearGradient(0, 0, 0, 256);
  oceanGrad.addColorStop(0, '#0c4a6e');
  oceanGrad.addColorStop(0.5, '#0369a1');
  oceanGrad.addColorStop(1, '#0c4a6e');
  eCtx.fillStyle = oceanGrad;
  eCtx.fillRect(0, 0, 512, 256);

  // Stylized continents + highlighted Arid Subsurface Aquifer Target Belts (Sahara, Arabia, SW USA, Outback)
  const drawLandmass = (
    points: [number, number][],
    baseColor: string,
    aridPatch?: { x: number; y: number; rx: number; ry: number }
  ) => {
    eCtx.fillStyle = baseColor;
    eCtx.beginPath();
    points.forEach(([px, py], idx) => {
      if (idx === 0) eCtx.moveTo(px, py);
      else eCtx.lineTo(px, py);
    });
    eCtx.closePath();
    eCtx.fill();

    if (aridPatch) {
      eCtx.fillStyle = '#d97706';
      eCtx.beginPath();
      eCtx.ellipse(aridPatch.x, aridPatch.y, aridPatch.rx, aridPatch.ry, 0, 0, Math.PI * 2);
      eCtx.fill();
    }
  };

  // North America + SW Arid Basin
  drawLandmass(
    [
      [45, 45],
      [135, 42],
      [152, 88],
      [115, 122],
      [78, 108]
    ],
    '#15803d',
    { x: 92, y: 88, rx: 18, ry: 11 }
  );

  // South America
  drawLandmass(
    [
      [132, 134],
      [172, 148],
      [162, 215],
      [138, 222]
    ],
    '#166534'
  );

  // Africa + Sahara Target Zone
  drawLandmass(
    [
      [232, 74],
      [298, 76],
      [312, 132],
      [282, 198],
      [252, 192],
      [228, 124]
    ],
    '#15803d',
    { x: 266, y: 96, rx: 32, ry: 15 }
  );

  // Eurasia + Arabian / Central Asian Arid Belt
  drawLandmass(
    [
      [240, 34],
      [425, 32],
      [448, 95],
      [375, 114],
      [304, 82]
    ],
    '#166534',
    { x: 332, y: 88, rx: 28, ry: 12 }
  );

  // Australia + Outback Arid Zone
  drawLandmass(
    [
      [388, 156],
      [442, 158],
      [445, 198],
      [392, 196]
    ],
    '#15803d',
    { x: 416, y: 177, rx: 17, ry: 10 }
  );

  // Subtle translucent cloud wisps
  eCtx.fillStyle = 'rgba(255, 255, 255, 0.16)';
  for (let i = 0; i < 28; i++) {
    const cx = rand() * 512;
    const cy = 25 + rand() * 206;
    eCtx.beginPath();
    eCtx.ellipse(cx, cy, 18 + rand() * 34, 4 + rand() * 6, 0, 0, Math.PI * 2);
    eCtx.fill();
  }

  cachedTextures = {
    starfieldCanvas,
    aluminumPattern: ctx.createPattern(alumCanvas, 'repeat'),
    kaptonGoldPattern: ctx.createPattern(kaptonCanvas, 'repeat'),
    solarCellPattern: ctx.createPattern(solarCanvas, 'repeat'),
    earthAlbedoCanvas
  };

  return cachedTextures;
}