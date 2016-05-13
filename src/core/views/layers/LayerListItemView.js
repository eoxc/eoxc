import Marionette from 'backbone.marionette';

const template = require('./LayerListItemView.hbs');
require('./LayerListItemView.css');

const LayerListItemView = Marionette.ItemView.extend({
  tagName: 'li',
  className: 'layer-list-item',
  template,
  events: {
    'change .layer-visible': 'onLayerVisibleChange',
    'click .layer-options': 'onLayerOptionsClick',
  },

  initialize(options) {
    this.singleChoice = options.singleChoice;
    this.fullDisplay = options.fullDisplay;
  },

  templateHelpers() {
    return {
      singleChoice: this.singleChoice,
      fullDisplay: this.fullDisplay,
    };
  },

  onLayerVisibleChange() {
    this.model.set('display.visible', this.$('.layer-visible').is(':checked'));
  },

  onLayerOptionsClick() {
    this.model.trigger('show', this.model);
  },
});

export default LayerListItemView;
