if (!customElements.get('predictive-search')) {
  class PredictiveSearch extends HTMLElement {
    constructor() {
      super();

      this.input = this.querySelector('input[type="search"]');
      this.resultsContainer = this.querySelector(
        '.js-results-container'
      );
      this.btnSubmit = this.querySelector('.js-btn-submit');
      this.btnClearText = this.querySelector('.js-btn-clear-text');
      this.errorMessageContainer = this.querySelector(
        '.js-message-error'
      );
      this.errorMessageText =
        this.errorMessageContainer.querySelector('[data-text]');
      this.timeout = null;
      this.isOpen = false;
      this.drawer = this.closest('.js-drawer');
      this.onDocumentPointerDown = this.handleDocumentPointerDown.bind(this);
      this.hasInteractedWithSearch = false;

      var searchDrawerContent = document.querySelector('.drawer__content--search');
      var searchSuggestions = document.querySelector('.search-drawer__suggestions');

      // Track whether the user intentionally interacted with the search input.
      // We only allow "click outside to close" after that, to avoid interfering with header menus.
      this.input.addEventListener('focus', () => {
        this.hasInteractedWithSearch = true;
      });
      this.input.addEventListener('pointerdown', () => {
        this.hasInteractedWithSearch = true;
      });

      this.input.addEventListener('input', e => {
        clearTimeout(this.timeout);

        this.timeout = setTimeout(() => {
          const searchTerm = this.input.value.trim();

          if (searchTerm.length <= 0) {
            this.close();
            if(window.innerWidth < 990) {
              searchDrawerContent.style.height = 'auto';
            }
            if(searchSuggestions) {
              searchSuggestions.style.display = 'block';
            }
            return;
          }

          this.isOpen = true;
          this.getSearchResults(searchTerm);
          if(window.innerWidth <= 990) {
            searchDrawerContent.style.height = '100%';
          }
          if(searchSuggestions) {
            searchSuggestions.style.display = 'none';
          }
        }, 300);
      });

      this.input.addEventListener('keydown', e => {
        const isEscape = e.key === 'Escape';

        if (!isEscape) {
          return;
        }

        if (!this.input.value) {
          if (this.drawer) {
            this.drawer.parentElement.parentElement.toggleDrawer();
          }

          return;
        }

        // Hide results but keep the typed value.
        this.hideResults();
      });

      this.btnClearText.addEventListener('click', e => {
        this.close();
        searchDrawerContent.style.height = 'auto';
        if(searchSuggestions) {
          searchSuggestions.style.display = 'block';
        }
      });

      // Close predictive results when clicking outside of the component.
      // This improves UX so users can "exit" the results without having to press "Cancella".
      document.addEventListener('pointerdown', this.onDocumentPointerDown);
    }

    disconnectedCallback() {
      document.removeEventListener('pointerdown', this.onDocumentPointerDown);
    }

    async getSearchResults(searchTerm) {
      try {
        const response = await fetch(
          `${Shopify.routes.root}search/suggest?q=${searchTerm}&resources[type]=product,page,article,collection,query&resources[limit]=8&section_id=predictive-search`
        );

        if (!this.isOpen) {
          return;
        }

        if (!response.ok) {
          const error = new Error(response.status);

          throw error;
        }

        const text = await response.text();
        const resultsMarkup = new DOMParser()
          .parseFromString(text, 'text/html')
          .querySelector(
            '#shopify-section-predictive-search'
          ).innerHTML;

        this.resultsContainer.innerHTML = resultsMarkup;
        this.open();

        // new added product cards - quick cart triggers - set event listeners
        document.querySelector('quick-cart-drawer')?.initTriggers();

      } catch (error) {
        this.errorMessageText.textContent = error.message;
        this.errorMessageContainer.classList.remove('hidden');
      }
    }

    open() {
      this.classList.add('is-open');
      this.resultsContainer.classList.remove('hidden');
      this.errorMessageContainer.classList.add('hidden');
      this.btnSubmit.setAttribute('tabindex', '-1');
      this.btnClearText.removeAttribute('disabled');
      this.input?.setAttribute('aria-expanded', 'true');
    }

    hideResults() {
      this.isOpen = false;
      this.classList.remove('is-open');
      this.resultsContainer.classList.add('hidden');
      this.errorMessageContainer.classList.add('hidden');
      this.btnSubmit.removeAttribute('tabindex');
      this.btnClearText.removeAttribute('disabled');
      this.input?.setAttribute('aria-expanded', 'false');
    }

    handleDocumentPointerDown(e) {
      if (!this.classList.contains('is-open')) return;
      // Only close on outside click if the user intentionally interacted with the search input first.
      if (!this.hasInteractedWithSearch) return;
      // Ignore clicks inside the predictive search component (including results).
      if (e.target && this.contains(e.target)) return;
      // Ignore clicks on the header navigation/menu area so dropdown menus can be used without closing search.
      const headerNav = document.querySelector('#header .header__nav-below, #header .header__nav');
      if (headerNav && e.target && headerNav.contains(e.target)) return;
      const isMessageOnly = !!this.resultsContainer?.querySelector('.predictive-search__results--message-only');

      // If the search produced no results, clicking outside should clear the input as well.
      if (isMessageOnly) {
        this.hideResults();
        this.input.value = '';
        this.btnClearText.setAttribute('disabled', true);
        this.hasInteractedWithSearch = false;
        this.input?.setAttribute('aria-expanded', 'false');
        // Let the click proceed to the outside target; don't force focus back into the input.
        this.input.blur();
        return;
      }

      this.hideResults();
    }

    close() {
      this.isOpen = false;
      this.classList.remove('is-open');
      this.resultsContainer.classList.add('hidden');
      this.errorMessageContainer.classList.add('hidden');
      this.input.value = '';
      this.input.focus();
      this.btnSubmit.removeAttribute('tabindex');
      this.btnClearText.setAttribute('disabled', true);
      this.input?.setAttribute('aria-expanded', 'false');
      this.hasInteractedWithSearch = false;
    }
  }

  customElements.define('predictive-search', PredictiveSearch);
}
