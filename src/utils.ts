import { denominations, formatQi as quaisFormatQi, parseQi as quaisParseQi } from 'quais';

/**
 * Qi denomination utilities
 * 
 * Qi uses a UTXO model with fixed denominations (like cash bills).
 * The smallest unit is 1 Qit, where 1000 Qit = 1 Qi.
 * 
 * Denomination indices map to values:
 *   0 = 1 Qit (0.001 Qi)
 *   1 = 5 Qit (0.005 Qi)
 *   2 = 10 Qit (0.01 Qi)
 *   ...
 *   6 = 1000 Qit (1 Qi)
 *   ...
 *   14 = 1,000,000,000 Qit (1,000,000 Qi)
 */

/**
 * Convert Qit (smallest unit) to human-readable Qi string
 * @param qit - Amount in Qit (smallest unit)
 * @returns Human-readable Qi amount (e.g., "1.5")
 */
export function formatQi(qit: bigint): string {
  return quaisFormatQi(qit);
}

/**
 * Convert human-readable Qi to Qit (smallest unit)
 * @param qi - Amount in Qi (e.g., "1.5" or 1.5)
 * @returns Amount in Qit as bigint
 */
export function parseQi(qi: string | number): bigint {
  return quaisParseQi(qi.toString());
}

/**
 * Get the Qit value for a denomination index
 * @param index - Denomination index (0-14)
 * @returns Value in Qit
 */
export function getDenominationValue(index: number): bigint {
  if (index < 0 || index >= denominations.length) {
    throw new Error(`Invalid denomination index: ${index}`);
  }
  return denominations[index];
}

/**
 * Get the Qi value for a denomination index
 * @param index - Denomination index (0-14)
 * @returns Value in Qi as a number
 */
export function getDenominationQi(index: number): number {
  const qit = getDenominationValue(index);
  return Number(qit) / 1000;
}

/**
 * Calculate total Qit from an array of denomination indices
 * @param indices - Array of denomination indices
 * @returns Total value in Qit
 */
export function sumDenominations(indices: number[]): bigint {
  return indices.reduce((sum, idx) => sum + getDenominationValue(idx), 0n);
}

/**
 * Format a balance in Qit to a display string with units
 * @param qit - Amount in Qit
 * @param decimals - Number of decimal places (default: 3)
 * @returns Formatted string like "1.500 Qi"
 */
export function formatBalance(qit: bigint, decimals: number = 3): string {
  const qi = Number(qit) / 1000;
  return `${qi.toFixed(decimals)} Qi`;
}

/**
 * Constants for common amounts
 */
export const QI_UNITS = {
  /** 1 Qit (smallest unit) */
  QIT: 1n,
  /** 1 Qi = 1000 Qit */
  QI: 1000n,
  /** 1 kiloQi = 1,000,000 Qit */
  KILO_QI: 1000000n,
} as const;
