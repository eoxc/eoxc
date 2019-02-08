import Marionette from 'backbone.marionette';
import urlParse from 'url-parse';

import template from './DownloadSelectionView.hbs';
import './DownloadSelectionView.css';
import SelectionListView from './SelectionListView';
import { downloadCustom, getDownloadInfos } from '../../download/';
import metalinkTemplate from '../Metalink.hbs';


const DownloadView = Marionette.CompositeView.extend({
  template,
  templateHelpers() {
    return {
      termsAndConditionsUrl: this.termsAndConditionsUrl,
      downloadEnabled: this.downloadEnabled,
      selectFilesEnabled: typeof this.onSelectFiles !== 'undefined',
    };
  },
  className: 'download-view',
  childView: SelectionListView,
  childViewContainer: '.selection-lists',
  buildChildView(child, ChildViewClass) {
    return new ChildViewClass({
      model: child,
      collection: child.get('downloadSelection'),
      mapModel: this.mapModel,
      highlightModel: this.highlightModel,
      fallbackThumbnailUrl: this.fallbackThumbnailUrl,
    });
  },

  events: {
    'click .start-download': 'onStartDownloadClicked',
    'click .download-as-metalink': 'onDownloadAsMetalinkClicked',
    'click .download-as-url-list': 'onDownloadAsUrlListClicked',
    'click .select-files': 'onSelectFilesClicked',
    'click .deselect-all': 'onDeselectAllClicked',
    'change .terms-and-conditions': 'onTermsAndAndConditionsChange',
  },

  initialize(options) {
    this.mapModel = options.mapModel;
    this.filtersModel = options.filtersModel;
    this.highlightModel = options.highlightModel;
    this.termsAndConditionsUrl = options.termsAndConditionsUrl;
    this.downloadEnabled = options.downloadEnabled;
    this.fallbackThumbnailUrl = options.fallbackThumbnailUrl;

    this.collection.each((searchModel) => {
      this.listenTo(
        searchModel.get('downloadSelection'), 'reset update', this.onDownloadSelectionChange
      );
    });
    this.onSelectFiles = options.onSelectFiles;
    this.onStartDownload = options.onStartDownload;
  },

  onAttach() {
    this.triggerMethod('update:status', this._infoBadge());
  },

  onSelectFilesClicked() {
    this.onSelectFiles();
  },

  onStartDownloadClicked() {
    this.onStartDownload();
  },

  onDownloadAsMetalinkClicked() {
    this._getDownloadInfos()
      .then((items) => {
        let content = metalinkTemplate({
          date: (new Date()).toISOString(),
          items,
        });
        content = content.replace(/[\n]/g, '\r\n');
        downloadCustom('download-files.meta4', 'application/metalink4+xml', content);
      });
  },

  onDownloadAsUrlListClicked() {
    this._getDownloadInfos()
      .then((infos) => {
        downloadCustom('url-list.txt', 'text/plain',
          infos.map(info => info.href).join('\r\n')
        );
      });
  },

  onDeselectAllClicked() {
    this.collection.each(searchModel =>
      searchModel.get('downloadSelection').reset([])
    );
  },

  onTermsAndAndConditionsChange() {
    this.hasAcceptedTerms = this.$('.terms-and-conditions').is(':checked');
    this.checkButtons();
  },

  onDownloadSelectionChange() {
    this.checkButtons();
  },

  checkButtons() {
    const totalCountNotS3 = this.collection
      .filter(searchModel => searchModel.get('layerModel').get('download.protocol') !== 'S3')
      .reduce((count, searchModel) => (
        count + searchModel.get('downloadSelection').length
      ), 0);

    const totalCount = this.collection
      .reduce((count, searchModel) => (
        count + searchModel.get('downloadSelection').length
      ), 0);

    let fullDownloadEnabled = totalCountNotS3 > 0 && this.downloadEnabled;
    let textDownloadEnabled = totalCount > 0 && this.downloadEnabled;
    if (this.termsAndConditionsUrl) {
      fullDownloadEnabled = fullDownloadEnabled && this.hasAcceptedTerms;
      textDownloadEnabled = textDownloadEnabled && this.hasAcceptedTerms;
    }

    this.$('.start-download')
      .prop('disabled', !fullDownloadEnabled);

    this.$('.dropdown-toggle')
      .prop('disabled', !textDownloadEnabled);

    this.$('.select-files')
      .prop('disabled', !textDownloadEnabled);

    this.$('.deselect-all')
      .prop('disabled', totalCount === 0);

    this.triggerMethod('update:status', this._infoBadge(totalCount));
  },

  _infoBadge(totalCount = 0) {
    return `<span>(${totalCount})</span>`;
  },

  _getDownloadInfos(options) {
    function flatten(arr) {
      return arr.reduce((acc, val) => acc.concat(val), []);
    }


    const chunks = this.collection
      .map(searchModel =>
        searchModel.get('downloadSelection')
          .map(recordModel => getDownloadInfos(
            searchModel.get('layerModel'), this.filtersModel, recordModel, options)
          )
      );

    return Promise.all(flatten(chunks))
      .then(received => flatten(received));
  }
});

export default DownloadView;
