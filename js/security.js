/* =====================================================
   SECURITY UTILITIES – ABANG KUCING
   XSS protection and input sanitization
   ===================================================== */

(function () {
  // Escape HTML to prevent XSS
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Sanitize object - escape all string values
  function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const result = {};
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        result[key] = escapeHtml(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        result[key] = sanitizeObject(obj[key]);
      } else {
        result[key] = obj[key];
      }
    }
    return result;
  }

  // Validate phone number (Malaysia format)
  function isValidPhone(phone) {
    if (!phone) return true; // optional field
    const cleaned = phone.replace(/[\s-]/g, '');
    return /^(\+?60|0)[0-9]{8,11}$/.test(cleaned);
  }

  // Validate input length
  function isValidLength(str, min, max) {
    if (!str) return min === 0;
    return str.length >= min && str.length <= max;
  }

  // Expose globally
  window.escapeHtml = escapeHtml;
  window.sanitizeObject = sanitizeObject;
  window.isValidPhone = isValidPhone;
  window.isValidLength = isValidLength;
})();
