import Marionette from 'backbone.marionette';
import _ from 'underscore';
import i18next from 'i18next';

import template from './DownloadSelectionView.hbs';
import './DownloadSelectionView.css';
import SelectionListView from './SelectionListView';
import { downloadCustom, getDownloadInfos } from '../../download/';
import { flatten } from '../../download/url';
import metalinkTemplate from '../Metalink.hbs';
import { flattenDownloadSelectionByCoverage } from '../url';

const DownloadView = Marionette.CompositeView.extend({
  template,
  templateHelpers() {
    return {
      termsAndConditionsUrl: this.termsAndConditionsUrl,
      downloadEnabled: this.downloadEnabled,
      selectFilesEnabled: typeof this.onSelectFiles !== 'undefined',
      wpsProcessing: this.wpsProcessing
    };
  },
  className: 'download-view',
  childView: SelectionListView,
  childViewContainer: '.selection-lists',
  buildChildView(child, ChildViewClass) {
    return new ChildViewClass({
      model: child,
      referenceCollection: child.get('downloadSelection'),
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
    'click .start-wps-processing' : 'onStartWPSProcessingClicked',
    'change .terms-and-conditions': 'onTermsAndAndConditionsChange',
  },

  childEvents: {
    'collapse:change': 'updateViews',
    'before:render': 'onChildBeforeRender',
    render: 'onChildRender',
  },

  initialize(options) {
    this.mapModel = options.mapModel;
    this.filtersModel = options.filtersModel;
    this.highlightModel = options.highlightModel;
    this.termsAndConditionsUrl = options.termsAndConditionsUrl;
    this.downloadEnabled = options.downloadEnabled;
    this.fallbackThumbnailUrl = options.fallbackThumbnailUrl;
    this.wpsProcessing =
    this.collection.filter((searchModel)=>searchModel.get('layerModel').get('wpsProcessing')
    ).length > 0;
    this.collection.each((searchModel) => {
      this.listenTo(
        searchModel.get('downloadSelection'), 'reset update', this.onDownloadSelectionChange
      );
    });
    this.onSelectFiles = options.onSelectFiles;
    this.onStartDownload = options.onStartDownload;
    this.onMultiDownload = options.onMultiDownload;
    this.onStartWPSProcessing = options.onStartWPSProcessing;
  },

  onChildBeforeRender() {
    // save the scrolling position for later to get around bug in FF and other
    // browsers. Prevent additional updates to scrolling position.
    if (typeof this.savedScrollTop === 'undefined') {
      this.savedScrollTop = this.$('.selection-lists')[0].scrollTop;
    }
  },

  onChildRender() {
    if (typeof this.savedScrollTop !== 'undefined') {
      setTimeout(() => {
        this.$('.selection-lists').scrollTop(this.savedScrollTop);
        this.savedScrollTop = undefined;
      });
    }
  },

  onShown() {
    this.updateViews();
  },

  updateViews() {
    // handle showing of only those products, which are in current scroll area
    // should be triggered when download list rendered, when scrolling and when download collection changes and basket tab is visible
    const elem = this.$('.selection-lists')[0];
    const scrollTop = elem.scrollTop;
    const height = elem.clientHeight;
    let sizeAccum = 0;
    for (let i = 0; i < this.children.length; ++i) {
      const view = this.children.findByIndex(i);
      const headerSize = 70;
      const footerSize = 0;
      const itemHeight = 153;
      view.setSlice(sizeAccum - scrollTop, height, view, headerSize, footerSize, itemHeight);
      sizeAccum += view.$el.outerHeight(true);
    }
    elem.scrollTop = scrollTop;
  },

  onRender() {
    this.$('.selection-lists').on('scroll resize', _.throttle((...args) => {
      this.updateViews(...args);
    }, 1000 / 60));
  },

  onBeforeRender() {
    this.$('.selection-lists').off('scroll resize');
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

  onStartWPSProcessingClicked(){
    this.onStartWPSProcessing();
  },

  onTermsAndAndConditionsChange() {
    this.hasAcceptedTerms = this.$('.terms-and-conditions').is(':checked');
    this.checkButtons();
  },

  onDownloadSelectionChange() {
    this.checkButtons();
    this.updateViews();
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

    if (!fullDownloadEnabled) {
      this.$('.start-download')
        .prop('title', `${i18next.t('no_item_downloadable')} ${i18next.t('no_item_downloadable_hint')}`);
    } else {
      this.$('.start-download').removeProp('title');
    }

    this.$('.dropdown-toggle')
      .prop('disabled', !textDownloadEnabled);

    if (!textDownloadEnabled) {
      this.$('.dropdown-toggle')
        .prop('title', `${i18next.t('no_item_downloadable')} ${i18next.t('no_item_downloadable_hint')}`);
    } else {
      this.$('.dropdown-toggle').removeProp('title');
    }

    this.$('.select-files')
      .prop('disabled', !textDownloadEnabled);

    if (!textDownloadEnabled) {
      this.$('.select-files')
        .prop('title', `${i18next.t('no_item_downloadable')} ${i18next.t('no_item_downloadable_hint')}`);
    } else {
      this.$('.select-files').removeProp('title');
    }

    this.$('.deselect-all')
      .prop('disabled', totalCount === 0);

    this.triggerMethod('update:status', this._infoBadge(totalCount));
  },

  _infoBadge(totalCount = 0) {
    return `<span>(${totalCount})</span>`;
  },

  _getDownloadInfos(options) {
    const chunks = this.collection
      .map(searchModel => {
        const records = flattenDownloadSelectionByCoverage(searchModel.get('downloadSelection'));
        return records
          .map(recordModel => getDownloadInfos(
            searchModel.get('layerModel'), this.filtersModel, recordModel, options)
          )
        });

    return Promise.all(flatten(chunks))
      .then(received => flatten(received));
  }
});

export default DownloadView;
