import Marionette from 'backbone.marionette';
import urlParse from 'url-parse';

import template from './DownloadSelectionView.hbs';
import './DownloadSelectionView.css';
import SelectionListView from './SelectionListView';
import { downloadCustom, getDownloadUrl } from '../../download/';
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

    this.onStartDownload = options.onStartDownload;
  },

  onAttach() {
    this.triggerMethod('update:status', this._infoBadge());
  },

  onStartDownloadClicked() {
    this.onStartDownload();
  },

  onDownloadAsMetalinkClicked() {
    let content = metalinkTemplate({
      date: (new Date()).toISOString(),
      files: this._getDownloadInfos(),
    });
    content = content.replace(/[\n]/g, '\r\n');
    downloadCustom('download-files.meta4', 'application/metalink4+xml', content);
  },

  onDownloadAsUrlListClicked() {
    const urls = this._getDownloadInfos().map(info => info.url);
    downloadCustom('url-list.txt', 'text/plain', urls.join('\r\n'));
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

    this.triggerMethod('update:status', this._infoBadge(totalCount));
  },

  _infoBadge(totalCount = 0) {
    return `<span>(${totalCount})</span>`;
  },

  _getDownloadInfos(options) {
    return this.collection.reduce((acc, searchModel) =>
      acc.concat(searchModel.get('downloadSelection')
        .map((recordModel) => {
          const layerModel = searchModel.get('layerModel');
          const url = getDownloadUrl(layerModel, this.filtersModel, recordModel, options);
          let name = recordModel.get('id');
          const parsed = urlParse(url);
          if (parsed.query.length === 0) {
            const parts = parsed.pathname.split('/');
            name = parts[parts.length - 1];
          }
          return { url, name };
        })
      ), [])
      .filter(info => !!info.url);
  }
});

export default DownloadView;
