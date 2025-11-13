/**
 * Escapes special regex characters in a string to prevent regex injection attacks
 * @param {string} string - The string to escape
 * @returns {string} - The escaped string safe for use in RegExp
 */
export function escapeRegex(string) {
  if (typeof string !== 'string') {
    return '';
  }
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
