/**
 * Showine: keep --header-height in sync when the mobile menu opens/closes.
 * Needed because we hide the search bar when #header has .menu-open, changing header height.
 */
(function () {
  // Mobile + iPad/tablet touch should use the "mobile" header height sync logic.
  const MQ = window.matchMedia('(max-width: 989px), (hover: none) and (pointer: coarse) and (max-width: 1366px)');
  let moHeader = null;
  let moDrawer = null;

  function isDisplayed(el) {
    if (!el) return false;
    const cs = window.getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  }

  function isMenuDrawerOpen(header) {
    if (!header) return false;
    const drawerContainer = header.querySelector('.header__drawer > .drawer__container');
    return (
      header.classList.contains('menu-open') ||
      (drawerContainer && drawerContainer.hasAttribute('open')) ||
      (drawerContainer && drawerContainer.classList.contains('menu-opening'))
    );
  }

  function measureVisibleHeaderHeight(header) {
    const inner = header.querySelector('.header__inner');
    const search = header.querySelector('.header__search-center');

    let h = 0;
    if (inner) h += inner.getBoundingClientRect().height || 0;

    // IMPORTANT: when the drawer is open, only the inner row must count as header height.
    // Otherwise the drawer will start too low and reveal the slideshow behind it.
    if (!isMenuDrawerOpen(header)) {
      // On mobile the search sits below the inner row.
      if (isDisplayed(search)) h += search.getBoundingClientRect().height || 0;
    }

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

  function syncMobileMenuOpenClass() {
    const header = document.querySelector('#header');
    if (!header) return;
    const drawerContainer = header.querySelector('.header__drawer > .drawer__container');
    // Rely on the actual <details open> state (more reliable than #header.menu-open).
    const isOpen =
      (drawerContainer && drawerContainer.hasAttribute('open')) ||
      (drawerContainer && drawerContainer.classList.contains('menu-opening')) ||
      header.classList.contains('menu-open');
    document.documentElement.classList.toggle('showine-mobile-menu-open', isOpen);
  }

  /**
   * (Removed) Footer measurement logic: footer is now a simple one-row flex layout.
   */

  function init() {
    if (!MQ.matches) return;
    // Measure after layout has applied (menu-open hides the search via CSS).
    const updateSoon = () => {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          syncMobileMenuOpenClass();
          updateHeaderHeight();
        }),
      );
    };

    // Disconnect previous observers (important in Shopify Theme Editor where sections re-render)
    try {
      if (moHeader) moHeader.disconnect();
      if (moDrawer) moDrawer.disconnect();
    } catch (e) {}
    moHeader = null;
    moDrawer = null;

    const header = document.querySelector('#header');
    if (!header) return;

    updateSoon();

    moHeader = new MutationObserver(() => updateSoon());
    moHeader.observe(header, { attributes: true, attributeFilter: ['class'] });

    const drawerContainer = header.querySelector('.header__drawer > .drawer__container');
    if (drawerContainer) {
      moDrawer = new MutationObserver(() => updateSoon());
      moDrawer.observe(drawerContainer, { attributes: true, attributeFilter: ['open', 'class'] });
    }

    // One-time global listeners
    if (!window.__showineMobileMenuSyncBound) {
      window.__showineMobileMenuSyncBound = true;
      window.addEventListener('resize', updateSoon, { passive: true });

      // Global theme code also recalculates --header-height on scroll; keep ours authoritative on mobile.
      window.addEventListener('scroll', () => setTimeout(updateHeaderHeight, 0), { passive: true });

      // Shopify Theme Editor: sections can be re-rendered without a full page reload.
      // Re-init so observers attach to the new #header node.
      document.addEventListener('shopify:section:load', init);
      document.addEventListener('shopify:section:select', init);
      document.addEventListener('shopify:section:deselect', init);
      document.addEventListener('shopify:section:reorder', init);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  // In case this script is loaded after DOMContentLoaded (Theme Editor partial reloads), run once.
  if (document.readyState !== 'loading') init();
})();


