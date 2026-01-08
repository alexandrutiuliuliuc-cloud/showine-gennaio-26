/* auto: open only Price filter (robust) */
(function(){
  function isElement(el){ return el && el.nodeType === 1; }

  function containsPriceInputs(root){
    try {
      if (!root) return false;
      if (root.querySelector('input[name^="filter.v.price"], input[name*="price" i], input[data-filter*="price" i], input[data-name*="price" i]')) return true;
      if (root.querySelector('[data-type*="price" i], [data-filter-type*="price" i], [data-filter*="price" i]')) return true;
      if (root.querySelector('.price-range, .facets__price, .filter-price, .filters__price, .facets-price')) return true;
    } catch(e){}
    return false;
  }

  function isPriceSummaryText(el){
    try {
      var summary = el.matches('summary') ? el : el.querySelector('summary, [data-summary], .summary, .accordion__title, .collapsible-trigger');
      if (!summary) return false;
      var t = (summary.textContent || '').trim().toLowerCase();
      return t.includes('prezzo') || t.includes('price');
    } catch(e){ return false; }
  }

  function findFilterContainers(root){
    var scopes = []
      .concat(Array.from(root.querySelectorAll('details')))
      .concat(Array.from(root.querySelectorAll('[is="details-disclosure"], details-disclosure')))
      .concat(Array.from(root.querySelectorAll('[role="group"].facets, .facets__disclosure, .facets__disclosure-vertical, .accordion, .filter-group, .filters__item, .facets__item')));
    // Dedup
    var seen = new Set();
    return scopes.filter(function(n){ if (!isElement(n)) return false; var id = n.tagName + '#' + (n.id||'') + '.' + n.className; if (seen.has(id)) return false; seen.add(id); return true; });
  }

  function getRoot(){
    return document.querySelector('#FacetsWrapper, .facets-vertical, .facets, form[action*="/collections/"], .collection-filters') || document;
  }

  function classifyContainer(el){
    if (!isElement(el)) return 'unknown';
    if (el.tagName.toLowerCase() === 'details') return 'details';
    if (el.matches('[is="details-disclosure"], details-disclosure')) return 'details-disclosure';
    if (el.matches('[aria-expanded]')) return 'aria';
    return 'generic';
  }

  function isOpen(el){
    if (!isElement(el)) return false;
    if (el.tagName && el.tagName.toLowerCase() === 'details') return el.hasAttribute('open');
    if (el.matches('[aria-expanded]')) return String(el.getAttribute('aria-expanded')) === 'true';
    // Heuristic based on classes
    var cls = el.className || '';
    if (/open|is-open|active|expanded/.test(cls)) return true;
    return false;
  }

  function setOpen(el, val){
    if (!isElement(el)) return;
    var type = classifyContainer(el);
    if (type === 'details') {
      if (val) el.setAttribute('open',''); else el.removeAttribute('open');
      return;
    }
    if (type === 'aria') {
      el.setAttribute('aria-expanded', val ? 'true' : 'false');
      return;
    }
    // Fallback: try clicking summary/trigger
    var trigger = el.querySelector('summary, [aria-controls], .accordion__title, .collapsible-trigger, button, .facets__summary');
    if (trigger) {
      var openNow = isOpen(el);
      if (val && !openNow) { try { trigger.click(); } catch(e){} }
      if (!val && openNow) { try { trigger.click(); } catch(e){} }
    } else {
      // class-based fallback
      var cls = el.classList;
      if (!cls) return;
      if (val) { cls.add('open'); cls.add('is-open'); cls.add('expanded'); } else { cls.remove('open'); cls.remove('is-open'); cls.remove('expanded'); }
    }
  }

  function findPriceFilterContainer(){
    var root = getRoot();
    if (!root) return null;
    var containers = findFilterContainers(root);
    // Prefer those that contain price inputs or price-related markers
    for (var i=0;i<containers.length;i++){
      var el = containers[i];
      if (containsPriceInputs(el)) return el;
    }
    // Fallback: by summary text
    for (var j=0;j<containers.length;j++){
      var el2 = containers[j];
      if (isPriceSummaryText(el2)) return el2;
    }
    // Fallback: closest container of any node with price inputs inside root
    var pr = root.querySelector('input[name^="filter.v.price"], input[name*="price" i], [data-type*="price" i], .price-range');
    if (pr){
      var parent = pr.closest('details, [is="details-disclosure"], details-disclosure, [aria-expanded], .accordion, .filter-group, .filters__item, .facets__item');
      if (parent) return parent;
    }
    return null;
  }

  function closeAllExcept(target){
    var root = getRoot();
    if (!root) return;
    var containers = findFilterContainers(root);
    containers.forEach(function(c){ if (c !== target) setOpen(c, false); });
  }

  function toggle(){
    var root = getRoot();
    if (!root) return;
    var price = findPriceFilterContainer();
    if (!price) return;
    closeAllExcept(price);
    setOpen(price, true);
  }

  var scheduled = false;
  function schedule(){ if (scheduled) return; scheduled = true; requestAnimationFrame(function(){ scheduled=false; toggle(); }); }

  document.addEventListener('DOMContentLoaded', schedule);
  window.addEventListener('load', schedule);
  document.addEventListener('shopify:section:load', schedule);
  document.addEventListener('shopify:section:select', schedule);
  document.addEventListener('shopify:section:deselect', schedule);
  document.addEventListener('shopify:block:select', schedule);
  document.addEventListener('shopify:block:deselect', schedule);

  // Observe dynamic DOM changes within root
  var mo = new MutationObserver(function(muts){ schedule(); });
  document.addEventListener('DOMContentLoaded', function(){ var r=getRoot(); if (r) mo.observe(r, { childList:true, subtree:true }); schedule(); });
})();
