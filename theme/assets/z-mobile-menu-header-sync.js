/**
 * Showine: keep --header-height in sync when the mobile menu opens/closes.
 * Needed because we hide the search bar when #header has .menu-open, changing header height.
 */
(function () {
  // Mobile + iPad/tablet touch should use the "mobile" header height sync logic.
  const MQ = window.matchMedia('(max-width: 989px), (hover: none) and (pointer: coarse) and (max-width: 1366px)');

  function isDisplayed(el) {
    if (!el) return false;
    const cs = window.getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function measureVisibleHeaderHeight(header) {
    const inner = header.querySelector('.header__inner');
    const search = header.querySelector('.header__search-center');

    let h = 0;
    if (inner) h += inner.getBoundingClientRect().height || 0;

    // On mobile the search sits below the inner row and is hidden when the menu is open.
    if (isDisplayed(search)) h += search.getBoundingClientRect().height || 0;

    // Fallback to overall header height if structure changes.
    if (!h) h = header.getBoundingClientRect().height || 0;

    return h;
  }

  function updateHeaderHeight() {
    const header = document.querySelector('#header');
    if (!header) return;
    const h = measureVisibleHeaderHeight(header);
    document.documentElement.style.setProperty('--header-height', `${Math.round(h)}px`);
  }

  function init() {
    if (!MQ.matches) return;
    const header = document.querySelector('#header');
    if (!header) return;

    // Measure after layout has applied (menu-open hides the search via CSS).
    const updateSoon = () => {
      requestAnimationFrame(() => requestAnimationFrame(updateHeaderHeight));
    };

    updateSoon();

    const mo = new MutationObserver(() => updateSoon());
    mo.observe(header, { attributes: true, attributeFilter: ['class'] });

    window.addEventListener('resize', updateSoon, { passive: true });

    // Global theme code also recalculates --header-height on scroll; keep ours authoritative on mobile.
    window.addEventListener('scroll', () => setTimeout(updateHeaderHeight, 0), { passive: true });
  }

  document.addEventListener('DOMContentLoaded', init);
})();


