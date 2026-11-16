/**
 * Sri Lankan & International Identification Validation & Duplicate Detection Engine
 * Supports:
 *  - Sri Lankan Old NIC (9 digits + V/X) with DOB & Gender decoding
 *  - Sri Lankan New NIC (12 digits) with DOB & Gender decoding
 *  - Cross-conversion between Old and New NIC
 *  - Sri Lankan Passport validation
 *  - Foreign Passport & International Citizenship validation
 *  - Phone & Email validation
 *  - Fuzzy duplicate matching (Name, Phone, Email, NIC cross-match)
 */

export interface NicValidationResult {
  isValid: boolean;
  type?: 'Old NIC' | 'New NIC';
  error?: string;
  birthYear?: number;
  gender?: 'Male' | 'Female';
  dayOfYear?: number;
  dobFormatted?: string;
  normalizedNic: string;
  equivalentNic?: string; // Old converted to New, or New converted to Old
}

export interface PassportValidationResult {
  isValid: boolean;
  type: 'Sri Lankan' | 'Foreign';
  error?: string;
  normalized: string;
}

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  normalized: string;
}

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  normalized: string;
}

export interface SimilarityMatchResult {
  score: number; // 0 to 100
  isLikelyDuplicate: boolean;
  isExactMatch: boolean;
  matchedFields: string[];
  reasons: string[];
  existingRecord: any;
}

/**
 * Validates Sri Lankan Old NIC: 9 digits followed by 'V' or 'X' (case-insensitive)
 * E.g., 851234567V, 745891234X
 */
export function validateOldNic(input: string): NicValidationResult {
  const clean = input.trim().toUpperCase();
  const pattern = /^[0-9]{9}[VX]$/;

  if (!pattern.test(clean)) {
    return {
      isValid: false,
      error: 'Old NIC must be exactly 9 digits followed by "V" or "X" (e.g., 851234567V).',
      normalizedNic: clean,
    };
  }

  const yearDigits = parseInt(clean.substring(0, 2), 10);
  const birthYear = 1900 + yearDigits;
  let dayOfYear = parseInt(clean.substring(2, 5), 10);

  let gender: 'Male' | 'Female' = 'Male';
  if (dayOfYear > 500) {
    gender = 'Female';
    dayOfYear -= 500;
  }

  if (dayOfYear < 1 || dayOfYear > 366) {
    return {
      isValid: false,
      error: `Invalid day-of-year code (${clean.substring(2, 5)}). Must be between 001-366 for male or 501-866 for female.`,
      normalizedNic: clean,
    };
  }

  // Approximate DOB
  const dobFormatted = getApproximateDateString(birthYear, dayOfYear);

  // Equivalent New NIC: 19YY + DDD + '0' + serial + check
  // e.g. 851234567V -> 198512304567
  const serialAndCheck = clean.substring(5, 9);
  const equivalentNewNic = `19${clean.substring(0, 5)}0${serialAndCheck}`;

  return {
    isValid: true,
    type: 'Old NIC',
    birthYear,
    gender,
    dayOfYear,
    dobFormatted,
    normalizedNic: clean,
    equivalentNic: equivalentNewNic,
  };
}

/**
 * Validates Sri Lankan New NIC: exactly 12 numeric digits
 * E.g., 198512304567, 200154201824
 */
export function validateNewNic(input: string): NicValidationResult {
  const clean = input.trim();
  const pattern = /^[0-9]{12}$/;

  if (!pattern.test(clean)) {
    return {
      isValid: false,
      error: 'New NIC must be exactly 12 numeric digits (e.g., 198512304567).',
      normalizedNic: clean,
    };
  }

  const birthYear = parseInt(clean.substring(0, 4), 10);
  const currentYear = new Date().getFullYear();

  if (birthYear < 1920 || birthYear > currentYear) {
    return {
      isValid: false,
      error: `Invalid birth year (${birthYear}) in New NIC. Must be between 1920 and ${currentYear}.`,
      normalizedNic: clean,
    };
  }

  let dayOfYear = parseInt(clean.substring(4, 7), 10);
  let gender: 'Male' | 'Female' = 'Male';
  if (dayOfYear > 500) {
    gender = 'Female';
    dayOfYear -= 500;
  }

  if (dayOfYear < 1 || dayOfYear > 366) {
    return {
      isValid: false,
      error: `Invalid day-of-year code (${clean.substring(4, 7)}). Must be between 001-366 for male or 501-866 for female.`,
      normalizedNic: clean,
    };
  }

  const dobFormatted = getApproximateDateString(birthYear, dayOfYear);

  // If born in 1900-1999 and 8th digit is 0, equivalent Old NIC can be: YY + DDD + serial(3) + check(1) + 'V'
  let equivalentOldNic: string | undefined = undefined;
  if (birthYear >= 1900 && birthYear <= 1999) {
    const yy = clean.substring(2, 4);
    const ddd = clean.substring(4, 7);
    const serialAndCheck = clean.substring(8, 12);
    equivalentOldNic = `${yy}${ddd}${serialAndCheck}V`;
  }

  return {
    isValid: true,
    type: 'New NIC',
    birthYear,
    gender,
    dayOfYear,
    dobFormatted,
    normalizedNic: clean,
    equivalentNic: equivalentOldNic,
  };
}

/**
 * Universal Sri Lankan NIC Validator: supports both Old (9+V/X) and New (12 digits)
 */
export function validateSriLankanNic(input: string): NicValidationResult {
  const clean = input.trim();
  if (!clean) {
    return {
      isValid: false,
      error: 'NIC number is required for Sri Lankan citizens.',
      normalizedNic: '',
    };
  }

  // Check length to select Old vs New validator
  const cleanUpper = clean.toUpperCase();
  if (cleanUpper.length === 10 || cleanUpper.endsWith('V') || cleanUpper.endsWith('X')) {
    return validateOldNic(cleanUpper);
  } else if (clean.length === 12 && /^[0-9]+$/.test(clean)) {
    return validateNewNic(clean);
  }

  // If length is neither, provide helpful error
  return {
    isValid: false,
    error: 'Invalid Sri Lankan NIC format. Enter an Old NIC (9 digits + V/X, e.g. 851234567V) or New NIC (12 digits, e.g. 198512304567).',
    normalizedNic: cleanUpper,
  };
}

/**
 * Validates Sri Lankan Passport
 * Sri Lankan passports standard: Starts with an uppercase letter (commonly N, L, K, M) followed by 7 or 8 digits.
 * E.g. N1234567, N12345678
 */
export function validateSriLankanPassport(input: string): PassportValidationResult {
  const clean = input.trim().toUpperCase().replace(/\s+/g, '');
  if (!clean) {
    return {
      isValid: false,
      type: 'Sri Lankan',
      error: 'Passport number is required.',
      normalized: '',
    };
  }

  const pattern = /^[A-Z][0-9]{7,8}$/;
  if (!pattern.test(clean)) {
    return {
      isValid: false,
      type: 'Sri Lankan',
      error: 'Sri Lankan passport number must start with a letter followed by 7 or 8 digits (e.g. N1234567 or N12345678).',
      normalized: clean,
    };
  }

  return {
    isValid: true,
    type: 'Sri Lankan',
    normalized: clean,
  };
}

/**
 * Validates Foreign Passport
 * International passport standard: 6 to 15 alphanumeric characters, letters and numbers only.
 * E.g. P12345678, GB1234567, 987654321, E34582190
 */
export function validateForeignPassport(input: string): PassportValidationResult {
  const clean = input.trim().toUpperCase().replace(/[\s\-_]/g, '');
  if (!clean) {
    return {
      isValid: false,
      type: 'Foreign',
      error: 'Foreign passport number is required.',
      normalized: '',
    };
  }

  const pattern = /^[A-Z0-9]{6,15}$/;
  if (!pattern.test(clean)) {
    return {
      isValid: false,
      type: 'Foreign',
      error: 'Foreign passport number must be 6 to 15 alphanumeric characters (e.g. GB1234567 or 987654321).',
      normalized: clean,
    };
  }

  return {
    isValid: true,
    type: 'Foreign',
    normalized: clean,
  };
}

/**
 * Validates Telephone / Mobile Number
 * Supports Sri Lankan standard formats (0712345678, +94712345678, 0912234567) or valid international phone
 */
export function validatePhone(input: string): PhoneValidationResult {
  const raw = input.trim();
  if (!raw) {
    return { isValid: true, normalized: '' }; // Optional in some forms, but validated if entered
  }

  const clean = raw.replace(/[\s\-\(\)]/g, '');
  // Sri Lankan local (10 digits starting with 0) or international (+94... or other international +CC...)
  const slPattern = /^(?:0|\+94)[1-9][0-9]{8}$/;
  const intlPattern = /^\+?[0-9]{8,15}$/;

  if (slPattern.test(clean) || intlPattern.test(clean)) {
    return {
      isValid: true,
      normalized: clean,
    };
  }

  return {
    isValid: false,
    error: 'Enter a valid 10-digit Sri Lankan phone number (e.g. 0771234567) or international number with country code (+94771234567).',
    normalized: clean,
  };
}

/**
 * Validates Email Address
 */
export function validateEmail(input: string): EmailValidationResult {
  const clean = input.trim().toLowerCase();
  if (!clean) {
    return { isValid: true, normalized: '' };
  }

  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!pattern.test(clean)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address (e.g. officer@moe.gov.lk).',
      normalized: clean,
    };
  }

  return {
    isValid: true,
    normalized: clean,
  };
}

/**
 * Helper: Converts day of year to approximate readable Date (DD/MM/YYYY)
 */
function getApproximateDateString(year: number, dayOfYear: number): string {
  const date = new Date(year, 0); // Jan 1st
  date.setDate(dayOfYear);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${year}`;
}

/**
 * Normalizes a name by stripping academic titles (Prof, Dr, Mr, Mrs, Ven, Rev) and punctuation
 */
export function normalizeNameForComparison(name: string): string[] {
  if (!name) return [];
  const titles = new Set(['prof', 'dr', 'mr', 'mrs', 'ms', 'miss', 'rev', 'ven', 'swami', 'pandit', 'vidyanidhi']);
  const tokens = name
    .toLowerCase()
    .replace(/[.,\-_/\\()]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !titles.has(t));
  return tokens;
}

/**
 * Computes similarity between a candidate resource person and an existing record.
 * Checks:
 *  - Exact NIC match or Old/New NIC cross match (100% match)
 *  - Exact Passport match (100% match)
 *  - Exact Phone match (80% match)
 *  - Exact Email match (80% match)
 *  - Name similarity (token intersection / Jaccard / substring) (50-80% match)
 *  - Workplace similarity (bonus weight)
 */
export function compareResourcePersons(candidate: any, existing: any): SimilarityMatchResult {
  let score = 0;
  const matchedFields: string[] = [];
  const reasons: string[] = [];

  const candNic = (candidate.nic || '').trim().toUpperCase();
  const existNic = (existing.nic || '').trim().toUpperCase();

  const candPassport = (candidate.passportNumber || candidate.passport || '').trim().toUpperCase();
  const existPassport = (existing.passportNumber || existing.passport || '').trim().toUpperCase();

  // 1. Exact NIC Match
  if (candNic && existNic && candNic === existNic) {
    score = 100;
    matchedFields.push('NIC (Exact Match)');
    reasons.push(`Exact National Identity Card match: ${candNic}`);
  }

  // 1b. Old NIC vs New NIC Cross-Match!
  if (candNic && existNic && candNic !== existNic) {
    const candValid = validateSriLankanNic(candNic);
    const existValid = validateSriLankanNic(existNic);
    if (candValid.isValid && existValid.isValid) {
      if (
        candValid.equivalentNic === existNic ||
        existValid.equivalentNic === candNic ||
        (candValid.birthYear === existValid.birthYear &&
          candValid.dayOfYear === existValid.dayOfYear &&
          candValid.gender === existValid.gender)
      ) {
        score = Math.max(score, 95);
        matchedFields.push('NIC (Old/New Conversion Match)');
        reasons.push(`NIC cross-matched across Old/New formats: ${candNic} corresponds to ${existNic}`);
      }
    }
  }

  // 2. Exact Passport Match
  if (candPassport && existPassport && candPassport === existPassport) {
    score = 100;
    matchedFields.push('Passport Number (Exact Match)');
    reasons.push(`Exact passport number match: ${candPassport}`);
  }

  // 3. Email Match
  const candEmail = (candidate.email || '').trim().toLowerCase();
  const existEmail = (existing.email || '').trim().toLowerCase();
  if (candEmail && existEmail && candEmail === existEmail) {
    score = Math.max(score, 85);
    matchedFields.push('Email Address');
    reasons.push(`Identical email address: ${candEmail}`);
  }

  // 4. Phone Match
  const candPhone = (candidate.phone || '').trim().replace(/[\s\-\(\)\+]/g, '').replace(/^94/, '0');
  const existPhone = (existing.phone || '').trim().replace(/[\s\-\(\)\+]/g, '').replace(/^94/, '0');
  if (candPhone && existPhone && candPhone.length >= 9 && candPhone === existPhone) {
    score = Math.max(score, 80);
    matchedFields.push('Phone Number');
    reasons.push(`Identical contact telephone: ${candidate.phone}`);
  }

  // 5. Name Similarity
  const candTokens = normalizeNameForComparison(candidate.name || '');
  const existTokens = normalizeNameForComparison(existing.name || '');

  if (candTokens.length > 0 && existTokens.length > 0) {
    // Intersecting tokens
    const commonTokens = candTokens.filter((t) => existTokens.includes(t));
    const tokenScore = (2 * commonTokens.length) / (candTokens.length + existTokens.length);

    if (tokenScore >= 0.75) {
      const nameScore = Math.round(tokenScore * 75);
      score = Math.max(score, nameScore);
      matchedFields.push('Full Name (High Similarity)');
      reasons.push(`Names share key name components: "${commonTokens.join(' ')}"`);
    } else if (commonTokens.length >= 2) {
      score = Math.max(score, 60);
      matchedFields.push('Full Name (Moderate Overlap)');
      reasons.push(`Names share 2 or more names: "${commonTokens.join(' ')}"`);
    } else if (commonTokens.length === 1 && candTokens.length === 1 && existTokens.length === 1) {
      score = Math.max(score, 50);
      matchedFields.push('Surname Match');
      reasons.push(`Single name match: "${commonTokens[0]}"`);
    }
  }

  // 6. Workplace correlation boost
  const candWork = (candidate.workplace || candidate.organization || '').trim().toLowerCase();
  const existWork = (existing.workplace || existing.organization || '').trim().toLowerCase();
  if (candWork && existWork && (candWork.includes(existWork) || existWork.includes(candWork)) && matchedFields.length > 0) {
    score = Math.min(100, score + 10);
    matchedFields.push('Workplace / Institution');
    reasons.push(`Affiliated with same workplace: "${existing.workplace || existing.organization}"`);
  }

  const isExactMatch = score >= 95;
  const isLikelyDuplicate = score >= 60;

  return {
    score,
    isLikelyDuplicate,
    isExactMatch,
    matchedFields,
    reasons,
    existingRecord: existing,
  };
}

/**
 * Searches a list of existing resource persons for exact matches and potential duplicates.
 * Returns sorted list of matches descending by score.
 */
export function findSimilarResourcePersons(
  candidate: any,
  existingList: any[]
): SimilarityMatchResult[] {
  if (!candidate) return [];
  const results: SimilarityMatchResult[] = [];

  for (const existing of existingList) {
    // Skip comparing record against itself if editing
    if (candidate.id && existing.id === candidate.id) continue;

    const res = compareResourcePersons(candidate, existing);
    if (res.isLikelyDuplicate) {
      results.push(res);
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * List of countries for Foreign Resource Persons dropdown
 */
export const POPULAR_COUNTRIES = [
  'India',
  'United Kingdom',
  'United States',
  'Australia',
  'Singapore',
  'Japan',
  'Canada',
  'Germany',
  'France',
  'New Zealand',
  'Malaysia',
  'South Korea',
  'China',
  'Netherlands',
  'Sweden',
  'Switzerland',
  'United Arab Emirates',
  'Saudi Arabia',
  'Thailand',
  'Bangladesh',
  'Pakistan',
  'Maldives',
  'Nepal',
  'South Africa',
  'Other International',
];
