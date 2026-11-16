/**
 * Sri Lanka Ministry of Education (MOE) - IPMIS Financial Precision Formatter
 * 
 * Financial Regulation Standards:
 * - Base Currency: Sri Lankan Rupee (LKR / Rs.) with cents (1 Rupee = 100 cents).
 * - Macro Declarations: Expressed in Millions (Mn).
 * - 6 Decimal Places Precision Standard (Applicable to Entire System):
 *     1 Rupee = 0.000001 Mn (6 decimal places)
 *     1 Cent  = 0.00000001 Mn (8 decimal places)
 * 
 * Rules:
 * - All fund declarations across the entire system enforce 6 DECIMAL PLACES standard.
 * - When expressed in Millions (Mn), display exactly 6 decimal places by default (e.g. 4.800000 Mn, 0.000005 Mn).
 * - Input fields accept up to 6 decimal places without browser step validation blocking.
 * - Provide dual declarations (Millions + Exact Rupee cents) in communications, cards, and export dossiers.
 */

export interface FormatMillionOptions {
  minDecimals?: number;
  maxDecimals?: number;
  withUnit?: boolean;
  prefixRs?: boolean;
}

/**
 * Cleanly parse an amount to a clean floating number in Millions.
 * Resilient against strings with "Rs.", "Mn", commas, or unnormalized raw rupee numbers (>= 10,000).
 */
export function parseAmountToMn(val: number | string | null | undefined): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') {
    if (isNaN(val)) return 0;
    // If raw rupees were provided (>= 10,000), normalize to Millions
    if (val >= 10000) return val / 1000000;
    return val;
  }

  const clean = String(val)
    .replace(/,/g, '')
    .replace(/Rs\.?/gi, '')
    .replace(/Mn/gi, '')
    .trim();
  const parsed = parseFloat(clean);
  if (isNaN(parsed)) return 0;
  if (parsed >= 10000) return parsed / 1000000;
  return parsed;
}

/**
 * Rounds a Million value strictly to the 6th decimal place (exact to 1 Rupee in Millions: 0.000001 Mn).
 * Eliminates IEEE-754 floating point representation artifacts.
 */
export function roundToCentInMn(valMn: number): number {
  if (!valMn || isNaN(valMn)) return 0;
  return Math.round(valMn * 1000000) / 1000000;
}

/**
 * Strict 6-decimal precision rounding helper for national budget allocations.
 */
export function roundTo6Decimals(valMn: number): number {
  if (!valMn || isNaN(valMn)) return 0;
  return Math.round(valMn * 1000000) / 1000000;
}

/**
 * Rounds a Rupee value strictly to 2 decimal places (exact to 1 cent: Rs. 0.01).
 */
export function roundToCentInRupees(valRs: number): number {
  if (!valRs || isNaN(valRs)) return 0;
  return Math.round(valRs * 100) / 100;
}

/**
 * Formats a fund amount in Millions (Mn) strictly to 6 decimal places across the entire system.
 * Default: 6 decimals (1 Rupee = 0.000001 Mn).
 * 
 * Examples:
 *   formatMillion(18.5) => "18.500000"
 *   formatMillion(0.00005) => "0.000050"
 *   formatMillion(0.000005) => "0.000005"
 *   formatMillion(0.000005, { withUnit: true }) => "0.000005 Mn"
 */
export function formatMillion(
  val: number | string | null | undefined,
  options: FormatMillionOptions = {}
): string {
  if (val === null || val === undefined || val === '') return '-';
  const num = parseAmountToMn(val);
  if (isNaN(num)) return '-';

  const minDec = options.minDecimals ?? 6;
  const maxDec = options.maxDecimals ?? 6;
  const rounded = roundTo6Decimals(num);

  // Format to maxDecimals (6 decimal places by default)
  const fixed = rounded.toFixed(maxDec);
  const [intPart, decPart = ''] = fixed.split('.');

  // Trim trailing zeros only if minDecimals is explicitly specified smaller than maxDecimals
  let trimmedDec = decPart;
  while (trimmedDec.length > minDec && trimmedDec.endsWith('0')) {
    trimmedDec = trimmedDec.slice(0, -1);
  }

  // Add thousand separators to integer part
  const formattedInt = Number(intPart).toLocaleString('en-US');
  const result = trimmedDec.length > 0 ? `${formattedInt}.${trimmedDec}` : formattedInt;

  const prefix = options.prefixRs ? 'Rs. ' : '';
  const suffix = options.withUnit ? ' Mn' : '';

  return `${prefix}${result}${suffix}`;
}

/**
 * Formats an amount in Sri Lankan Rupees (Rs.) strictly down to the last cent (.00 cents).
 * 
 * Examples:
 *   formatRupees(18.5, true) => "Rs. 18,500,000.00"
 *   formatRupees(98000067.5, false) => "Rs. 98,000,067.50"
 *   formatRupees(0.00000075, true) => "Rs. 0.75"
 */
export function formatRupees(
  val: number | string | null | undefined,
  isMillionInput: boolean = true
): string {
  if (val === null || val === undefined || val === '') return 'Rs. 0.00';
  let num: number;
  if (typeof val === 'number') {
    num = val;
  } else {
    const clean = String(val).replace(/,/g, '').replace(/Rs\.?/gi, '').replace(/Mn/gi, '').trim();
    num = parseFloat(clean);
  }
  if (isNaN(num)) return 'Rs. 0.00';

  let rupees = isMillionInput && num < 10000 ? num * 1000000 : num;
  rupees = roundToCentInRupees(rupees);

  return `Rs. ${rupees.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Generates an institutional dual declaration string for reports and communication bulletins:
 * e.g. "98.0000675 Mn (Rs. 98,000,067.50)"
 */
export function formatDualDeclaration(val: number | string | null | undefined): {
  inMillion: string;
  inRupees: string;
  combined: string;
} {
  const mnStr = formatMillion(val, { withUnit: true, prefixRs: false });
  const rsStr = formatRupees(val, true);
  return {
    inMillion: mnStr,
    inRupees: rsStr,
    combined: `${mnStr} (${rsStr})`,
  };
}
