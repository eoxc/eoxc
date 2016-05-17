import Marionette from 'backbone.marionette';

const template = require('./LayerOptionsView.hbs');

const LayerOptionsView = Marionette.ItemView.extend(/** @lends core/views/layers.LayerOptionsView# */{
  template,
  events: {
    'input #layer-options-opacity': 'onOpacitySlide',
  },

  templateHelpers() {
    return {
      exists(variable, options) {
        return (typeof variable !== 'undefined') ? options.fn(this) : options.inverse(this);
      },
    };
  },

  /**
    @constructs
    @param {Object} options
    @param {core/models.LayerModel} options.model The layer to display options for
   */
  initialize() {

  },

  onOpacitySlide() {
    const display = Object.assign({}, this.model.get('display'));
    display.opacity = this.$('#layer-options-opacity').val();
    this.model.set('display', display);
  },
});

export default LayerOptionsView;
