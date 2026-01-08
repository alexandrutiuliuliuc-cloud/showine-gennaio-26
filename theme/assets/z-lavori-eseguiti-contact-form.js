/**
 * Showine: Inject "richiesta informazioni" contact form at the end of a "lavoro eseguito" page
 * only when the user arrives from /pages/lavori-eseguiti (content CTAs, not header).
 *
 * No URL params, no SEO impact (JS-only).
 */
(function () {
  const INDEX_PATH = '/pages/lavori-eseguiti';
  const STORAGE_KEY = 'showine:lavoriEseguiti:nav';
  const TTL_MS = 15 * 60 * 1000;

  function now() {
    return Date.now();
  }

  function safeParse(json) {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  function setNavIntent(targetPathname) {
    const payload = { t: now(), target: targetPathname };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }

  function getNavIntent() {
    try {
      return safeParse(sessionStorage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  function clearNavIntent() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  function isSameOriginPageLink(a) {
    if (!a || !a.href) return false;
    if (a.hasAttribute('data-no-lavori-form-track')) return false;
    if (a.getAttribute('href') && a.getAttribute('href').startsWith('#')) return false;
    if (a.target && a.target.toLowerCase() === '_blank') return false;
    try {
      const url = new URL(a.href, window.location.origin);
      return url.origin === window.location.origin && url.pathname.startsWith('/pages/');
    } catch {
      return false;
    }
  }

  async function injectForm() {
    const main = document.querySelector('#MainContent');
    if (!main) return;
    if (main.querySelector('[data-showine-info-request-form]')) return;

    const mount = document.createElement('div');
    mount.setAttribute('data-showine-info-request-form', 'true');
    mount.className = 'z-info-request-form';
    main.appendChild(mount);

    const url = `${window.Shopify?.routes?.root || '/'}?section_id=form-contact-info`;
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) return;
    const html = await res.text();

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const section = doc.querySelector('body > *') || doc.body;
    if (!section) return;

    // move all nodes (including style tags)
    Array.from(section.childNodes).forEach((node) => mount.appendChild(node));
  }

  document.addEventListener('click', function (e) {
    // Only track clicks from the index page, inside main content (not header/footer)
    if (window.location.pathname !== INDEX_PATH) return;

    const main = document.querySelector('#MainContent');
    if (!main) return;

    const a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    if (!main.contains(a)) return;
    if (!isSameOriginPageLink(a)) return;

    const url = new URL(a.href, window.location.origin);
    setNavIntent(url.pathname);
  }, true);

  document.addEventListener('DOMContentLoaded', async function () {
    // Never inject on the index itself
    if (window.location.pathname === INDEX_PATH) return;

    const intent = getNavIntent();
    if (!intent || !intent.t || !intent.target) return;

    const isFresh = now() - intent.t <= TTL_MS;
    const isTargetMatch = intent.target === window.location.pathname;
    if (!isFresh || !isTargetMatch) {
      clearNavIntent();
      return;
    }

    try {
      await injectForm();
    } finally {
      // single-use to avoid "sticking" across browsing
      clearNavIntent();
    }
  });
})();


