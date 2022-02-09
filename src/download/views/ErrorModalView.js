import Marionette from 'backbone.marionette';

const template = require('./ErrorModalView.hbs');

// eslint-disable-next-line max-len
const ErrorModalView = Marionette.ItemView.extend(/** @lends core/views/layers.LayerOptionsView# */{
  template,
  className: 'thing error-modal',
  events: {
    'click .close-error-modal':'onClose',
  },

  templateHelpers() {},

  /**
    @constructs
    @param {Object} options
    @param {core/models.LayerModel} options.model The layer to display options for
   */
  initialize() {

  },
  onClose(){
    this.$el.remove()

  }
});

export default ErrorModalView;
