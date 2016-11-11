import Backbone from 'backbone';

import { search } from '../';

import OpenSearchCollection from './OpenSearchCollection';
import EOWCSCollection from './EOWCSCollection';

/**
 *
 *
 * @memberof search/models
 */

class SearchModel extends Backbone.Model {
  defaults() {
    return {
      defaultPageSize: 9,
      currentPage: 0,
      totalResults: undefined,
      isSearching: false,
      hasError: false,
      // results: new Backbone.Collection(),
      downloadSelection: new Backbone.Collection,
    };
  }

  initialize(attributes, options = {}) {
    const layerModel = this.get('layerModel');
    switch (layerModel.get('search.protocol')) {
      case 'EO-WCS':
        this.set('results', new EOWCSCollection);
        break;
      case 'OpenSearch':
        this.set('results', new OpenSearchCollection);
        break;
      default:
        throw new Error(`Unsupported search protocol '${layerModel.get('search.protocol')}'.`);
    }

    this.listenTo(this.get('results'), 'reset', this.onSearchCollectionReset);
    this.listenTo(this.get('filtersModel'), 'change', this.onFiltersModelChange);
    this.listenTo(this.get('mapModel'), 'change:bbox', this.onMapBBOXChange);

    this.pages = [];

    this.automaticSearch = options.automaticSearch;
    if (this.automaticSearch) {
      this.search(true);
    }
  }

  search(reset) {
    if (reset) {
      this.set({
        itemsPerPage: undefined,
        totalResults: undefined,
        currentPage: 0,
      });
      this.get('downloadSelection').reset([]);
      this.pages = [];
    }

    const layerModel = this.get('layerModel');
    const filtersModel = this.get('filtersModel');
    const mapModel = this.get('mapModel');
    let request = null;

    const page = this.get('currentPage');

    if (this.pages[page]) {
      const records = this.pages[page];
      this.get('results').reset(records);
      return Promise.resolve(records);
    }
    request = search(layerModel, filtersModel, mapModel, {
      itemsPerPage: this.get('defaultPageSize'),
      page,
    });

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
      this.pages[page] = result.records;
      return result.records;
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
      this.search(false);
    }
  }

  onSearchCollectionReset() {
    this.trigger('search:complete', this);
  }

  onFiltersModelChange() {
    if (this.automaticSearch) {
      this.search(true);
    }
  }

  onMapBBOXChange() {
    if (this.automaticSearch && !this.get('filtersModel').get('area')) {
      this.search(true);
    }
  }
}

export default SearchModel;
