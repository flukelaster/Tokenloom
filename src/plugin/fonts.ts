import type { FontPreset } from '@schema';

export interface FontFallbackNote {
  requestedFamily: string;
  requestedStyle: string;
  resolvedFamily: string;
  resolvedStyle: string;
  reason: string;
}

const STYLE_FALLBACK_ORDER: Record<string, string[]> = {
  Regular: ['Regular', 'Book', 'Normal', 'Roman'],
  Medium: ['Medium', 'Regular', 'Semi Bold', 'SemiBold'],
  SemiBold: ['Semi Bold', 'SemiBold', 'Demibold', 'Medium', 'Bold', 'Regular'],
  Bold: ['Bold', 'Semi Bold', 'SemiBold', 'Medium', 'Regular'],
};

const THAI_CAPABLE_FAMILIES = [
  'Noto Sans Thai',
  'IBM Plex Sans Thai',
  'Sarabun',
  'Thonburi',
  'Tahoma',
  'Inter',
];

const GENERAL_SANS_FALLBACKS = ['Inter', 'Roboto', 'Arial'];
const GENERAL_MONO_FALLBACKS = ['Roboto Mono', 'JetBrains Mono', 'IBM Plex Mono', 'Courier New', 'Inter'];

export class FontManager {
  private availableByFamily: Map<string, Set<string>> | null = null;
  private loadedFonts = new Set<string>();
  private resolvedCache = new Map<string, FontName>();
  public readonly fallbackNotes: FontFallbackNote[] = [];
  private recordedNoteKeys = new Set<string>();

  async initialize(): Promise<void> {
    if (this.availableByFamily) return;
    this.availableByFamily = new Map();
    try {
      const fonts = await figma.listAvailableFontsAsync();
      for (const f of fonts) {
        let styles = this.availableByFamily.get(f.fontName.family);
        if (!styles) {
          styles = new Set();
          this.availableByFamily.set(f.fontName.family, styles);
        }
        styles.add(f.fontName.style);
      }
    } catch {
      // Fallback to direct loadFontAsync probing if listAvailableFontsAsync fails
      this.availableByFamily = new Map();
    }
  }

  private recordFallback(note: FontFallbackNote): void {
    const key = `${note.requestedFamily}:${note.requestedStyle}->${note.resolvedFamily}:${note.resolvedStyle}`;
    if (this.recordedNoteKeys.has(key)) return;
    this.recordedNoteKeys.add(key);
    this.fallbackNotes.push(note);
  }

  async loadFontWithFallback(
    requestedFamily: string,
    requestedWeight: 'Regular' | 'Medium' | 'SemiBold' | 'Bold',
    role: 'sans' | 'mono' | 'thai' = 'sans',
  ): Promise<FontName> {
    await this.initialize();
    const cacheKey = `${requestedFamily}::${requestedWeight}::${role}`;
    const cached = this.resolvedCache.get(cacheKey);
    if (cached) return cached;

    const familyCandidates = [
      requestedFamily,
      ...(role === 'thai'
        ? THAI_CAPABLE_FAMILIES
        : role === 'mono'
          ? GENERAL_MONO_FALLBACKS
          : GENERAL_SANS_FALLBACKS),
    ];
    const uniqueFamilies = [...new Set(familyCandidates)];
    const styleCandidates = STYLE_FALLBACK_ORDER[requestedWeight] ?? ['Regular'];

    for (const family of uniqueFamilies) {
      const knownStyles = this.availableByFamily?.get(family);
      const stylesToTry =
        knownStyles && knownStyles.size > 0
          ? styleCandidates.filter((s) => knownStyles.has(s))
          : styleCandidates;

      for (const style of stylesToTry) {
        const fontKey = `${family}::${style}`;
        try {
          if (!this.loadedFonts.has(fontKey)) {
            await figma.loadFontAsync({ family, style });
            this.loadedFonts.add(fontKey);
          }
          const resolved: FontName = { family, style };
          this.resolvedCache.set(cacheKey, resolved);
          if (family !== requestedFamily || (style !== requestedWeight && !(requestedWeight === 'SemiBold' && style === 'Semi Bold'))) {
            this.recordFallback({
              requestedFamily,
              requestedStyle: requestedWeight,
              resolvedFamily: family,
              resolvedStyle: style,
              reason:
                family !== requestedFamily
                  ? `Requested font "${requestedFamily}" unavailable in environment; fell back to "${family}".`
                  : `Style "${requestedWeight}" mapped to available weight "${style}".`,
            });
          }
          return resolved;
        } catch {
          // Try next style/family candidate
        }
      }
    }

    // Ultimate fallback mandated to exist in Figma: Inter Regular
    const ultimate: FontName = { family: 'Inter', style: 'Regular' };
    await figma.loadFontAsync(ultimate);
    this.loadedFonts.add('Inter::Regular');
    this.resolvedCache.set(cacheKey, ultimate);
    this.recordFallback({
      requestedFamily,
      requestedStyle: requestedWeight,
      resolvedFamily: 'Inter',
      resolvedStyle: 'Regular',
      reason: 'All preferred families unavailable; fell back to Figma default Inter Regular.',
    });
    return ultimate;
  }

  async preloadPlanFonts(preset: FontPreset, locale: 'en' | 'th'): Promise<void> {
    const primaryRole = locale === 'th' ? 'thai' : 'sans';
    const primaryFamily = locale === 'th' ? preset.thaiFallbackFamily : preset.sansFamily;

    for (const weight of ['Regular', 'Medium', 'SemiBold', 'Bold'] as const) {
      await this.loadFontWithFallback(primaryFamily, weight, primaryRole);
    }
    await this.loadFontWithFallback(preset.monoFamily, 'Regular', 'mono');
    await this.loadFontWithFallback('Inter', 'Regular', 'sans');
  }

  async ensureExistingTextNodeFontLoaded(node: TextNode): Promise<void> {
    if (node.fontName !== figma.mixed && node.characters.length > 0) {
      const key = `${node.fontName.family}::${node.fontName.style}`;
      if (!this.loadedFonts.has(key)) {
        try {
          await figma.loadFontAsync(node.fontName);
          this.loadedFonts.add(key);
        } catch {
          await this.loadFontWithFallback('Inter', 'Regular', 'sans');
        }
      }
    }
  }
}
