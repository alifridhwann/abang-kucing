/* =====================================================
   TOAST NOTIFICATION – ABANG KUCING
   Usage:
     toast.success('Berjaya!')
     toast.error('Gagal!')
     toast.info('Maklumat...')
   ===================================================== */

(function () {
  // Create container if not exists
  function getContainer() {
    let container = document.getElementById('ak-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ak-toast-container';
      container.className = 'ak-toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  function show(message, type = 'info', duration = 3000) {
    const container = getContainer();

    const toast = document.createElement('div');
    toast.className = `ak-toast ak-toast--${type}`;

    // Icon based on type
    const icons = {
      success: '<i class="bi bi-check-circle-fill"></i>',
      error: '<i class="bi bi-x-circle-fill"></i>',
      info: '<i class="bi bi-info-circle-fill"></i>',
      warning: '<i class="bi bi-exclamation-circle-fill"></i>'
    };

    toast.innerHTML = `
      <span class="ak-toast-icon">${icons[type] || icons.info}</span>
      <span class="ak-toast-msg">${message}</span>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('ak-toast--show');
    });

    // Auto dismiss
    setTimeout(() => {
      toast.classList.remove('ak-toast--show');
      toast.classList.add('ak-toast--hide');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Expose globally
  window.toast = {
    success: (msg, duration) => show(msg, 'success', duration),
    error: (msg, duration) => show(msg, 'error', duration),
    info: (msg, duration) => show(msg, 'info', duration),
    warning: (msg, duration) => show(msg, 'warning', duration)
  };
})();
