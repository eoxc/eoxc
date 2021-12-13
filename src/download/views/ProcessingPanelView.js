import Marionette from 'backbone.marionette';

import template from './ProcessingPanelView.hbs';
require('./DownloadOptionsModalView.css');
require('../../search/views/RecordDetailsView.css');

// eslint-disable-next-line max-len
const RecordDetailsView = Marionette.LayoutView.extend(/** @lends search/views/layers.RecordDetailsView# */{
  template,

  className: 'record-details-view',

  regions: {
    map: '.record-details-map',
  },

  templateHelpers() {
    return {
      processingModel: this.processingModel,
      thumbnailUrl: this.model.getThumbnailUrl(),
      browseUrl: this.model.getBrowseUrl(),
      description: this.model.getDescription(this.descriptionTemplate),
      title: this.model.getTitle(),
      headerText: this.headerText,
      selectedProcess: null,
      processes: this.processingModel.processes,
    };
  },
  events: {
    'change .select-process': 'onProcessChange',
  },
  initialize(options) {
    this.processingModel = options.processingModel;
    this.mapView = options.mapView;
    this.mapModel = options.mapModel;
    this.descriptionTemplate = options.descriptionTemplate;
    this.headerText = options.headerText;
  },

  onAttach() {
    this.showChildView('map', this.mapView);
    this.mapModel.show(this.model.attributes);
    this.onProcessChange()
  },

  onProcessChange() {
    const val = this.$('.select-process').val();
    const currentClassName = ".process-" + val
    this.model.set('selectedProcess', (val !== '' && val !== '---') ? val : null);
    this.processingModel.processes.map(process => {
      var className = ".process-" + process.id
      this.$(className).hide();
    });

    if(this.model.get('selectedProcess')) {
      this.$('.record-details-map').show();
      this.$(currentClassName).show();
    }else{
      this.$('.record-details-map').hide();
      this.$(currentClassName).show();
    }

  },

});

export default RecordDetailsView;
