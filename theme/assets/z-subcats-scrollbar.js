/**
 * Showine: Collection subcategories scrollbar
 * Simple, fluid, draggable micro-scrollbar under subcategory pills.
 */
(function () {
  var WRAP = '.collection__subcats';
  var SCROLLER = '[data-subcats-scroller]';
  var TRACK = '[data-subcats-scrollbar]';
  var THUMB = '[data-subcats-thumb]';

  function clamp(min, v, max) {
    return Math.max(min, Math.min(max, v));
  }

  function setup(wrap) {
    var scroller = wrap.querySelector(SCROLLER);
    var track = wrap.querySelector(TRACK);
    var thumb = wrap.querySelector(THUMB);
    if (!scroller || !track || !thumb) return;

    var maxScroll = 0;
    var thumbW = 0;
    var maxThumbX = 0;
    var scrollRatio = 0;
    var raf = 0;

    // Sync thumb position with scroll (smooth, no rounding)
    function sync() {
      raf = 0;
      if (maxScroll <= 0) return;
      var pct = scroller.scrollLeft / maxScroll;
      var x = pct * maxThumbX;
      thumb.style.transform = 'translateX(' + x + 'px)';
    }

    function requestSync() {
      if (!raf) raf = requestAnimationFrame(sync);
    }

    // Measure overflow and thumb size
    function measure() {
      var overflow = scroller.scrollWidth - scroller.clientWidth;
      maxScroll = overflow > 1 ? overflow : 0;
      wrap.classList.toggle('is-overflowing', maxScroll > 0);

      if (maxScroll <= 0) {
        thumb.style.width = '';
        thumb.style.transform = '';
        return;
      }

      var trackW = track.clientWidth || 1;
      var ratio = scroller.clientWidth / scroller.scrollWidth;
      thumbW = clamp(32, ratio * trackW, trackW);
      thumb.style.width = thumbW + 'px';

      maxThumbX = trackW - thumbW;
      scrollRatio = maxScroll / (maxThumbX || 1);
      sync();
    }

    // Listen for scroll
    scroller.addEventListener('scroll', requestSync, { passive: true });

    // Click on track => jump
    track.addEventListener('pointerdown', function (e) {
      if (maxScroll <= 0) return;
      // Ignore if clicking the thumb itself
      if (e.target.closest && e.target.closest(THUMB)) return;

      var rect = track.getBoundingClientRect();
      var clickX = e.clientX - rect.left;
      var targetThumbX = clamp(0, clickX - thumbW / 2, maxThumbX);
      scroller.scrollLeft = targetThumbX * scrollRatio;
    });

    // Drag thumb
    thumb.addEventListener('pointerdown', function (e) {
      if (maxScroll <= 0) return;
      e.preventDefault();
      thumb.setPointerCapture(e.pointerId);

      var startX = e.clientX;
      var startScroll = scroller.scrollLeft;

      function onMove(ev) {
        var dx = ev.clientX - startX;
        var newScroll = startScroll + dx * scrollRatio;
        scroller.scrollLeft = clamp(0, newScroll, maxScroll);
      }

      function onUp() {
        thumb.removeEventListener('pointermove', onMove);
        thumb.removeEventListener('pointerup', onUp);
        thumb.removeEventListener('pointercancel', onUp);
        try { thumb.releasePointerCapture(e.pointerId); } catch (_) {}
      }

      thumb.addEventListener('pointermove', onMove);
      thumb.addEventListener('pointerup', onUp, { once: true });
      thumb.addEventListener('pointercancel', onUp, { once: true });
    });

    // Re-measure on resize
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(measure);
      ro.observe(scroller);
    }
    window.addEventListener('resize', measure, { passive: true });

    measure();
  }

  function init() {
    var wraps = document.querySelectorAll(WRAP);
    for (var i = 0; i < wraps.length; i++) {
      setup(wraps[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
