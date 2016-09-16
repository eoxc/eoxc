import Marionette from 'backbone.marionette';
import SearchResultListView from './SearchResultListView';

import downloadEOWCS from '../../download/eowcs';
import downloadURL from '../../download/url';

require('./SearchResultView.css');
const template = require('./SearchResultView.hbs');

const SearchResultView = Marionette.CompositeView.extend(/** @lends search/views/layers.SearchResultView# */{
  template,
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

  initialize(options) {
    this.mapModel = options.mapModel;
    this.filtersModel = options.filtersModel;
    this.onResultItemClicked = options.onResultItemClicked;
    this.onResultItemInfo = options.onResultItemInfo;
    this.onDownload = options.onDownload;
  },

  buildChildView(child, ChildViewClass) {
    const options = {
      model: child,
      collection: child.get('results'),
      mapModel: this.mapModel,
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

    let downloadForms = [];

    visibleSearchModels.forEach(searchModel => {
      const newDownloadForms = searchModel.get('downloadSelection')
        .map(recordModel => {
          const layerModel = searchModel.get('layerModel');
          if (layerModel.get('download.protocol') === 'EO-WCS') {
            return downloadEOWCS(
              layerModel,
              this.filtersModel,
              recordModel,
              options
            );
          }
          // TODO: other download implementations
          return downloadURL(recordModel);
        });
      downloadForms = downloadForms.concat(newDownloadForms);
    });

    // actually start the download
    const $downloadElements = this.$('#download-elements');
    downloadForms.forEach(($form, index) => {
      $downloadElements.append($form);
      setTimeout(() => {
        $form.submit();
      }, index * 1000);
    });
  },
});

export default SearchResultView;
