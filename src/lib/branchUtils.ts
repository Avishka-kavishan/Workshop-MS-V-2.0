/**
 * Branch Abbreviation & Visual Identity Utilities (Google-style 2-3 Letter Badges)
 * Examples:
 * - Teacher Establishment Branch -> TEB
 * - Policy & Planning Branch -> PPB
 * - MOE ICT Branch -> ICT
 * - Quality Assurance Branch -> QAB
 * - Curriculum Development Branch -> CDB
 */

const KNOWN_BRANCH_ABBREVIATIONS: Record<string, string> = {
  // Key National Branches
  'teacher establishment branch': 'TEB',
  'teacher education branch': 'TEB',
  'teacher education': 'TEB',
  'policy & planning branch': 'PPB',
  'policy and planning branch': 'PPB',
  'moe planning branch': 'PPB',
  'planning branch': 'PPB',
  'moe - planning branch': 'PPB',
  'moe ict branch': 'ICT',
  'ict branch': 'ICT',
  'information and communication technology': 'ICT',
  'information & communication technology (ict) branch': 'ICT',
  'information & communication technology branch': 'ICT',
  'curriculum development branch': 'CDB',
  'quality assurance branch': 'QAB',
  'quality assurance & accreditation branch': 'QAB',
  'education quality development branch': 'EQD',
  'education quality development': 'EQD',
  'eqd branch': 'EQD',
  'moe eqd branch': 'EQD',
  'eqd': 'EQD',
  'data management branch': 'DMB',
  'data management & emis branch': 'DMB',
  'human resource development branch': 'HRD',
  'finance & procurement branch': 'FPB',
  'finance and procurement branch': 'FPB',
  'national institute of education': 'NIE',
  'national institute of education (nie)': 'NIE',
  'school infrastructure branch': 'SIB',
  'school infrastructure & physical planning division': 'SIB',
  'health, nutrition & student welfare branch': 'SHN',
  'health and nutrition branch': 'SHN',
  'special education branch': 'SEB',
  'primary education branch': 'PEB',
  'aesthetic education branch': 'AEB',
  'research & development branch': 'RDB',
  'english & foreign languages branch': 'EFL',
  'religious & value education branch': 'RVE',
  'non-formal & special education': 'NFE',
  'school library development branch': 'SLB',
  'pirivena education branch': 'PEB',
  'colleges of education branch': 'COE',
  'examination department': 'DoE',
  'educational publications department': 'EPD',

  // Provincial Education Branches
  'western province education branch': 'WPE',
  'western province education department': 'WPE',
  'central province education branch': 'CPE',
  'central province education department': 'CPE',
  'southern province education branch': 'SPE',
  'southern province education department': 'SPE',
  'northern province education branch': 'NPE',
  'northern province education department': 'NPE',
  'eastern province education branch': 'EPE',
  'eastern province education department': 'EPE',
  'north western province education branch': 'NWP',
  'north western province education department': 'NWP',
  'north central province education branch': 'NCP',
  'north central province education department': 'NCP',
  'uva province education branch': 'UPE',
  'uva province education department': 'UPE',
  'sabaragamuwa province education branch': 'SAB',
  'sabaragamuwa province education department': 'SAB',
};

const GOOGLE_AVATAR_PALETTE = [
  { bg: '#1A73E8', text: '#FFFFFF' }, // Google Royal Blue
  { bg: '#0F766E', text: '#FFFFFF' }, // Deep Teal
  { bg: '#EA4335', text: '#FFFFFF' }, // Google Red
  { bg: '#137333', text: '#FFFFFF' }, // Google Green
  { bg: '#7E22CE', text: '#FFFFFF' }, // Purple
  { bg: '#E37400', text: '#FFFFFF' }, // Amber Orange
  { bg: '#8D153A', text: '#FFFFFF' }, // Sri Lanka MoE Maroon
  { bg: '#0284C7', text: '#FFFFFF' }, // Cyan
  { bg: '#C2185B', text: '#FFFFFF' }, // Rose Pink
  { bg: '#00838F', text: '#FFFFFF' }, // Deep Cyan
  { bg: '#5D4037', text: '#FFFFFF' }, // Warm Brown
  { bg: '#3949AB', text: '#FFFFFF' }, // Indigo
];

/**
 * Returns a clean, max 3-letter uppercase abbreviation for any branch/organization name.
 * e.g. "Teacher Establishment Branch" -> "TEB"
 */
export function getBranchAbbreviation(name?: string, existingCode?: string): string {
  if (existingCode && existingCode.length <= 3 && /^[a-zA-Z]{2,3}$/.test(existingCode)) {
    return existingCode.toUpperCase();
  }

  if (!name || typeof name !== 'string') return 'MOE';
  const raw = name.trim();
  const lower = raw.toLowerCase();

  // 1. Direct dictionary match
  if (KNOWN_BRANCH_ABBREVIATIONS[lower]) {
    return KNOWN_BRANCH_ABBREVIATIONS[lower];
  }

  // Check partial key matches
  for (const [key, abbr] of Object.entries(KNOWN_BRANCH_ABBREVIATIONS)) {
    if (lower.includes(key)) {
      return abbr;
    }
  }

  // 2. Strip leading institutional prefixes
  let s = raw.replace(/^(moe|ministry\s+of\s+education)\s*[-–—:]*\s*/i, '');

  // 3. Known acronym regex
  if (/\bICT\b/i.test(s)) return 'ICT';
  if (/\bNIE\b/i.test(s)) return 'NIE';
  if (/\bEMIS\b/i.test(s)) return 'EMS';
  if (/\bGIS\b/i.test(s)) return 'GIS';
  if (/\bSTEM\b/i.test(s)) return 'STM';
  if (/\bNCOE\b/i.test(s)) return 'NCE';

  // 4. Strip stop words
  const clean = s
    .replace(/\b(and|of|the|in|for|to|at|&)\b/gi, ' ')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = clean.split(' ').filter((w) => w.length > 0);

  if (words.length >= 3) {
    // E.g. "Teacher Establishment Branch" -> T + E + B = TEB
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  } else if (words.length === 2) {
    if (words[0].length >= 2) {
      return (words[0].slice(0, 2) + words[1][0]).toUpperCase();
    }
    return (words[0][0] + words[1].slice(0, 2)).toUpperCase();
  } else if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }

  return 'MOE';
}

/**
 * Returns a deterministic Google Material color palette for a branch.
 */
export function getBranchColor(nameOrAbbr?: string): { bg: string; text: string } {
  const str = (nameOrAbbr || 'MOE').trim();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GOOGLE_AVATAR_PALETTE.length;
  return GOOGLE_AVATAR_PALETTE[index];
}
