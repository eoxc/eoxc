import Marionette from 'backbone.marionette';

import template from './DownloadView.hbs';
import './DownloadView.css';
import SelectionListView from './SelectionListView';
import download from '../../download/';


const DownloadView = Marionette.CompositeView.extend({
  template,
  className: 'download-view',
  childView: SelectionListView,
  childViewContainer: '.selection-lists',
  buildChildView(child, ChildViewClass) {
    return new ChildViewClass({
      model: child,
      collection: child.get('downloadSelection'),
      highlightModel: this.highlightModel,
    });
  },

  events: {
    'click .start-download': 'onStartDownloadClicked',
    'click .download-as-csv': 'onDownloadAsCSVClicked',
    'click .download-as-metalink': 'onDownloadAsMetalinkClicked',
    'click .download-as-url-list': 'onDownloadAsUrlListClicked',
    'click .deselect-all': 'onDeselectAllClicked',
  },

  initialize(options) {
    this.filtersModel = options.filtersModel;
    this.highlightModel = options.highlightModel;

    this.collection.each((searchModel) => {
      this.listenTo(
        searchModel.get('downloadSelection'), 'reset update', this.onDownloadSelectionChange
      );
    });
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

    visibleSearchModels.forEach((searchModel) => {
      searchModel.get('downloadSelection')
        .forEach((recordModel) => {
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

  onDownloadAsCSVClicked() {
    alert('Downloading as CSV');
  },

  onDownloadAsMetalinkClicked() {
    alert('Downloading as Metalink');
  },

  onDownloadAsUrlListClicked() {
    alert('Downloading as URL-List');
  },

  onDeselectAllClicked() {
    this.collection.each(searchModel =>
      searchModel.get('downloadSelection').reset([])
    );
  },

  onDownloadSelectionChange() {
    const totalCount = this.collection.reduce((count, searchModel) => (
      count + searchModel.get('downloadSelection').length
    ), 0);

    this.$('.download-control')
      .find('button,select,input')
      .prop('disabled', totalCount === 0);

    this.triggerMethod('update:status', totalCount ? `<span class="badge">${totalCount}</span>` : '');
  },
});

export default DownloadView;
