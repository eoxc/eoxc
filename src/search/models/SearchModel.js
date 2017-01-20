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
      totalResults: undefined,
      isSearching: false,
      hasError: false,

      downloadSelection: new Backbone.Collection,
      searchState: 0,

      hasLoaded: 0,
      debounceTime: 250,
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

    this.listenTo(this, 'change:debounceTime', this.onDebounceTimeChange);

    this.listenTo(this.get('results'), 'reset', this.onSearchCollectionReset);
    this.listenTo(this.get('filtersModel'), 'change', this.onFiltersModelChange);
    this.listenTo(this.get('mapModel'), 'change:bbox', this.onMapBBOXChange);
    this.listenTo(this.get('mapModel'), 'change:time', this.onMapTimeChange);

    this.onDebounceTimeChange();

    this.automaticSearch = options.automaticSearch;
    if (this.automaticSearch) {
      this.search();
    }
  }

  search(reset) {
    const layerModel = this.get('layerModel');
    const filtersModel = this.get('filtersModel');
    const mapModel = this.get('mapModel');

    this.doSearchDebounced(layerModel, filtersModel, mapModel);
  }

  doSearch(layerModel, filtersModel, mapModel) {
    console.time("XXX")
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

    console.log("Clearing")
    this.get('results').reset([]);

    return request.then((result) => {
      console.timeEnd("XXX")
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

  onDebounceTimeChange() {
    this.doSearchDebounced = debounce(
      (...args) => this.doSearch(...args), this.get('debounceTime')
    );
  }

  onSearchCollectionReset() {
    this.trigger('search:complete', this);
  }

  onFiltersModelChange() {
    if (this.automaticSearch) {
      this.search();
    }
  }

  onMapBBOXChange() {
    if (this.automaticSearch && !this.get('filtersModel').get('area')) {
      this.search();
    }
  }

  onMapTimeChange() {
    if (this.automaticSearch && !this.get('filtersModel').get('time')) {
      this.search();
    }
  }
}

export default SearchModel;
