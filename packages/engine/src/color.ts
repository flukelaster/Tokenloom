import type { BrandPaletteShade, TokenDefinition } from '@schema';

export interface RgbaColor {
  r: number; // 0..1
  g: number; // 0..1
  b: number; // 0..1
  a: number; // 0..1
}

export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function hexToRgba(hex: string, overrideOpacity?: number): RgbaColor {
  const clean = hex.replace(/^#/, '').trim();
  if (clean.length !== 6 && clean.length !== 8) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const parsedA = clean.length === 8 ? parseInt(clean.slice(6, 8), 16) / 255 : 1;
  const a = overrideOpacity !== undefined ? clamp(overrideOpacity, 0, 1) : parsedA;
  return { r, g, b, a };
}

export function rgbaToHex(color: RgbaColor, includeAlpha = false): string {
  const toByte = (n: number) =>
    Math.round(clamp(n, 0, 1) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  const base = `#${toByte(color.r)}${toByte(color.g)}${toByte(color.b)}`;
  if (includeAlpha || color.a < 0.999) {
    return `${base}${toByte(color.a)}`;
  }
  return base;
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

interface Oklch {
  L: number;
  C: number;
  h: number; // radians
}

function rgbToOklch(rgb: RgbaColor): Oklch {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bLab = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const C = Math.sqrt(a * a + bLab * bLab);
  const h = Math.atan2(bLab, a);
  return { L, C, h };
}

function oklchToLinearRgb(L: number, C: number, h: number): { r: number; g: number; b: number } {
  const a = C * Math.cos(h);
  const bLab = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * bLab;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bLab;
  const s_ = L - 0.0894841775 * a - 1.291485548 * bLab;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return { r, g, b };
}

function inGamut(rgb: { r: number; g: number; b: number }): boolean {
  const eps = -0.0005;
  const max = 1.0005;
  return rgb.r >= eps && rgb.r <= max && rgb.g >= eps && rgb.g <= max && rgb.b >= eps && rgb.b <= max;
}

function oklchToHexGamutMapped(targetL: number, targetC: number, h: number): string {
  const L = clamp(targetL, 0.02, 0.99);
  let low = 0;
  let high = Math.max(0, targetC);
  let best = oklchToLinearRgb(L, 0, h);

  if (inGamut(oklchToLinearRgb(L, high, h))) {
    best = oklchToLinearRgb(L, high, h);
  } else {
    for (let i = 0; i < 16; i++) {
      const mid = (low + high) / 2;
      const candidate = oklchToLinearRgb(L, mid, h);
      if (inGamut(candidate)) {
        best = candidate;
        low = mid;
      } else {
        high = mid;
      }
    }
  }

  return rgbaToHex({
    r: clamp(linearToSrgb(clamp(best.r, 0, 1)), 0, 1),
    g: clamp(linearToSrgb(clamp(best.g, 0, 1)), 0, 1),
    b: clamp(linearToSrgb(clamp(best.b, 0, 1)), 0, 1),
    a: 1,
  });
}

export function relativeLuminance(rgb: RgbaColor): number {
  const R = srgbToLinear(rgb.r);
  const G = srgbToLinear(rgb.g);
  const B = srgbToLinear(rgb.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function compositeOver(fg: RgbaColor, bg: RgbaColor): RgbaColor {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a <= 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  };
}

export function wcagContrastRatio(fgHex: string, bgHex: string, fgOpacity = 1, bgOpacity = 1): number {
  const bgBase = hexToRgba('#FFFFFF', 1);
  const bg = compositeOver(hexToRgba(bgHex, bgOpacity), bgBase);
  const fg = compositeOver(hexToRgba(fgHex, fgOpacity), bg);
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export function pickAccessibleForeground(bgHex: string): string {
  const whiteRatio = wcagContrastRatio('#FFFFFF', bgHex);
  const darkRatio = wcagContrastRatio('#09090B', bgHex);
  return whiteRatio >= 4.5 || whiteRatio >= darkRatio ? '#FFFFFF' : '#09090B';
}

function ensureAccessibleBrandShade(
  initialHex: string,
  initialL: number,
  targetC: number,
  hue: number,
  direction: 'darker' | 'lighter',
): string {
  let candidateHex = initialHex;
  let L = initialL;
  for (let step = 0; step < 16; step++) {
    const bestContrast = Math.max(
      wcagContrastRatio('#FFFFFF', candidateHex),
      wcagContrastRatio('#09090B', candidateHex),
    );
    if (bestContrast >= 4.55) {
      return candidateHex;
    }
    L = clamp(L + (direction === 'darker' ? -0.015 : 0.015), 0.18, 0.92);
    candidateHex = oklchToHexGamutMapped(L, targetC, hue);
  }
  return candidateHex;
}

/**
 * Generates a full perceptual 11-step brand tonal scale + accessible on-brand foregrounds
 * from any primary brand hex color, ensuring smooth Light/Dark state progression and contrast.
 */
export function generateBrandPalette(primaryHex: string): Record<BrandPaletteShade, string> {
  const base = rgbToOklch(hexToRgba(primaryHex));
  const peakChroma = Math.max(0.02, base.C);
  const isAchromatic = base.C < 0.015;

  const lightnessTargets: Record<Exclude<BrandPaletteShade, 'on-brand-light' | 'on-brand-dark'>, [number, number]> = {
    '50': [0.975, isAchromatic ? 0 : peakChroma * 0.12],
    '100': [0.945, isAchromatic ? 0 : peakChroma * 0.24],
    '200': [0.89, isAchromatic ? 0 : peakChroma * 0.44],
    '300': [0.81, isAchromatic ? 0 : peakChroma * 0.68],
    '400': [0.71, isAchromatic ? 0 : peakChroma * 0.88],
    '500': [0.62, isAchromatic ? 0 : peakChroma * 1.0],
    '600': [clamp(base.L, 0.44, 0.58), isAchromatic ? 0 : peakChroma * 1.0],
    '700': [0.45, isAchromatic ? 0 : peakChroma * 0.92],
    '800': [0.37, isAchromatic ? 0 : peakChroma * 0.78],
    '900': [0.3, isAchromatic ? 0 : peakChroma * 0.62],
    '950': [0.21, isAchromatic ? 0 : peakChroma * 0.45],
  };

  // For ultra-dark neutral brands like shadcn default #18181B, preserve dark 900/600 richness
  const rawShade600 =
    isAchromatic && base.L < 0.3
      ? rgbaToHex(hexToRgba(primaryHex))
      : oklchToHexGamutMapped(lightnessTargets['600'][0], lightnessTargets['600'][1], base.h);
  const shade600 =
    isAchromatic && base.L < 0.3
      ? rawShade600
      : ensureAccessibleBrandShade(
          rawShade600,
          lightnessTargets['600'][0],
          lightnessTargets['600'][1],
          base.h,
          'darker',
        );

  const rawShade400 =
    isAchromatic && base.L < 0.3
      ? '#FAFAFA'
      : oklchToHexGamutMapped(lightnessTargets['400'][0], lightnessTargets['400'][1], base.h);
  const shade400 =
    isAchromatic && base.L < 0.3
      ? rawShade400
      : ensureAccessibleBrandShade(
          rawShade400,
          lightnessTargets['400'][0],
          lightnessTargets['400'][1],
          base.h,
          'lighter',
        );

  return {
    '50': oklchToHexGamutMapped(lightnessTargets['50'][0], lightnessTargets['50'][1], base.h),
    '100': oklchToHexGamutMapped(lightnessTargets['100'][0], lightnessTargets['100'][1], base.h),
    '200': oklchToHexGamutMapped(lightnessTargets['200'][0], lightnessTargets['200'][1], base.h),
    '300': oklchToHexGamutMapped(lightnessTargets['300'][0], lightnessTargets['300'][1], base.h),
    '400': shade400,
    '500': oklchToHexGamutMapped(lightnessTargets['500'][0], lightnessTargets['500'][1], base.h),
    '600': shade600,
    '700':
      isAchromatic && base.L < 0.3
        ? '#27272A'
        : oklchToHexGamutMapped(lightnessTargets['700'][0], lightnessTargets['700'][1], base.h),
    '800': oklchToHexGamutMapped(lightnessTargets['800'][0], lightnessTargets['800'][1], base.h),
    '900': oklchToHexGamutMapped(lightnessTargets['900'][0], lightnessTargets['900'][1], base.h),
    '950': oklchToHexGamutMapped(lightnessTargets['950'][0], lightnessTargets['950'][1], base.h),
    'on-brand-light': pickAccessibleForeground(shade600),
    'on-brand-dark': pickAccessibleForeground(shade400),
  };
}

export interface ResolvedTokenPrimitive {
  type: TokenDefinition['type'];
  hex?: string;
  opacity?: number;
  floatValue?: number;
  stringValue?: string;
  booleanValue?: boolean;
  aliasChain: string[];
}

export function resolveTokenInMode(
  logicalId: string,
  mode: 'Light' | 'Dark',
  tokenMap: ReadonlyMap<string, TokenDefinition>,
): ResolvedTokenPrimitive | null {
  const chain: string[] = [];
  const visited = new Set<string>();
  let cursor = tokenMap.get(logicalId);

  while (cursor) {
    if (visited.has(cursor.logicalId)) {
      return null;
    }
    visited.add(cursor.logicalId);
    chain.push(cursor.logicalId);

    const modeValue =
      cursor.collection === 'semantic'
        ? cursor.valuesByMode[mode]
        : cursor.valuesByMode.Base;

    if (!modeValue) return null;

    if (modeValue.kind === 'alias') {
      cursor = tokenMap.get(modeValue.targetLogicalId);
      continue;
    }

    if (modeValue.kind === 'color') {
      return {
        type: 'COLOR',
        hex: modeValue.hex,
        opacity: modeValue.opacity ?? 1,
        aliasChain: chain,
      };
    }
    if (modeValue.kind === 'float') {
      return {
        type: 'FLOAT',
        floatValue: modeValue.value,
        aliasChain: chain,
      };
    }
    if (modeValue.kind === 'string') {
      return {
        type: 'STRING',
        stringValue: modeValue.value,
        aliasChain: chain,
      };
    }
    if (modeValue.kind === 'boolean') {
      return {
        type: 'BOOLEAN',
        booleanValue: modeValue.value,
        aliasChain: chain,
      };
    }
  }

  return null;
}
