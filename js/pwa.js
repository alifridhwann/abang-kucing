/* =====================================================
   PWA BOOTSTRAP – ABANG KUCING
   - Register service worker
   - Show install suggestion banner (A2HS)
   ===================================================== */

(function () {
  if (!('serviceWorker' in navigator)) return;

  const LS_KEY = 'ak_pwa_install_banner';
  const DISMISS_DAYS = 14;

  function nowTs() {
    return Date.now();
  }

  function daysToMs(days) {
    return days * 24 * 60 * 60 * 1000;
  }

  function getBannerState() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    } catch {
      return null;
    }
  }

  function setBannerState(state) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }

  function isStandalone() {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator?.standalone === true
    );
  }

  function isIOS() {
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/i.test(ua);
  }

  function shouldShowBanner() {
    if (isStandalone()) return false;
    const state = getBannerState();
    if (!state) return true;
    if (state?.installed) return false;
    if (state?.dismissedAt && nowTs() - state.dismissedAt < daysToMs(DISMISS_DAYS)) return false;
    return true;
  }

  function createBanner({ mode, onInstall }) {
    // mode: 'prompt' | 'ios'
    const banner = document.createElement('div');
    banner.className = 'ak-pwa-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Install aplikasi');

    const title = mode === 'ios'
      ? 'Tambah ke Home Screen'
      : 'Install Abang Kucing';

    const desc = mode === 'ios'
      ? 'Di iPhone: tekan Share, kemudian “Add to Home Screen”.'
      : 'Lebih cepat & macam app di phone anda.';

    banner.innerHTML = `
      <div class="ak-pwa-banner__inner">
        <div class="ak-pwa-banner__text">
          <div class="ak-pwa-banner__title">${escapeHtml(title)}</div>
          <div class="ak-pwa-banner__desc">${escapeHtml(desc)}</div>
        </div>
        <div class="ak-pwa-banner__actions">
          ${mode === 'prompt' ? '<button type="button" class="ak-pwa-btn ak-pwa-btn--primary" data-ak-install>Install</button>' : ''}
          <button type="button" class="ak-pwa-btn" data-ak-close>Tutup</button>
        </div>
      </div>
    `;

    banner.querySelector('[data-ak-close]')?.addEventListener('click', () => {
      setBannerState({ dismissedAt: nowTs() });
      banner.remove();
    });

    if (mode === 'prompt') {
      banner.querySelector('[data-ak-install]')?.addEventListener('click', () => {
        onInstall?.();
      });
    }

    document.body.appendChild(banner);
    return banner;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {
        // silent fail (PWA is optional)
      });
  });

  // Install suggestion banner
  let deferredPrompt = null;
  let bannerEl = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Chrome/Edge on Android/Desktop
    e.preventDefault();
    deferredPrompt = e;

    if (!shouldShowBanner()) return;
    if (bannerEl) return;

    bannerEl = createBanner({
      mode: 'prompt',
      onInstall: async () => {
        if (!deferredPrompt) return;
        try {
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          if (choice?.outcome === 'accepted') {
            setBannerState({ installed: true, installedAt: nowTs() });
            bannerEl?.remove();
            bannerEl = null;
          } else {
            setBannerState({ dismissedAt: nowTs() });
            bannerEl?.remove();
            bannerEl = null;
          }
        } catch {
          // ignore
        } finally {
          deferredPrompt = null;
        }
      }
    });
  });

  window.addEventListener('appinstalled', () => {
    setBannerState({ installed: true, installedAt: nowTs() });
    bannerEl?.remove();
    bannerEl = null;
  });

  // iOS (no beforeinstallprompt) - show guide banner once in a while
  window.addEventListener('load', () => {
    if (!isIOS()) return;
    if (!shouldShowBanner()) return;
    if (bannerEl) return;
    bannerEl = createBanner({ mode: 'ios' });
  });
})();

