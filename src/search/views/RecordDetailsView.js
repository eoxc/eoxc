import Marionette from 'backbone.marionette';
import './RecordDetailsView.css';

import template from './RecordDetailsView.hbs';

// eslint-disable-next-line max-len
const RecordDetailsView = Marionette.LayoutView.extend(/** @lends search/views/layers.RecordDetailsView# */{
  template,

  className: 'record-details-view',

  regions: {
    map: '.record-details-map',
  },

  templateHelpers() {
    return {
      thumbnailUrl: this.model.getThumbnailUrl(),
      browseUrl: this.model.getBrowseUrl(),
      description: this.model.getDescription(this.descriptionTemplate),
      title: this.model.getTitle(),
      headerText: this.headerText,
    };
  },

  initialize(options) {
    this.mapView = options.mapView;
    this.mapModel = options.mapModel;
    this.descriptionTemplate = options.descriptionTemplate;
    this.headerText = options.headerText;
  },

  onAttach() {
    this.showChildView('map', this.mapView);
    this.mapModel.show(this.model.attributes);
  },
});

export default RecordDetailsView;
