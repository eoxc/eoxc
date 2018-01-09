import Marionette from 'backbone.marionette';

const template = require('./RecordDetailsView.hbs');
require('./RecordDetailsView.css');

// eslint-disable-next-line max-len
const RecordDetailsView = Marionette.LayoutView.extend(/** @lends search/views/layers.RecordDetailsView# */{
  template,
  regions: {
    map: '.record-details-map',
  },

  templateHelpers() {
    return {
      thumbnailUrl: this.model.getThumbnailUrl(),
      browseUrl: this.model.getBrowseUrl(),
      description: this.model.getDescription(this.descriptionTemplate),
      title: this.model.getTitle(),
    };
  },

  initialize(options) {
    this.mapView = options.mapView;
    this.mapModel = options.mapModel;
    this.descriptionTemplate = options.descriptionTemplate;
  },

  onAttach() {
    this.showChildView('map', this.mapView);
    this.mapModel.show(this.model.attributes);
  },
});

export default RecordDetailsView;
