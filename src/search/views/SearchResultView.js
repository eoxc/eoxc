import Backbone from 'backbone';
import Marionette from 'backbone.marionette';
import SearchResultListView from './SearchResultListView';

import download from '../../download/';

require('./SearchResultView.css');
const template = require('./SearchResultView.hbs');

const SearchResultView = Marionette.LayoutView.extend(/** @lends search/views/layers.SearchResultView# */{
  template,
  templateHelpers() {
    return {
      showDownloadOptions: this.collection.any(searchModel => (
        searchModel.get('layerModel').get('download.protocol') === 'EO-WCS'
      )),
      layers: this.collection.map(model => model.get('layerModel').toJSON()),
      selectedLayer: this.selectedLayer ? this.selectedLayer.toJSON() : null,
    };
  },

  className: 'search-result-view',

  childView: SearchResultListView,

  childViewContainer: '.result-contents',

  childEvents: {
    'item:clicked': 'onResultItemClicked',
    'item:info': 'onChildItemInfo',
  },

  events: {
    'click #start-download': 'onStartDownloadClicked',
    'change input[data-layer]': 'onLayerSelectionChange',
  },

  regions: {
    'search-results': '.result-contents',
  },

  initialize(options) {
    this.filtersModel = options.filtersModel;
    this.highlightModel = options.highlightModel;
    this.onResultItemClicked = options.onResultItemClicked;
    this.onResultItemInfo = options.onResultItemInfo;
    this.onDownload = options.onDownload;

    this.selectedSearchModels = [];

    this.listenTo(this.collection, 'change', this.onSearchModelsChange);

    this.collection.each((searchModel) => {
      this.listenTo(
        searchModel.get('downloadSelection'), 'reset update', this.onDownloadSelectionChange
      );

      this.listenTo(searchModel.get('layerModel'), 'change:display.visible', (layerModel) => {
        let newSelectedSearchModels;
        const $checkbox = this.$(`[data-layer="${layerModel.get('id')}"]`);
        if (layerModel.get('display.visible')) {
          newSelectedSearchModels = this.selectedSearchModels.concat([searchModel]);
          $checkbox.parent().show();
          $checkbox.prop('checked', true);
        } else {
          newSelectedSearchModels = this.selectedSearchModels.filter(
            model => model !== searchModel
          );
          $checkbox.parent().hide();
        }
        this.setSelectedSearchModels(newSelectedSearchModels);
      });
    });
  },

  onAttach() {
    this.onLayerSelectionChange();
  },

  setSelectedSearchModels(searchModels) {
    const names = searchModels.map(
      (searchModel) => searchModel.get('layerModel').get('displayName')
    );
    const visibleLayers = this.collection.filter(model => model.get('layerModel').get('display.visible'));
    if (visibleLayers.length) {
      if (names.length) {
        this.$('.selected-layer-names').html(`${names.length} layer${names.length > 1 ? 's' : ''} selected.`);
      } else {
        this.$('.selected-layer-names').html('<i>No layer selected</i>');
      }
      this.$('.dropdown button').prop('disabled', false);
    } else {
      this.$('.selected-layer-names').html('<i>No layer available</i>');
      this.$('.dropdown button').prop('disabled', true);
    }

    // adjust events
    const previousSearchModels = this.selectedSearchModels;
    previousSearchModels.forEach((previousSearchModel) => {
      if (!searchModels.indexOf(previousSearchModel) !== -1) {
        this.stopListening(previousSearchModel.get('results'));
      }
    });
    searchModels.forEach((searchModel) => {
      if (!previousSearchModels.indexOf(searchModel) !== -1) {
        this.listenTo(searchModel.get('results'), 'reset add', this.onResultsChange);
      }
    });

    this.selectedSearchModels = searchModels;
    this.onResultsChange();
  },

  onResultsChange() {
    const collection = new Backbone.Collection(
      this.selectedSearchModels.reduce((sum, searchModel) => (
        sum.concat(searchModel.get('results').models)
      ), [])
    );
    this.showChildView('search-results', new SearchResultListView({
      searchModel: this.selectedSearchModel,
      referenceCollection: collection,
      highlightModel: this.highlightModel,
    }));
  },

  onLayerSelectionChange() {
    // get a list of all selected layers
    const ids = this.$('[data-layer]:checked')
      .map((i, elem) => elem.dataset.layer)
      .toArray();

    // filter selected
    const selectedSearchModels = this.collection.filter((searchModel) => (
      ids.indexOf(searchModel.get('layerModel').get('id')) > -1
    ));
    this.setSelectedSearchModels(selectedSearchModels);
    this.onSearchModelsChange();
  },

  onSearchModelsChange(searchModel) {
    if (searchModel) {
      // update the layers status
      const layerModel = searchModel.get('layerModel');
      const $status = this.$(`[data-layer="${layerModel.get('id')}"]`)
        .parent()
        .find('.search-status');

      if (searchModel.get('isSearching')) {
        $status.html('<i class="fa fa-circle-o-notch fa-spin"></i>');
      } else if (searchModel.get('hasError')) {
        $status.html('<i class="fa fa-exclamation"></i>');
      } else {
        $status.html(`${searchModel.get('hasLoaded')}/${searchModel.get('totalResults')}`);
      }
    }

    // update the global status
    const $globalStatus = this.$('.global-search-status');
    if (this.collection.any((model) => model.get('hasError'))) {
      $globalStatus.html('<i class="fa fa-exclamation"></i>');
    } else if (this.collection.any((model) => model.get('isSearching'))) {
      $globalStatus.html('<i class="fa fa-circle-o-notch fa-spin"></i>');
    } else if (this.selectedSearchModels.length) {
      const sumTotalResults = this.selectedSearchModels.reduce(
        (current, model) => (current + model.get('totalResults')), 0
      );
      const sumHasLoaded = this.selectedSearchModels.reduce(
        (current, model) => (current + model.get('hasLoaded')), 0
      );
      $globalStatus.html(`${sumHasLoaded}/${sumTotalResults}`);
    } else {
      $globalStatus.html('');
    }
  },

  onChildItemInfo(childView, args) {
    const recordModel = args.model;
    this.onResultItemInfo(recordModel, recordModel.collection.searchModel);
  },

  // TODO: move to Download section
  // onStartDownloadClicked() {
  //   const visibleSearchModels = this.collection.filter(
  //     searchModel => searchModel.get('layerModel').get('display.visible')
  //   );
  //
  //   const options = {
  //     format: null,
  //     outputCRS: 'EPSG:4326', // TODO:
  //   };
  //
  //   let index = 0;
  //   const $downloadElements = this.$('#download-elements');
  //
  //   visibleSearchModels.forEach(searchModel => {
  //     searchModel.get('downloadSelection')
  //       .forEach(recordModel => {
  //         setTimeout(() => {
  //           download(
  //             searchModel.get('layerModel'),
  //             this.filtersModel,
  //             recordModel,
  //             options,
  //             $downloadElements
  //           );
  //         }, index * 1000);
  //         index++;
  //       });
  //   });
  // },
  //
  // onDownloadSelectionChange() {
  //   const totalCount = this.collection.reduce((count, searchModel) => (
  //     count + searchModel.get('downloadSelection').length
  //   ), 0);
  //
  //   this.$('#start-download').prop('disabled', totalCount === 0);
  // },
});

export default SearchResultView;
