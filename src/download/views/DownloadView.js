import Marionette from 'backbone.marionette';

import template from './DownloadView.hbs';
import './DownloadView.css';
import SelectionListView from './SelectionListView';
import { downloadRecord, downloadCustom, getDownloadUrl } from '../../download/';
import metalinkTemplate from '../Metalink.hbs';


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

  onAttach() {
    this.triggerMethod('update:status', '<span class="badge">0</span>');
  },

  onStartDownloadClicked() {
    const options = {
      format: null,
      outputCRS: 'EPSG:4326', // TODO:
    };

    let index = 0;
    const $downloadElements = this.$('#download-elements');

    this.collection.forEach((searchModel) => {
      searchModel.get('downloadSelection')
        .forEach((recordModel) => {
          setTimeout(() => {
            downloadRecord(
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

  onDownloadAsMetalinkClicked() {
    const files = this._getDownloadUrls()
      .map((url) => {
        const parts = url.split('/');
        return {
          name: parts[parts.length - 1],
          url,
        };
      });

    const content = metalinkTemplate({
      date: (new Date()).toISOString(),
      files,
    });
    downloadCustom('download-files.meta4', 'application/metalink4+xml', content);
  },

  onDownloadAsUrlListClicked() {
    const hrefs = this._getDownloadUrls();
    downloadCustom('url-list.txt', 'text/plain', hrefs.join('\n'));
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

    this.triggerMethod('update:status', `<span class="badge">${totalCount}</span>`);
  },

  _getDownloadUrls(options) {
    return this.collection.reduce((acc, searchModel) =>
      acc.concat(searchModel.get('downloadSelection')
        .map(recordModel => getDownloadUrl(
          searchModel.get('layerModel'), this.filtersModel, recordModel, options
        ))
      ), [])
      .filter(href => !!href);
  }
});

export default DownloadView;
