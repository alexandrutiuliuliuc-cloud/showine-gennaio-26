/**
 * Showine: Collection subcategories scroll indicator
 * - Adds `.is-overflowing` when the scroller overflows horizontally
 * - Updates CSS vars for a custom (always visible) track+thumb indicator
 */
(() => {
  const SCROLLER_SELECTOR = '[data-subcats-scroller]';
  const TRACK_SELECTOR = '[data-subcats-scrollbar]';
  const THUMB_SELECTOR = '[data-subcats-thumb]';
  const WRAP_SELECTOR = '.collection__subcats';

  function clamp(min, v, max) {
    return Math.max(min, Math.min(max, v));
  }

  function getScrollableEl(scroller) {
    // The scroller itself is the overflow container.
    return scroller;
  }

  function updateScroller(scroller) {
    const el = getScrollableEl(scroller);
    const wrap = scroller.closest(WRAP_SELECTOR);
    if (!wrap) return;
    const track = wrap.querySelector(TRACK_SELECTOR);
    const thumb = wrap.querySelector(THUMB_SELECTOR);
    if (!track || !thumb) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    const isOverflowing = maxScroll > 2;

    wrap.classList.toggle('is-overflowing', isOverflowing);
    if (!isOverflowing) {
      thumb.style.width = '';
      thumb.style.transform = '';
      return;
    }

    const trackW = track.clientWidth;
    const thumbMin = 44; // px
    const thumbW = clamp(thumbMin, (el.clientWidth / el.scrollWidth) * trackW, trackW);

    const ratio = maxScroll > 0 ? el.scrollLeft / maxScroll : 0;
    const left = clamp(0, (trackW - thumbW) * ratio, trackW - thumbW);

    thumb.style.width = `${Math.round(thumbW)}px`;
    thumb.style.transform = `translateX(${Math.round(left)}px)`;
  }

  function init() {
    const scrollers = Array.from(document.querySelectorAll(SCROLLER_SELECTOR));
    if (!scrollers.length) return;

    for (const scroller of scrollers) {
      const el = getScrollableEl(scroller);
      const wrap = scroller.closest(WRAP_SELECTOR);
      if (!wrap) continue;
      const track = wrap.querySelector(TRACK_SELECTOR);
      const thumb = wrap.querySelector(THUMB_SELECTOR);
      if (!track || !thumb) continue;

      let raf = 0;
      const onScroll = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          updateScroller(scroller);
        });
      };

      el.addEventListener('scroll', onScroll, { passive: true });

      // Click track to jump
      track.addEventListener('pointerdown', (e) => {
        if (!wrap.classList.contains('is-overflowing')) return;
        // If user clicked the thumb itself, let the thumb handler manage it.
        if (e.target && e.target.closest && e.target.closest(THUMB_SELECTOR)) return;

        const rect = track.getBoundingClientRect();
        const x = clamp(0, e.clientX - rect.left, rect.width);

        const maxScroll = el.scrollWidth - el.clientWidth;
        const thumbW = thumb.getBoundingClientRect().width || 44;
        const trackW = rect.width || 1;
        const ratio = clamp(0, (x - thumbW / 2) / Math.max(1, trackW - thumbW), 1);
        el.scrollLeft = ratio * maxScroll;
      });

      // Drag thumb
      thumb.addEventListener('pointerdown', (e) => {
        if (!wrap.classList.contains('is-overflowing')) return;
        e.preventDefault();
        thumb.setPointerCapture(e.pointerId);

        const rect = track.getBoundingClientRect();
        const startX = e.clientX;
        const startScroll = el.scrollLeft;
        const maxScroll = el.scrollWidth - el.clientWidth;

        const thumbW = thumb.getBoundingClientRect().width || 44;
        const trackW = rect.width || 1;
        const maxThumbLeft = Math.max(1, trackW - thumbW);

        const onMove = (ev) => {
          const dx = ev.clientX - startX;
          const scrollDelta = (dx / maxThumbLeft) * maxScroll;
          el.scrollLeft = clamp(0, startScroll + scrollDelta, maxScroll);
        };

        const onUp = () => {
          thumb.removeEventListener('pointermove', onMove);
          thumb.removeEventListener('pointerup', onUp);
          thumb.removeEventListener('pointercancel', onUp);
          try {
            thumb.releasePointerCapture(e.pointerId);
          } catch (_) {}
        };

        thumb.addEventListener('pointermove', onMove);
        thumb.addEventListener('pointerup', onUp, { once: true });
        thumb.addEventListener('pointercancel', onUp, { once: true });
      });

      updateScroller(scroller);
    }

    // Update on resize (layout changes can affect overflow/ratios)
    window.addEventListener('resize', () => scrollers.forEach(updateScroller), { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


