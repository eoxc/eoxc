import Backbone from 'backbone';
import debounce from 'debounce';

import { search, searchAllRecords } from '../';

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
      maxCount: 200,
      currentPage: 0,
      totalResults: undefined,
      isSearching: false,
      hasError: false,
      // results: new Backbone.Collection(),
      downloadSelection: new Backbone.Collection,
      searchState: 0,

      hasLoaded: 0,
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
    this.listenTo(this.get('mapModel'), 'change:time', this.onMapTimeChange);

    this.pages = [];

    this.doSearchDebounced = debounce((...args) => this.doSearch(...args), 250);

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
        hasLoaded: 0,
      });
      this.get('downloadSelection').reset([]);
      this.pages = [];
    }

    const layerModel = this.get('layerModel');
    const filtersModel = this.get('filtersModel');
    const mapModel = this.get('mapModel');

    const page = this.get('currentPage');

    if (this.pages[page]) {
      const records = this.pages[page];
      this.get('results').reset(records);
    }
    this.doSearchDebounced(layerModel, filtersModel, mapModel, page);
  }

  // doSearch(layerModel, filtersModel, mapModel, page) {
  //   const request = search(layerModel, filtersModel, mapModel, {
  //     itemsPerPage: this.get('defaultPageSize'),
  //     page,
  //   });
  //
  //   const searchState = this.get('searchState') + 1;
  //
  //   this.set({
  //     isSearching: true,
  //     hasError: false,
  //     searchState,
  //     hasLoaded: 0,
  //   });
  //
  //   return request.then((result) => {
  //     if (searchState !== this.get('searchState')) {
  //       // abort when the search is not the current one
  //       return;
  //     }
  //     this.set({
  //       totalResults: result.totalResults,
  //       startIndex: result.startIndex,
  //       itemsPerPage: result.itemsPerPage,
  //       isSearching: false,
  //       hasLoaded: result.records.length,
  //     });
  //
  //     this.pages[page] = result.records;
  //     // const allRecords = [];
  //     // const offset = result.startIndex % result.itemsPerPage;
  //     // for (let i = 0; i < result.totalResults; ++i) {
  //     //   allRecords[i] =
  //     // }
  //     this.get('results').reset(result.records);
  //   }).catch((error) => {
  //     if (searchState !== this.get('searchState')) {
  //       console.log("not setting error:", searchState, this.get('searchState'));
  //       return
  //     }
  //     this.set({
  //       isSearching: false,
  //       hasError: true,
  //     });
  //     this.get('results').reset([]);
  //     this.trigger('search:error', error);
  //   });
  // }

  doSearch(layerModel, filtersModel, mapModel) {
    const request = searchAllRecords(layerModel, filtersModel, mapModel, {
      itemsPerPage: this.get('defaultPageSize'),
      maxCount: this.get('maxCount'),
    });

    const searchState = this.get('searchState') + 1;

    this.set({
      isSearching: true,
      hasError: false,
      searchState,
      hasLoaded: 0,
    });

    return request.then((result) => {
      if (searchState !== this.get('searchState')) {
        // abort when the search is not the current one
        return;
      }
      this.set({
        totalResults: result.totalResults,
        startIndex: result.startIndex,
        itemsPerPage: result.itemsPerPage,
        isSearching: false,
        hasLoaded: result.records.length,
      });
      this.get('results').reset(result.records);
    }).catch((error) => {
      if (searchState !== this.get('searchState')) {
        console.log("not setting error:", searchState, this.get('searchState'));
        return
      }
      this.set({
        isSearching: false,
        hasError: true,
      });
      this.get('results').reset([]);
      this.trigger('search:error', error);
    });
  }

  searchMore() {
    const layerModel = this.get('layerModel');
    const filtersModel = this.get('filtersModel');
    const mapModel = this.get('mapModel');

    const page = this.get('currentPage') + 1;
    const request = search(layerModel, filtersModel, mapModel, {
      itemsPerPage: this.get('defaultPageSize'),
      page,
    });

    this.set({
      isSearching: true,
      hasError: false,
      currentPage: page,
    });

    return request.then((result) => {
      this.set({
        totalResults: result.totalResults,
        startIndex: result.startIndex,
        itemsPerPage: result.itemsPerPage,
        isSearching: false,
        hasLoaded: this.get('hasLoaded') + result.records.length,
      });
      this.get('results').add(result.records);
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

  onMapTimeChange() {
    if (this.automaticSearch && !this.get('filtersModel').get('time')) {
      this.search(true);
    }
  }
}

export default SearchModel;
