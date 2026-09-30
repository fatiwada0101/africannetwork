/**
 * HTML Sanitization Utility
 * 
 * Escapes HTML special characters to prevent XSS attacks
 * in user-supplied text that gets rendered in the UI.
 */

/**
 * Escape HTML special characters in a string.
 * @param {string} input
 * @returns {string}
 */
export function sanitizeHtml(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Strip HTML tags entirely from a string (more aggressive than escaping).
 * @param {string} input
 * @returns {string}
 */
export function stripHtml(input) {
  if (typeof input !== 'string') return input;
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize an object's string values recursively.
 * @param {Object} obj
 * @returns {Object}
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeHtml(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
