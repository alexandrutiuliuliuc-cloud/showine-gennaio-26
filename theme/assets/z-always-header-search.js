/* auto: ensure header search exists on every page */
(function(){
  function getHeader(){
    return document.querySelector('#shopify-section-header header, header.site-header, header.header, .site-header, [data-header], header');
  }
  function hasSearch(header){
    return !!(header && header.querySelector('input[type="search"], form[action^="/search" i], .predictive-search'));
  }
  function createSearch(){
    var wrap = document.createElement('div');
    wrap.id = 'zPersistentSearch';
    wrap.className = 'header__search';
    wrap.innerHTML = "<form action=\"/search\" method=\"get\" role=\"search\" class=\"header__search-form\">\n  <input type=\"search\" name=\"q\" class=\"field__input search__input\" placeholder=\"Cerca\" aria-label=\"Cerca\" />\n</form>";
    return wrap;
  }
  function insertSearch(){
    var header = getHeader();
    if (!header) return;
    if (document.getElementById('zPersistentSearch')) return;
    if (hasSearch(header)) return;
    var container = createSearch();
    // Prova ad inserirla in zone tipiche
    var target = header.querySelector('.header__inline-menu, .header__icons, .header__wrapper, .header__content, .header__middle, .header__upper, .header__bottom');
    if (target && target.firstElementChild) {
      target.insertBefore(container, target.firstElementChild);
    } else {
      header.insertBefore(container, header.firstChild);
    }
  }
  function schedule(){ requestAnimationFrame(insertSearch); }
  document.addEventListener('DOMContentLoaded', schedule);
  window.addEventListener('load', schedule);
  document.addEventListener('shopify:section:load', schedule);
  document.addEventListener('shopify:section:select', schedule);
  document.addEventListener('shopify:section:deselect', schedule);
  document.addEventListener('shopify:block:select', schedule);
  document.addEventListener('shopify:block:deselect', schedule);
})();
