/**
 * Currency utility functions
 */

/**
 * Currency symbol mapping
 */
const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "$",
  AUD: "$",
  GEL: "₾",
};

/**
 * Get currency symbol from currency code
 * @param {string} currencyCode - ISO currency code (USD, EUR, etc.)
 * @returns {string} Currency symbol
 */
export function getCurrencySymbol(currencyCode) {
  return CURRENCY_SYMBOLS[currencyCode] || "$";
}

/**
 * Format price with currency symbol
 * @param {number|string} price - Price value
 * @param {string} currencyCode - ISO currency code
 * @returns {string} Formatted price with currency symbol
 */
export function formatPrice(price, currencyCode = "USD") {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${price}`;
}
