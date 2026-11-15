export const GENERATOR_VERSION = '0.1.0';
export const SCHEMA_VERSION = 1;
export const PLUGIN_DATA_NAMESPACE = 'ds_forge';

export const SUPPORTED_LOCALES = ['en', 'th'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const THEME_MODES = ['light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export const DENSITY_MODES = ['default', 'compact'] as const;
export type DensityMode = (typeof DENSITY_MODES)[number];

export const LIBRARY_READINESS = ['ready', 'beta', 'coming-soon'] as const;
export type LibraryReadiness = (typeof LIBRARY_READINESS)[number];

export const SCOPE_PRESETS = ['technical-slice', 'core', 'full', 'custom'] as const;
export type ScopePreset = (typeof SCOPE_PRESETS)[number];

export const RADIUS_PRESETS = ['none', 'sm', 'md', 'lg', 'full'] as const;
export type RadiusPreset = (typeof RADIUS_PRESETS)[number];

export const PAGE_NAMING_STYLES = ['numbered', 'clean'] as const;
export type PageNamingStyle = (typeof PAGE_NAMING_STYLES)[number];
