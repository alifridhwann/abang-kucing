/* =====================================================
   NAV HELPER – CLEAN ROUTES (NO .html)
   Usage:
     go('login')
     go('booking?x=1')
     goReplace('customer')
   ===================================================== */

(function () {
  function isExternal(url) {
    return /^https?:\/\//i.test(url);
  }

  function normalizePath(path) {
    const p = String(path || '').trim();
    if (!p) return '/';
    if (isExternal(p)) return p;

    // keep query/hash intact
    const match = p.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
    const rawPath = (match?.[1] ?? '').trim();
    const query = match?.[2] ?? '';
    const hash = match?.[3] ?? '';

    // strip extension + slashes
    const cleaned = rawPath
      .replace(/\.html$/i, '')
      .replace(/^\/+/, '')
      .replace(/\/+$/, '');

    const finalPath = cleaned ? `/${cleaned}` : '/';
    return `${finalPath}${query}${hash}`;
  }

  function go(route) {
    window.location.href = normalizePath(route);
  }

  function goReplace(route) {
    window.location.replace(normalizePath(route));
  }

  // Expose globally (simple & predictable)
  window.go = go;
  window.goReplace = goReplace;
})();

