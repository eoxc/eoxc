import Marionette from 'backbone.marionette';

const template = require('./RecordDetailsView.hbs');


const RecordDetailsView = Marionette.ItemView.extend(/** @lends search/views/layers.RecordDetailsView# */{
  template,
  triggers: {
  },

  templateHelpers() {
    return {
      thumbnailUrl: this.model.getThumbnailUrl(),
      browseUrl: this.model.getBrowseUrl(),
    };
  },
});

export default RecordDetailsView;
