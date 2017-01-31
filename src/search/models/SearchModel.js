import Backbone from 'backbone';
import debounce from 'debounce';

import { searchAllRecords } from '../';

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
      automaticSearch: false,
      defaultPageSize: 9,
      maxCount: 200,
      totalResults: undefined,
      isSearching: false,
      hasError: false,

      downloadSelection: new Backbone.Collection(),

      hasLoaded: 0,
      debounceTime: 250,
    };
  }

  initialize() {
    const layerModel = this.get('layerModel');
    switch (layerModel.get('search.protocol')) {
      case 'EO-WCS':
        this.set('results', new EOWCSCollection());
        break;
      case 'OpenSearch':
        this.set('results', new OpenSearchCollection());
        break;
      default:
        throw new Error(`Unsupported search protocol '${layerModel.get('search.protocol')}'.`);
    }

    // back reference from results to collection
    this.get('results').searchModel = this;

    this.listenTo(this, 'change:debounceTime', this.onDebounceTimeChange);
    this.listenTo(this, 'change:automaticSearch', this.onAutomaticSearchChange);

    this.listenTo(layerModel, 'change:display.visible', this.onLayerVisibleChange);
    this.listenTo(this.get('results'), 'reset', this.onSearchCollectionReset);
    this.listenTo(this.get('filtersModel'), 'change', this.onFiltersModelChange);
    this.listenTo(this.get('mapModel'), 'change:bbox', this.onMapBBOXChange);
    this.listenTo(this.get('mapModel'), 'change:time', this.onMapTimeChange);

    this.onDebounceTimeChange();
    this.set('automaticSearch', layerModel.get('display.visible'));
  }

  search() {
    const layerModel = this.get('layerModel');
    const filtersModel = this.get('filtersModel');
    const mapModel = this.get('mapModel');

    this.doSearchDebounced(layerModel, filtersModel, mapModel);
  }

  doSearch(layerModel, filtersModel, mapModel) {
    if (this.prevRequest && this.prevRequest.cancel) {
      this.prevRequest.cancel();
    }
    this.prevRequest = searchAllRecords(layerModel, filtersModel, mapModel, {
      itemsPerPage: this.get('defaultPageSize'),
      maxCount: this.get('maxCount'),
    });

    this.set({
      isSearching: true,
      hasError: false,
      hasLoaded: 0,
    });
    this.get('results').reset([]);

    return this.prevRequest.then((result) => {
      this.set({
        totalResults: result.totalResults,
        startIndex: result.startIndex,
        itemsPerPage: result.itemsPerPage,
        isSearching: false,
        hasLoaded: result.records.length,
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

  onDebounceTimeChange() {
    this.doSearchDebounced = debounce(
      (...args) => this.doSearch(...args), this.get('debounceTime')
    );
  }

  onAutomaticSearchChange() {
    if (this.get('automaticSearch')) {
      this.search();
    }
  }

  onLayerVisibleChange() {
    const layerModel = this.get('layerModel');
    this.set('automaticSearch', layerModel.get('display.visible'));
  }

  onSearchCollectionReset() {
    this.trigger('search:complete', this);
  }

  onFiltersModelChange() {
    if (this.get('automaticSearch')) {
      this.search();
    }
  }

  onMapBBOXChange() {
    if (this.get('automaticSearch') && !this.get('filtersModel').get('area')) {
      this.search();
    }
  }

  onMapTimeChange() {
    if (this.get('automaticSearch') && !this.get('filtersModel').get('time')) {
      this.search();
    }
  }

  triggerShowInfo(records) {
    this.trigger('showInfo', Array.isArray(records) ? records : [records]);
  }
}

export default SearchModel;
