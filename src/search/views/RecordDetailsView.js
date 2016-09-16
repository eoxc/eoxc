import Marionette from 'backbone.marionette';

const template = require('./RecordDetailsView.hbs');


const RecordDetailsView = Marionette.LayoutView.extend(/** @lends search/views/layers.RecordDetailsView# */{
  template,
  regions: {
    map: '.record-details-map',
  },
  triggers: {
  },

  templateHelpers() {
    return {
      thumbnailUrl: this.model.getThumbnailUrl(),
      browseUrl: this.model.getBrowseUrl(),
      description: this.model.get('properties').summary || this.model.get('properties').content,
    };
  },

  initialize(options) {
    this.mapView = options.mapView;
    this.mapModel = options.mapModel;
  },

  onAttach() {

  },

  onModalShown() {
    if (this.mapView) {
      this.showChildView('map', this.mapView);
      this.mapModel.show(this.model.attributes);
      // setTimeout(() => {
      //   this.mapView.onResize();
      // });
    }
  },
});

export default RecordDetailsView;
