/**
 * Showine: keep --header-height in sync when the mobile menu opens/closes.
 * Needed because we hide the search bar when #header has .menu-open, changing header height.
 */
(function () {
  const MQ = window.matchMedia('(max-width: 989px)');

  function updateHeaderHeight() {
    const header = document.querySelector('#header');
    if (!header) return;
    const h = header.getBoundingClientRect().height || 0;
    document.documentElement.style.setProperty('--header-height', `${h}px`);
  }

  function init() {
    if (!MQ.matches) return;
    const header = document.querySelector('#header');
    if (!header) return;

    updateHeaderHeight();

    const mo = new MutationObserver(() => updateHeaderHeight());
    mo.observe(header, { attributes: true, attributeFilter: ['class'] });

    window.addEventListener('resize', updateHeaderHeight, { passive: true });
  }

  document.addEventListener('DOMContentLoaded', init);
})();


