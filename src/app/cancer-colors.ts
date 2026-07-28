/**
 * Canonical color mapping for TCGA cancer types and subtypes.
 *
 * Design principle:
 *  - Each cancer TYPE gets a distinct hue from a carefully curated palette.
 *  - For types with many subtypes (e.g. BRCA), the base hue is chosen so that
 *    lightness/saturation variants are visually distinguishable and still clearly
 *    connected to the parent type.
 *  - Subtypes are derived automatically: the type color is shifted in HSL space
 *    (varying lightness from 35% to 65%, same hue ± small jitter) so 5+ subtypes
 *    remain readable as a family.
 *
 * Usage:
 *   import { getCancerColor } from '../../../cancer-colors';
 *   const color = getCancerColor('breast_invasive_carcinoma');           // type
 *   const color = getCancerColor('breast_invasive_carcinoma', 'Luminal A'); // subtype
 */

/**
 * Patient sample highlight color — used for KDE overlays and rug plots.
 * All SpongEffects components must import this instead of hardcoding the hex.
 */
export const PATIENT_HIGHLIGHT_COLOR = '#e53935';
export const PATIENT_HIGHLIGHT_RGBA = (alpha: number) => hexToRgba(PATIENT_HIGHLIGHT_COLOR, alpha);

/** Base HSL colors per TCGA cancer type (disease_name key). */
const TYPE_COLORS_HSL: Record<string, [number, number, number]> = {
  // [hue, saturation%, lightness%]
  pancancer:                              [  0,   0, 50],  // neutral grey

  // Large / multi-subtype cancers — carefully chosen hues for good subtype spread
  breast_invasive_carcinoma:             [305,  70, 52],  // purple-pink    (BRCA — was rose, moved away from red)
  lung_adenocarcinoma:                   [205,  65, 48],  // steel blue     (LUAD)
  lung_squamous_cell_carcinoma:          [195,  55, 55],  // light teal     (LUSC – sibling of LUAD)
  uterine_corpus_endometrial_carcinoma:  [270,  60, 55],  // violet         (UCEC)
  colon_adenocarcinoma:                  [ 28,  70, 48],  // amber-orange   (COAD)
  rectal_adenocarcinoma:                 [ 38,  65, 50],  // warm orange    (READ – CRC sibling)
  kidney_renal_clear_cell_carcinoma:     [175,  65, 44],  // emerald        (KIRC)
  kidney_renal_papillary_cell_carcinoma: [160,  55, 48],  // teal-green     (KIRP – sibling)
  kidney_chromophobe:                    [145,  50, 52],  // sage           (KICH – sibling)
  glioblastoma_multiforme:              [ 26,  75, 45],  // burnt orange   (GBM — was 15°, moved from red)
  brain_lower_grade_glioma:             [ 33,  65, 50],  // warm amber     (LGG – sibling)
  prostate_adenocarcinoma:              [230,  60, 55],  // cornflower     (PRAD)
  bladder_urothelial_carcinoma:         [ 50,  70, 48],  // golden         (BLCA)
  thyroid_carcinoma:                    [295,  55, 58],  // orchid         (THCA)
  skin_cutaneous_melanoma:              [ 85,  60, 44],  // olive          (SKCM)
  liver_hepatocellular_carcinoma:       [ 24,  80, 42],  // deep orange    (LIHC — was hue 10, moved from red)
  stomach_adenocarcinoma:              [185,  55, 48],  // teal-cyan      (STAD — was hue 0, moved from red)
  ovarian_serous_cystadenocarcinoma:   [250,  65, 58],  // periwinkle     (OV)
  cervical_squamous_cell_carcinoma:    [320,  60, 54],  // fuchsia        (CESC)
  head_and_neck_squamous_cell_carcinoma:[120,  50, 45], // forest green   (HNSC)
  esophageal_carcinoma:                [ 43,  65, 46],  // amber          (ESCA — was hue 5, moved from red)
  pancreatic_adenocarcinoma:           [ 56,  80, 44],  // saffron-yellow (PAAD)
  acute_myeloid_leukemia:              [215,  75, 50],  // dodger blue    (LAML)
  diffuse_large_b_cell_lymphoma:       [225,  70, 55],  // medium blue    (DLBC – sibling)
  mesothelioma:                        [ 65,  55, 48],  // yellow-olive   (MESO)
  sarcoma:                             [280,  55, 50],  // purple         (SARC)
  adrenocortical_carcinoma:            [190,  60, 46],  // dark cyan      (ACC)
  testicular_germ_cell_tumor:          [165,  65, 52],  // aquamarine     (TGCT)
  uveal_melanoma:                      [100,  55, 46],  // moss           (UVM)
  pheochromocytoma_and_paraganglioma:  [310,  50, 56],  // mauve          (PCPG)
  uterine_carcinosarcoma:              [260,  65, 54],  // lavender       (UCS – UCEC sibling)
  cholangiocarcinoma:                  [ 48,  75, 46],  // curry          (CHOL)
  thymoma:                             [200,  55, 50],  // cadet blue     (THYM)
};

/** HSL → RGB hex */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/** Hex → HSL */
function hexToHsl(hex: string): [number, number, number] {
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
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/** Derive a subtype color by shifting lightness within the parent type's hue family. */
function deriveSubtypeColor(baseHsl: [number, number, number], index: number, total: number): string {
  const [h, s] = baseHsl;
  // Spread lightness from 35 to 65 across subtypes; center anchors the type color
  const lightnessRange = Math.min(30, Math.max(15, total * 6));
  const lCenter = 50;
  const lStep = total > 1 ? lightnessRange / (total - 1) : 0;
  const l = Math.round(lCenter - lightnessRange / 2 + index * lStep);
  // Tiny hue jitter (±8°) to improve perceptual separation for >3 subtypes
  const hJitter = total > 2 ? ((index - Math.floor(total / 2)) * 8) : 0;
  return hslToHex((h + hJitter + 360) % 360, s, l);
}

/** Normalize a cancer type/subtype string to match the registry key. */
function normalizeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ─── Cache for computed type hex colors ───────────────────────────────────────
const _typeHexCache: Record<string, string> = {};

/**
 * Get a deterministic hex color for a cancer type (and optionally subtype).
 *
 * @param typeName   TCGA cancer type key (e.g. 'breast_invasive_carcinoma') or display name.
 * @param subtypes   Optional: all subtype names for this type (needed to derive the color spread).
 * @param subtypeIndex Optional: index of this specific subtype within the sorted subtypes array.
 */
export function getCancerTypeColor(typeName: string): string {
  const key = normalizeKey(typeName);
  if (_typeHexCache[key]) return _typeHexCache[key];

  if (TYPE_COLORS_HSL[key]) {
    const [h, s, l] = TYPE_COLORS_HSL[key];
    return (_typeHexCache[key] = hslToHex(h, s, l));
  }

  // Fallback: generate a stable color from the hash of the name, avoiding the red zone (330–20°)
  const hash = [...key].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xffffff, 0);
  let h = hash % 360;
  // Avoid red zone: shift hue 330–20° to safer range 25°+
  if (h > 330 || h < 20) h = 25 + (hash % 280);
  return (_typeHexCache[key] = hslToHex(h, 60, 50));
}

/**
 * Get a color for a subtype, derived from its parent type's color family.
 *
 * @param typeName    Parent cancer type key.
 * @param subtypeIndex   Index of this subtype in the sorted list.
 * @param subtypeCount   Total number of subtypes for this type.
 */
export function getCancerSubtypeColor(typeName: string, subtypeIndex: number, subtypeCount: number): string {
  const key = normalizeKey(typeName);
  const baseHsl = TYPE_COLORS_HSL[key] ?? hexToHsl(getCancerTypeColor(typeName));
  return deriveSubtypeColor(baseHsl, subtypeIndex, subtypeCount);
}

/**
 * Build a {name → color} map for a list of prediction classes.
 * Automatically detects subtypes by looking for a shared parent type prefix.
 *
 * @param classes    Array of class names (cancer type or subtype strings).
 * @param parentType If all classes are subtypes of one parent, pass it here.
 */
export function buildColorMap(classes: string[], parentType?: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (parentType) {
    // Subtype mode: derive spread colors from parent type's hue
    classes.forEach((cls, i) => {
      map[cls] = getCancerSubtypeColor(parentType, i, classes.length);
    });
  } else {
    // Type mode: each class gets its canonical color
    classes.forEach(cls => {
      map[cls] = getCancerTypeColor(cls);
    });
  }
  return map;
}

/** Hex color with alpha as rgba string. */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** 
 * Format a disease name or subtype for display. 
 * Converts snake_case to Title Case, preserves special acronyms, and formats subtype names nicely.
 */
export function getDiseaseDisplayName(name: string): string {
  if (!name) return '';

  const lowerName = name.toLowerCase().trim();

  // Canonical subtype display names
  const SUBTYPE_DISPLAY_NAMES: Record<string, string> = {
    'luma': 'LumA',
    'brca_luma': 'LumA',
    'lumb': 'LumB',
    'brca_lumb': 'LumB',
    'her2': 'HER2',
    'brca_her2': 'HER2',
    'basal': 'Basal',
    'brca_basal': 'Basal',
    'normal': 'Normal-like',
    'normal-like': 'Normal-like',
    'brca_normal': 'Normal-like',
    'cms1': 'CMS1',
    'cms2': 'CMS2',
    'cms3': 'CMS3',
    'cms4': 'CMS4',
    'cin': 'CIN',
    'msi': 'MSI',
    'gs': 'GS',
    'hm-snv': 'HM-SNV',
    'hm-indel': 'HM-indel',
    'idhwt': 'IDHwt',
    'idhmut-codel': 'IDHmut-codel',
    'idhmut-non-codel': 'IDHmut-non-codel',
    'unspecific': 'Unspecific'
  };

  if (SUBTYPE_DISPLAY_NAMES[lowerName]) {
    return SUBTYPE_DISPLAY_NAMES[lowerName];
  }

  // Manual overrides for specific TCGA labels or acronyms
  const ACRONYMS = ['tcga', 'brca', 'luad', 'lusc', 'ucec', 'coad', 'read', 'kirc', 'kirp', 'kich', 
                    'gbm', 'lgg', 'prad', 'blca', 'thca', 'skcm', 'lihc', 'stad', 'ov', 'cesc', 
                    'hnsc', 'esca', 'paad', 'laml', 'dlbc', 'meso', 'sarc', 'acc', 'tgct', 'uvm', 
                    'pcpg', 'ucs', 'chol', 'thym'];

  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => {
      const lower = word.toLowerCase();
      if (SUBTYPE_DISPLAY_NAMES[lower]) return SUBTYPE_DISPLAY_NAMES[lower];
      if (ACRONYMS.includes(lower)) return word.toUpperCase();
      if (lower === 'pancancer') return 'Pan-cancer';
      // If word already has mixed casing (e.g. LumA, LumB, Her2), preserve it
      if (word !== lower && word !== word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
