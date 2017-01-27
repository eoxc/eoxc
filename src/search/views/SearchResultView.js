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
    'collection:reset': 'onChildCollectionReset',
    'item:clicked': 'onResultItemClicked',
    'item:info': 'onResultItemInfo',
  },

  events: {
    'click #start-download': 'onStartDownloadClicked',
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
    this.collection.each(searchModel => {
      this.listenTo(
        searchModel.get('downloadSelection'), 'reset update', this.onDownloadSelectionChange
      );
    });
    this.setSelectedSearchModel(this.collection.find((searchModel) => (
      searchModel.get('layerModel').get('display.visible')
    )));
  },

  setSelectedSearchModel(selectedSearchModel) {
    if (this.selectedSearchModel) {
      this.stopListening(this.selectedSearchModel.get('results'));
    }

    this.listenTo(
      selectedSearchModel.get('results'), 'reset', this.onResultsChange
    );
    this.selectedSearchModel = selectedSearchModel;
  },

  onResultsChange(resultsCollection) {
    if (resultsCollection) {
      this.showChildView('search-results', new SearchResultListView({
        searchModel: this.selectedSearchModel,
        referenceCollection: resultsCollection,
        downloadSelectionCollection: this.selectedSearchModel.get('downloadSelection'),
        highlightModel: this.highlightModel,
      }));
    }
  },

  buildChildView(child, ChildViewClass) {
    const options = {
      model: child,
      collection: child.get('results'),
      highlightModel: this.highlightModel,
      downloadSelectionCollection: child.get('downloadSelection'),
    };
    return new ChildViewClass(options);
  },

  onChildCollectionReset(childView, collection) {
    const $a = this.$(`a[href='#search-results-${childView.model.get('layerModel').get('id')}']`);
    $a.text(`${childView.model.get('layerModel').get('displayName')} (${collection.length})`);
  },

  onStartDownloadClicked() {
    const visibleSearchModels = this.collection.filter(
      searchModel => searchModel.get('layerModel').get('display.visible')
    );

    const options = {
      format: null,
      outputCRS: 'EPSG:4326', // TODO:
    };

    let index = 0;
    const $downloadElements = this.$('#download-elements');

    visibleSearchModels.forEach(searchModel => {
      searchModel.get('downloadSelection')
        .forEach(recordModel => {
          setTimeout(() => {
            download(
              searchModel.get('layerModel'),
              this.filtersModel,
              recordModel,
              options,
              $downloadElements
            );
          }, index * 1000);
          index++;
        });
    });
  },

  onDownloadSelectionChange() {
    const totalCount = this.collection.reduce((count, searchModel) => (
      count + searchModel.get('downloadSelection').length
    ), 0);

    this.$('#start-download').prop('disabled', totalCount === 0);
  },
});

export default SearchResultView;
