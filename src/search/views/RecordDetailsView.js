import Marionette from 'backbone.marionette';

const template = require('./RecordDetailsView.hbs');


const RecordDetailsView = Marionette.ItemView.extend(/** @lends search/views/layers.RecordDetailsView# */{
  template,
  tagName: 'li',
  triggers: {
  },

  onClicked() {
  },

  onHover() {
  },
});

export default RecordDetailsView;
