class FacetFiltersForm extends HTMLElement {
  constructor() {
    super();

    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);
    this.onApplyFiltersClick = this.onApplyFiltersClick.bind(this);

    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 800);

    const facetForm = this.querySelector('form');
    facetForm.addEventListener('input', this.debouncedOnSubmit.bind(this));

    // Mobile drawer: Apply button should trigger an immediate apply and then close the drawer.
    // We deliberately DO NOT rely on `.js-btn-close-drawer` (handled by menu-drawer), to avoid scroll-lock glitches.
    this.querySelectorAll('.drawer__content-facets .drawer__row--buttons .js-facets-apply').forEach((btn) => {
      btn.addEventListener('click', this.onApplyFiltersClick);
    });

    const facetWrapper = this.querySelector('#FacetsWrapperDesktop');
    if (facetWrapper) facetWrapper.addEventListener('keyup', onKeyUpEscape);
  }

  onApplyFiltersClick(event) {
    // Apply immediately using the current (visible) filter form state, then close the drawer.
    try {
      const params = new URLSearchParams();

      // Keep sort_by if present
      const currentParams = new URLSearchParams(window.location.search);
      const sortParam = currentParams.get('sort_by');
      if (sortParam) params.set('sort_by', sortParam);

      const form = this.querySelector('form#FacetFiltersForm') || this.querySelector('form');
      if (form) {
        // Checkboxes (multiple values)
        form.querySelectorAll('input[type="checkbox"]').forEach((input) => {
          if (input.checked) params.append(input.name, input.value);
        });

        // Other named inputs (price gte/lte, search terms, etc.) - omit empty values
        form.querySelectorAll('input[name]:not([type="checkbox"]):not([type="range"])').forEach((input) => {
          if (!input.value) return;

          // Make price filter "intelligent": don't send defaults (0 → max)
          if (input.name === 'filter.v.price.gte') {
            const v = Number(String(input.value).replace(',', '.'));
            if (!Number.isFinite(v) || v <= 0) return;
          }
          if (input.name === 'filter.v.price.lte') {
            const v = Number(String(input.value).replace(',', '.'));
            const maxAttr = Number(String(input.getAttribute('max') || '').replace(',', '.'));
            if (Number.isFinite(maxAttr) && Number.isFinite(v) && v >= maxAttr) return;
          }

          params.set(input.name, input.value);
        });
      }

      FacetFiltersForm.renderPage(params.toString(), null, true);

      // Close the facets drawer using the same menu-drawer logic as desktop/mobile.
      // (This keeps scroll lock handling centralized in global.js, avoiding stuck states.)
      const menuDrawer = event && event.currentTarget && event.currentTarget.closest
        ? event.currentTarget.closest('menu-drawer')
        : null;
      if (menuDrawer && typeof menuDrawer.toggleDrawer === 'function') {
        menuDrawer.toggleDrawer();
      }
    } catch (e) {
      // noop: never break the drawer UX
    }
  }

  static setListeners() {
    const onHistoryChange = (event) => {
      const searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
      if (searchParams === FacetFiltersForm.searchParamsPrev) return;
      FacetFiltersForm.renderPage(searchParams, null, false);
    };
    window.addEventListener('popstate', onHistoryChange);
  }

  static toggleActiveFacets(disable = true) {
    document.querySelectorAll('.js-facet-remove').forEach((element) => {
      element.classList.toggle('disabled', disable);
    });
  }

  static renderPage(searchParams, event, updateURLHash = true) {
    FacetFiltersForm.searchParamsPrev = searchParams;
    const sections = FacetFiltersForm.getSections();
    const countContainer = document.getElementById('ProductCount');
    const countContainerDesktop = document.getElementById('ProductCountDesktop');

    document.getElementById('ProductGridContainer').querySelector('.collection-grid-container').classList.add('loading');
    if (countContainer) {
      countContainer.classList.add('loading');
    }
    if (countContainerDesktop) {
      countContainerDesktop.classList.add('loading');
    }

    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      const filterDataUrl = (element) => element.url === url;

      FacetFiltersForm.filterData.some(filterDataUrl)
        ? FacetFiltersForm.renderSectionFromCache(filterDataUrl, event)
        : FacetFiltersForm.renderSectionFromFetch(url, event);
    });

    if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
  }

  static renderSectionFromFetch(url, event) {
    fetch(url)
      .then((response) => response.text())
      .then((responseText) => {
        const html = responseText;
        FacetFiltersForm.filterData = [...FacetFiltersForm.filterData, { html, url }];
        FacetFiltersForm.renderFilters(html, event);
        FacetFiltersForm.renderProductGridContainer(html);
        FacetFiltersForm.renderProductCount(html);
        if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger(html.innerHTML);
      });
  }

  static renderSectionFromCache(filterDataUrl, event) {
    const html = FacetFiltersForm.filterData.find(filterDataUrl).html;
    FacetFiltersForm.renderFilters(html, event);
    FacetFiltersForm.renderProductGridContainer(html);
    FacetFiltersForm.renderProductCount(html);
    if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger(html.innerHTML);
  }

  static renderProductGridContainer(html) {
    document.getElementById('ProductGridContainer').innerHTML = new DOMParser()
      .parseFromString(html, 'text/html')
      .getElementById('ProductGridContainer').innerHTML;

    document
      .getElementById('ProductGridContainer')
      .querySelectorAll('.scroll-trigger')
      .forEach((element) => {
        element.classList.add('scroll-trigger--cancel');
      });

    if (typeof updateProductsShownProgress === 'function') updateProductsShownProgress();
  }

  static renderProductCount(html) {
    const count = new DOMParser().parseFromString(html, 'text/html').getElementById('ProductCount').innerHTML;
    const container = document.getElementById('ProductCount');
    const containerDesktop = document.getElementById('ProductCountDesktop');
    container.innerHTML = count;
    container.classList.remove('loading');
    if (containerDesktop) {
      containerDesktop.innerHTML = count;
      containerDesktop.classList.remove('loading');
    }

    if (typeof updateProductsShownProgress === 'function') updateProductsShownProgress();
  }

  static renderFilters(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');
    const facetDetailsElementsFromFetch = parsedHTML.querySelectorAll('#FacetFiltersForm .js-filter');
    const facetDetailsElementsFromDom = document.querySelectorAll('#FacetFiltersForm .js-filter');

    // Remove facets that are no longer returned from the server
    Array.from(facetDetailsElementsFromDom).forEach((currentElement) => {
      if (!Array.from(facetDetailsElementsFromFetch).some(({ id }) => currentElement.id === id)) {
        currentElement.remove();
      }
    });

    // `event` can be null/undefined (e.g. when we force-apply on button click).
    // Also, `event.target.closest('.js-filter')` can be null (e.g. if target isn't inside a filter block).
    const jsFilterFromEvent = (() => {
      try {
        if (!event || !event.target) return undefined;
        if (typeof event.target.closest !== 'function') return undefined;
        return event.target.closest('.js-filter') || undefined;
      } catch (e) {
        return undefined;
      }
    })();

    const matchesId = (element) => {
      return jsFilterFromEvent ? element.id === jsFilterFromEvent.id : false;
    };

    const facetsToRender = Array.from(facetDetailsElementsFromFetch).filter((element) => !matchesId(element));
    const countsToRender = jsFilterFromEvent ? Array.from(facetDetailsElementsFromFetch).find(matchesId) : null;

    facetsToRender.forEach((elementToRender, index) => {
      const currentElement = document.getElementById(elementToRender.id);
      // Element already rendered in the DOM so just update the innerHTML
      if (currentElement) {
        document.getElementById(elementToRender.id).innerHTML = elementToRender.innerHTML;
      } else {
        if (index > 0) {
          const { className: previousElementClassName, id: previousElementId } = facetsToRender[index - 1];
          if (elementToRender.className === previousElementClassName) {
            document.getElementById(previousElementId).after(elementToRender);
            return;
          }
        }

        /*
        if (elementToRender.parentElement) {
          document.querySelector(`#${elementToRender.parentElement.id} .js-filter`).before(elementToRender);
        }
        */
      }
    });

    FacetFiltersForm.renderActiveFacets(parsedHTML);

    if (countsToRender && jsFilterFromEvent && jsFilterFromEvent.id) {
      const closestJSFilterID = jsFilterFromEvent.id;
      FacetFiltersForm.renderCounts(countsToRender, jsFilterFromEvent);

      const newFacetDetailsElement = document.getElementById(closestJSFilterID);
      const newElementToActivate = newFacetDetailsElement ? newFacetDetailsElement.querySelector('.facets__summary') : null;

      const isTextInput = (() => {
        try {
          return event && event.target && event.target.getAttribute && event.target.getAttribute('type') === 'text';
        } catch (e) {
          return false;
        }
      })();

      if (newElementToActivate && !isTextInput) newElementToActivate.focus();
    }
  }

  static renderActiveFacets(html) {
    const activeFacetElementSelectors = ['.active-facets'];

    activeFacetElementSelectors.forEach((selector) => {
      const activeFacetsElement = html.querySelector(selector);
      if (!activeFacetsElement) return;
      document.querySelector(selector).innerHTML = activeFacetsElement.innerHTML;
    });

    FacetFiltersForm.toggleActiveFacets(false);
  }

  static renderCounts(source, target) {
    const targetSummary = target.querySelector('.facets__summary');
    const sourceSummary = source.querySelector('.facets__summary');

    if (sourceSummary && targetSummary) {
      targetSummary.outerHTML = sourceSummary.outerHTML;
    }

    const targetHeaderElement = target.querySelector('.facets__header');
    const sourceHeaderElement = source.querySelector('.facets__header');

    if (sourceHeaderElement && targetHeaderElement) {
      targetHeaderElement.outerHTML = sourceHeaderElement.outerHTML;
    }

    const targetWrapElement = target.querySelector('.facets-wrap');
    const sourceWrapElement = source.querySelector('.facets-wrap');

    if (sourceWrapElement && targetWrapElement) {
      const isShowingMore = Boolean(target.querySelector('show-more-button .label-show-more.hidden'));
      if (isShowingMore) {
        sourceWrapElement
          .querySelectorAll('.facets__item.hidden')
          .forEach((hiddenItem) => hiddenItem.classList.replace('hidden', 'show-more-item'));
      }

      targetWrapElement.outerHTML = sourceWrapElement.outerHTML;
    }
  }

  static updateURLHash(searchParams) {
    history.pushState({ searchParams }, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
  }

  static getSections() {
    return [
      {
        section: document.getElementById('product-grid').dataset.id,
      },
    ];
  }

  createSearchParams(form) {
    const formData = new FormData(form);
    // console.log(new URLSearchParams(formData).toString());
    return new URLSearchParams(formData).toString();
  }

  onSubmitForm(searchParams, event) {
    FacetFiltersForm.renderPage(searchParams, event);
  }

  onSubmitHandler(event) {
    event.preventDefault();
    // get the current parameters
    const currentParams = new URLSearchParams(window.location.search);
    // clear all filter.v. parameters
    Array.from(currentParams.keys()).forEach(key => {
      if (key.startsWith('filter.v.')) {
        currentParams.delete(key);
      }
    });
    // to keep sort_by parameter
    const sortParam = currentParams.get('sort_by');
    // let's add the new parameters
    const params = new URLSearchParams();
    // add the current sort_by parameter if it exists
    if (sortParam) {
      params.set('sort_by', sortParam);
    }
    // get the form data
    const sortFilterForms = document.querySelectorAll('facet-filters-form form');

    // iterate over all forms
    sortFilterForms.forEach((form) => {
      // get all checkbox inputs
      const checkboxInputs = form.querySelectorAll('input[type="checkbox"]');
      // iterate over all checked checkboxes
      checkboxInputs.forEach(input => {
        if (input.checked) {
          params.append(input.name, input.value);
        }
      });
      // get all non-checkbox inputs that should be submitted (exclude range sliders or nameless inputs)
      const otherInputs = form.querySelectorAll('input[name]:not([type="checkbox"]):not([type="range"])');
      otherInputs.forEach(input => {
        if (input.value) {
          params.set(input.name, input.value);
        }
      });
    });
    // add the new parameters to the current parameters
    this.onSubmitForm(params.toString(), event);
  }

  onActiveFilterClick(event) {
    event.preventDefault();
    FacetFiltersForm.toggleActiveFacets();
    const url =
      event.currentTarget.href.indexOf('?') == -1
        ? ''
        : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
    FacetFiltersForm.renderPage(url);
  }
}

FacetFiltersForm.filterData = [];
FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
customElements.define('facet-filters-form', FacetFiltersForm);
FacetFiltersForm.setListeners();

class PriceRange extends HTMLElement {
  constructor() {
    super();

    this.minInput = this.querySelector('input[data-price-input="min"]');
    this.maxInput = this.querySelector('input[data-price-input="max"]');

    this.sliderMin = this.querySelector('[data-price-slider-min]');
    this.sliderMax = this.querySelector('[data-price-slider-max]');
    this.sliderRange = this.querySelector('[data-price-slider-range]');
    this.minLabel = this.querySelector('[data-price-slider-min-label]');
    this.maxLabel = this.querySelector('[data-price-slider-max-label]');
    this.currencySymbol = this.getAttribute('data-currency-symbol') || '';

    if (!this.minInput || !this.maxInput) return;

    [this.minInput, this.maxInput].forEach((element) => {
      element.addEventListener('change', this.onRangeChange.bind(this));
      element.addEventListener('keydown', this.onKeyDown.bind(this));
    });

    if (this.sliderMin && this.sliderMax) {
      this.sliderMin.addEventListener('input', () => this.onSliderInput('min'));
      this.sliderMax.addEventListener('input', () => this.onSliderInput('max'));
    }

    this.setMinAndMaxValues();
    this.syncFromInputsToSlider();
  }

  parseNum(v) {
    if (v == null) return 0;
    const s = String(v).trim().replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  formatMoneyLike(v) {
    const n = this.parseNum(v);
    return `${this.currencySymbol}${n}`;
  }

  onSliderInput(which) {
    if (!this.sliderMin || !this.sliderMax) return;

    const min = this.parseNum(this.sliderMin.value);
    const max = this.parseNum(this.sliderMax.value);

    if (which === 'min' && min > max) this.sliderMin.value = String(max);
    if (which === 'max' && max < min) this.sliderMax.value = String(min);

    // write to real inputs Shopify reads
    this.minInput.value = this.sliderMin.value;
    this.maxInput.value = this.sliderMax.value;

    // trigger events:
    // - change: keep internal validation logic (this element listens on change)
    // - input: FacetFiltersForm listens on `input` to submit filters
    this.minInput.dispatchEvent(new Event('change', { bubbles: true }));
    this.maxInput.dispatchEvent(new Event('change', { bubbles: true }));
    this.minInput.dispatchEvent(new Event('input', { bubbles: true }));
    this.maxInput.dispatchEvent(new Event('input', { bubbles: true }));

    this.syncSliderUI();
  }

  onRangeChange(event) {
    this.adjustToValidValues(event.currentTarget);
    this.setMinAndMaxValues();
    this.syncFromInputsToSlider();
  }

  onKeyDown(event) {
    const allowedKeys = ['Backspace', 'Tab', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Delete', 'Escape'];
    if (!allowedKeys.includes(event.key) && !/[0-9.,]/.test(event.key)) {
      event.preventDefault();
    }
  }

  setMinAndMaxValues() {
    const minInput = this.minInput;
    const maxInput = this.maxInput;

    if (maxInput.value) {
      minInput.setAttribute('data-max', maxInput.value);
    } else {
      minInput.setAttribute('data-max', maxInput.getAttribute('max'));
    }

    if (minInput.value) {
      maxInput.setAttribute('data-min', minInput.value);
    } else {
      maxInput.setAttribute('data-min', minInput.getAttribute('min'));
    }
  }

  adjustToValidValues(input) {
    const value = this.parseNum(input.value);
    const min = this.parseNum(input.getAttribute('min')) || 0;
    const max = this.parseNum(input.getAttribute('max'));

    if (!isNaN(min) && value < min) input.value = min;
    if (!isNaN(max) && value > max) input.value = max;
  }

  syncFromInputsToSlider() {
    if (!this.sliderMin || !this.sliderMax) return;

    const min = this.minInput.value || this.sliderMin.getAttribute('min') || '0';
    const max = this.maxInput.value || this.sliderMax.getAttribute('max') || this.sliderMax.getAttribute('max');

    this.sliderMin.value = min;
    this.sliderMax.value = max;

    if (this.parseNum(this.sliderMin.value) > this.parseNum(this.sliderMax.value)) {
      this.sliderMin.value = this.sliderMax.value;
    }

    this.syncSliderUI();
  }

  syncSliderUI() {
    if (!this.sliderMin || !this.sliderMax) return;

    const min = this.parseNum(this.sliderMin.value);
    const max = this.parseNum(this.sliderMax.value);
    const minAttr = this.parseNum(this.sliderMin.getAttribute('min') || 0);
    const maxAttr = this.parseNum(this.sliderMax.getAttribute('max') || 0);
    const span = maxAttr - minAttr || 1;

    const leftPct = ((min - minAttr) / span) * 100;
    const rightPct = ((maxAttr - max) / span) * 100;

    if (this.sliderRange) {
      this.sliderRange.style.left = `${Math.max(0, Math.min(100, leftPct))}%`;
      this.sliderRange.style.right = `${Math.max(0, Math.min(100, rightPct))}%`;
    }

    if (this.minLabel) this.minLabel.textContent = this.formatMoneyLike(this.sliderMin.value);
    if (this.maxLabel) this.maxLabel.textContent = this.formatMoneyLike(this.sliderMax.value);
  }
}

customElements.define('price-range', PriceRange);

function updateProductsShownProgress() {
  const progress = document.querySelector('[data-products-progress]');
  if (!progress) return;

  // Prefer parsing the already-rendered count text (source of truth in the UI),
  // e.g. "12 di 15 prodotti" / "12 of 15 products".
  let shown = 0;
  let total = 0;
  const countEl = document.getElementById('ProductCount');
  if (countEl) {
    const text = (countEl.textContent || '').replace(/\s+/g, ' ').trim();
    // Try "X di Y" or "X of Y"
    const m = text.match(/(\d+)\s*(?:di|of)\s*(\d+)/i);
    if (m) {
      shown = Number(m[1]);
      total = Number(m[2]);
    } else {
      // Fallback: first two integers in the string
      const nums = text.match(/\d+/g);
      if (nums && nums.length >= 2) {
        shown = Number(nums[0]);
        total = Number(nums[1]);
      }
    }
  }

  // Fallback to dataset total + DOM count if parsing failed
  if (!total) total = Number(progress.dataset.total || 0);
  if (!shown) shown = document.querySelectorAll('#product-grid product-card').length;

  if (!total) return;

  const bar = progress.querySelector('[data-products-progress-bar]');
  if (!bar) return;

  const pct = Math.max(0, Math.min(100, (shown / total) * 100));
  bar.style.width = `${pct}%`;

  progress.setAttribute('aria-valuemin', '0');
  progress.setAttribute('aria-valuemax', String(total));
  progress.setAttribute('aria-valuenow', String(shown));
}

document.addEventListener('DOMContentLoaded', () => {
  updateProductsShownProgress();

  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const mo = new MutationObserver(() => updateProductsShownProgress());
  mo.observe(grid, { childList: true, subtree: true });
});

class FacetRemove extends HTMLElement {
  constructor() {
    super();
    const facetLink = this.querySelector('a');
    facetLink.setAttribute('role', 'button');
    facetLink.addEventListener('click', this.closeFilter.bind(this));
    facetLink.addEventListener('keyup', (event) => {
      event.preventDefault();
      if (event.code.toUpperCase() === 'SPACE') this.closeFilter(event);
    });
  }

  closeFilter(event) {
    event.preventDefault();
    const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
    form.onActiveFilterClick(event);
  }
}

customElements.define('facet-remove', FacetRemove);
