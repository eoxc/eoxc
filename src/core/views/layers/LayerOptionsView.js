import Marionette from 'backbone.marionette';

const template = require('./LayerOptionsView.hbs');

const LayerOptionsView = Marionette.ItemView.extend({
  template,
  events: {
    'input #layer-options-opacity': 'onOpacitySlide',
  },

  templateHelpers() {
    return {
      exists(variable, options) {
        if (typeof variable !== 'undefined') {
          return options.fn(this);
        } else {
          return options.inverse(this);
        }
      },
    };
  },

  initialize() {

  },

  onOpacitySlide() {
    const display = Object.assign({}, this.model.get('display'));
    display.opacity = this.$('#layer-options-opacity').val();
    this.model.set('display', display);
  },
});

export default LayerOptionsView;
