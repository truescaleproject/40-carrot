
// Color theory utilities for the Paint workspace

export function hexToHsl(hex: string): [number, number, number] {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return [0, 0, 0];
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export interface ColorScheme {
  name: string;
  colors: string[];
  description: string;
}

export function generateSchemes(baseHex: string): ColorScheme[] {
  const [h, s, l] = hexToHsl(baseHex);

  return [
    {
      name: 'Complementary',
      description: 'High contrast, bold and striking',
      colors: [baseHex, hslToHex(h + 180, s, l)],
    },
    {
      name: 'Analogous',
      description: 'Harmonious, natural feel',
      colors: [hslToHex(h - 30, s, l), baseHex, hslToHex(h + 30, s, l)],
    },
    {
      name: 'Triad',
      description: 'Vibrant, balanced three-color scheme',
      colors: [baseHex, hslToHex(h + 120, s, l), hslToHex(h + 240, s, l)],
    },
    {
      name: 'Split Triad',
      description: 'Nuanced contrast with flexibility',
      colors: [baseHex, hslToHex(h + 150, s, l), hslToHex(h + 210, s, l)],
    },
    {
      name: 'Monochrome',
      description: 'Clean, cohesive single-hue palette',
      colors: [
        hslToHex(h, s, Math.max(l - 30, 10)),
        hslToHex(h, s, Math.max(l - 15, 15)),
        baseHex,
        hslToHex(h, s, Math.min(l + 15, 85)),
        hslToHex(h, s, Math.min(l + 30, 90)),
      ],
    },
  ];
}

export function extractPaletteFromImageData(imageData: ImageData, count: number = 5): string[] {
  const pixels: [number, number, number][] = [];
  const step = Math.max(1, Math.floor(imageData.data.length / 4 / 1000));

  for (let i = 0; i < imageData.data.length; i += 4 * step) {
    const r = imageData.data[i];
    const g = imageData.data[i + 1];
    const b = imageData.data[i + 2];
    const a = imageData.data[i + 3];
    if (a < 128) continue;
    pixels.push([r, g, b]);
  }

  // Simple k-means-like clustering
  if (pixels.length === 0) return ['#808080'];

  // Initialize centroids by picking evenly spaced pixels
  const centroids: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    centroids.push(pixels[Math.floor(i * pixels.length / count)]);
  }

  for (let iter = 0; iter < 10; iter++) {
    const clusters: [number, number, number][][] = Array.from({ length: count }, () => []);

    for (const pixel of pixels) {
      let minDist = Infinity, closest = 0;
      for (let c = 0; c < centroids.length; c++) {
        const dist = Math.pow(pixel[0] - centroids[c][0], 2) + Math.pow(pixel[1] - centroids[c][1], 2) + Math.pow(pixel[2] - centroids[c][2], 2);
        if (dist < minDist) { minDist = dist; closest = c; }
      }
      clusters[closest].push(pixel);
    }

    for (let c = 0; c < count; c++) {
      if (clusters[c].length === 0) continue;
      centroids[c] = [
        Math.round(clusters[c].reduce((s, p) => s + p[0], 0) / clusters[c].length),
        Math.round(clusters[c].reduce((s, p) => s + p[1], 0) / clusters[c].length),
        Math.round(clusters[c].reduce((s, p) => s + p[2], 0) / clusters[c].length),
      ];
    }
  }

  return centroids.map(([r, g, b]) =>
    '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')
  );
}
