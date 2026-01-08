/**
 * Local preview link rewriter
 * When running Shopify theme dev on localhost/127.0.0.1, some theme links are absolute
 * (e.g. https://www.showine.it/collections/...). Clicking them would leave the local proxy.
 *
 * This script rewrites *internal* absolute links back to the current origin, so navigation
 * stays inside the local preview.
 *
 * Safety:
 * - Runs ONLY on localhost/127.0.0.1
 * - Touches ONLY http(s) links pointing to the production domain or *.myshopify.com
 */
(function () {
  const isLocal =
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === 'localhost';

  if (!isLocal) return;

  const currentOrigin = window.location.origin;
  const PROD_HOSTS = new Set(['www.showine.it', 'showine.it', 'showine.myshopify.com']);

  function shouldRewriteUrl(urlObj) {
    if (!urlObj || !urlObj.hostname) return false;
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') return false;
    if (PROD_HOSTS.has(urlObj.hostname)) return true;
    if (urlObj.hostname.endsWith('.myshopify.com')) return true;
    return false;
  }

  function rewriteHref(rawHref) {
    if (!rawHref) return null;
    // skip anchors, mailto, tel, javascript
    if (rawHref.startsWith('#')) return null;
    if (/^(mailto:|tel:|javascript:)/i.test(rawHref)) return null;

    let urlObj;
    try {
      urlObj = new URL(rawHref, window.location.href);
    } catch {
      return null;
    }

    if (!shouldRewriteUrl(urlObj)) return null;

    return `${currentOrigin}${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
  }

  function rewriteLinks(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('a[href]').forEach((a) => {
      const rawHref = a.getAttribute('href');
      const rewritten = rewriteHref(rawHref);
      if (!rewritten) return;
      a.setAttribute('href', rewritten);
      a.dataset.localPreviewRewritten = 'true';
    });
  }

  // Initial pass
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => rewriteLinks(document));
  } else {
    rewriteLinks(document);
  }

  // Keep up with dynamic HTML updates (filters, drawers, etc.)
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach((n) => {
          if (n && n.nodeType === 1) rewriteLinks(n);
        });
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();


