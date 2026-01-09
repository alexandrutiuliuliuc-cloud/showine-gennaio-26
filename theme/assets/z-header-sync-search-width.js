(() => {
  const DESKTOP_MIN = 990;

  const q = (sel) => document.querySelector(sel);

  const measureAndSet = () => {
    const header = q('#header');
    if (!header) return;

    // Desktop only: on mobile search should naturally be full width.
    if (window.innerWidth < DESKTOP_MIN) {
      header.style.removeProperty('--header-menu-width');
      return;
    }

    const menuList = q('#header .header__nav-below .header__nav-items');
    if (!menuList) return;

    const width = Math.round(menuList.getBoundingClientRect().width);
    if (width > 0) {
      const v = `${width}px`;
      header.style.setProperty('--header-menu-width', v);
      // Cache to avoid a brief width "shrink" on page navigation before DOMContentLoaded.
      try {
        sessionStorage.setItem('showine_header_menu_width', v);
        document.documentElement.style.setProperty('--header-menu-width', v);
      } catch (e) {}
    }
  };

  let raf = 0;
  const schedule = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(measureAndSet);
  };

  document.addEventListener('DOMContentLoaded', schedule);
  window.addEventListener('load', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });

  // Keep in sync in theme editor / when navigation updates.
  document.addEventListener('shopify:section:load', schedule);
  document.addEventListener('shopify:section:select', schedule);

  const header = q('#header');
  if (header) {
    const obs = new MutationObserver(schedule);
    obs.observe(header, { childList: true, subtree: true });
  }
})();


