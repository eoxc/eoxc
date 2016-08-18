import Backbone from 'backbone';

import searchEOWCS from '../eowcs';
import searchOpenSearch from '../opensearch';

/**
 *
 *
 * @memberof search/models
 */

class SearchModel extends Backbone.Model {
  defaults() {
    return {
      defaultPageSize: 10,
      currentPage: 0,
      totalResults: undefined,
      isSearching: false,
      hasError: false,
      results: new Backbone.Collection(),
    };
  }

  initialize(attributes, options = {}) {
    this.automaticSearch = options.automaticSearch;

    this.listenTo(this.get('results'), 'reset', this.onSearchCollectionReset);
    this.listenTo(this.get('filtersModel'), 'change', this.onFiltersModelChange);

    if (this.automaticSearch) {
      this.search();
    }
  }

  search() {
    const layerModel = this.get('layerModel');
    const filtersModel = this.get('filtersModel');
    let request = null;
    switch (layerModel.get('search.protocol')) {
      case 'EO-WCS':
        request = searchEOWCS(
          layerModel, filtersModel, {
            itemsPerPage: this.get('itemsPerPage') || this.get('defaultPageSize'),
          }
        );
        break;
      case 'OpenSearch':
        request = searchOpenSearch(
          layerModel, filtersModel, {
            itemsPerPage: this.get('defaultPageSize'),
            page: this.get('currentPage'),
          }
        );
        break;
      default:
        throw new Error(`Unsupported search protocol '${layerModel.get('search.protocol')}'.`);
    }

    this.set({
      isSearching: true,
      hasError: false,
    });

    return request.then((result) => {
      this.set({
        totalResults: result.totalResults,
        startIndex: result.startIndex,
        itemsPerPage: result.itemsPerPage,
        isSearching: false,
      });
      this.get('results').reset(result.records);
    }).catch((error) => {
      this.set({
        isSearching: false,
        hasError: true,
      });
      this.get('results').reset([]);
      this.trigger('search:error', error);
    });
  }

  searchPage(page) {
    this.set('currentPage', parseInt(page, 10));
    if (this.automaticSearch) {
      this.search();
    }
  }

  onSearchCollectionReset() {
    this.trigger('search:complete', this);
  }

  onFiltersModelChange() {
    this.set({
      itemsPerPage: undefined,
      totalResults: undefined,
      currentPage: 0,
    });

    if (this.automaticSearch) {
      this.search();
    }
  }
}

export default SearchModel;
