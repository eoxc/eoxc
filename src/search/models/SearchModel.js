import Backbone from 'backbone';
import debounce from 'debounce';

import { searchAllRecords, getSearchRequest } from '../';

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
      maxCount: 150,
      loadMore: 150,
      totalResults: undefined,
      isSearching: false,
      isCancelled: false,
      isCountInitiallyDisabled: true,
      hasError: false,
      errorMessage: null,

      hasChanges: false,

      downloadSelection: new Backbone.Collection(),

      hasLoaded: 0,
      debounceTime: 250,
      searchRequest: null,
      searchEnabled: true
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
    this.get('downloadSelection').searchModel = this;

    this.listenTo(this, 'change:debounceTime', this.onDebounceTimeChange);
    this.listenTo(this, 'change:automaticSearch', this.onAutomaticSearchChange);

    this.listenTo(layerModel, 'change:display.visible', this.onLayerVisibleChange);
    this.listenTo(this.get('results'), 'reset', this.onSearchCollectionReset);
    this.listenTo(this.get('filtersModel'), 'change', this.onFiltersModelChange);
    this.listenTo(this.get('mapModel'), 'change:bbox', this.onMapBBOXChange);
    this.listenTo(this.get('mapModel'), 'change:area', this.onMapAreaChange);
    this.listenTo(this.get('mapModel'), 'change:time', this.onMapTimeChange);
    this.listenTo(this.get('mapModel'), 'change:extendedTime', this.onMapExtendedTimeChange);
    this.listenTo(this.get('mapModel'), 'change:tool', this.onMapToolChange);
    this.onDebounceTimeChange();
    this.set('automaticSearch', layerModel.get('display.visible') && this.get('searchEnabled'));
    this.set('prevAutomaticSearch', this.get('searchEnabled'));
    if (this.get('automaticSearch')) {
      this.set('isCountInitiallyDisabled', false);
    }
  }

  search() {
    const layerModel = this.get('layerModel');
    const filtersModel = this.get('filtersModel');
    const mapModel = this.get('mapModel');

    this.doSearchDebounced(layerModel, filtersModel, mapModel);
  }

  searchMore() {
    const layerModel = this.get('layerModel');
    const filtersModel = this.get('filtersModel');
    const mapModel = this.get('mapModel');
    // if loading more, total results information can be used
    this.doSearchDebounced(layerModel, filtersModel, mapModel, false, this.get('hasLoaded'), this.get('totalResults'));
  }

  doSearch(layerModel, filtersModel, mapModel, reset = true, startIndex = 0, totalResults = undefined) {
    this.cancelSearch();
    const searchOptions = {
      itemsPerPage: this.get('defaultPageSize'),
      maxCount: (startIndex === 0) ? this.get('maxCount') : this.get('loadMore'),
      startIndex,
      totalResults,
    };
    const request = searchAllRecords(layerModel, filtersModel, mapModel, searchOptions);
    this.prevRequest = request;
    if (reset) {
      this.set({
        hasLoaded: 0,
        totalResults: 0,
      });
      this.get('results').reset([]);
    }
    this.set({
      isSearching: true,
      isCancelled: false,
      hasError: false,
      errorMessage: null,
    });

    if (reset) {
      getSearchRequest(layerModel, filtersModel, mapModel, searchOptions)
        .then(searchRequest => this.set('searchRequest', searchRequest));
    }

    // return this.prevRequest.then((result) => {
    //   this.set({
    //     totalResults: result.totalResults,
    //     startIndex: result.startIndex,
    //     itemsPerPage: result.itemsPerPage,
    //     isSearching: false,
    //     hasLoaded: result.records.length,
    //   });
    //   this.get('results').reset(result.records);
    // }).catch((error) => {
    //   this.set({
    //     isSearching: false,
    //     hasError: true,
    //   });
    //   this.get('results').reset([]);
    //   this.trigger('search:error', error);
    // });
    const prevHasLoaded = reset ? 0 : this.get('hasLoaded');

    return this.prevRequest
      .on('progress', (page) => {
        const hasLoaded = this.get('hasLoaded');
        this.get('results').add(page.records);
        this.set({
          totalResults: page.totalResults,
          startIndex: page.startIndex,
          itemsPerPage: page.itemsPerPage,
          hasLoaded: hasLoaded + page.records.length,
        });
      })
      .on('success', (result) => {
        this.set({
          totalResults: result.totalResults,
          startIndex: result.startIndex,
          itemsPerPage: result.itemsPerPage,
          isSearching: false,
          hasLoaded: prevHasLoaded + result.records.length,
        });
        // this is set before?
        // this.get('results').reset(result.records);
      })
      .on('error', (error) => {
        this.set({
          isSearching: false,
          hasError: true,
          errorMessage: error.toString(),
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
    this.set('isCountInitiallyDisabled', false);
    if (this.get('automaticSearch') && (this.get('hasChanges') || this.get('hasError') || this.get('isCancelled'))) {
      this.search();
      this.set('hasChanges', false);
    } else {
      this.cancelSearch();
    }
  }

  onLayerVisibleChange() {
    const layerModel = this.get('layerModel');
    if (layerModel.get('display.visible')) {
      this.set('automaticSearch', this.get('prevAutomaticSearch'));
    } else {
      this.set('prevAutomaticSearch', this.get('automaticSearch'));
      this.set('automaticSearch', false);
    }
  }

  onSearchCollectionReset() {
    this.trigger('search:complete', this);
  }

  onFiltersModelChange() {
    if (this.get('automaticSearch')) {
      this.search();
    } else {
      this.set('hasChanges', true);
    }
  }

  onMapBBOXChange() {
    if (!this.get('mapModel').get('area')) {
      if (this.get('automaticSearch') && !this.get('mapModel').get('tool')) {
        this.search();
      } else {
        this.set('hasChanges', true);
      }
    }
  }

  onMapAreaChange() {
    if (this.get('automaticSearch') && !this.get('mapModel').get('tool')) {
      this.search();
    }
  }

  onMapTimeChange() {
    if (this.get('automaticSearch') && !this.get('mapModel').get('extendedTime') && !this.get('mapModel').get('tool')) {
      this.search();
    }
  }

  onMapExtendedTimeChange() {
    if (this.get('automaticSearch')) {
      this.search();
    } else {
      this.set('hasChanges', true);
    }
  }

  onMapToolChange() {
    if (this.get('automaticSearch') && this.get('hasChanges') && !this.get('mapModel').get('tool')) {
      this.search();
      this.set('hasChanges', false);
    }
  }

  triggerShowInfo(records) {
    this.trigger('showInfo', Array.isArray(records) ? records : [records]);
  }

  stopSearching() {
    this.set('automaticSearch', false);
  }

  continueSearching() {
    this.set('automaticSearch', true);
  }

  cancelSearch() {
    if (this.prevRequest && this.get('isSearching') && !this.get('isCancelled')) {
      this.set({
        isSearching: false,
        isCancelled: true,
      });
      this.prevRequest.emit('cancel');
    }
  }
}

export default SearchModel;
