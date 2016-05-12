import Marionette from 'backbone.marionette';

const template = require('./LayerListItemView.hbs');
require('./LayerListItemView.css');

const LayerListItemView = Marionette.ItemView.extend({
  tagName: 'li',
  className: 'layer-list-item',
  template,
  events: {
    'change .layer-visible': 'onLayerVisibleChange',
  },
  initialize(options) {
  },

  onLayerVisibleChange() {
    this.model.set('visible', this.$('.layer-visible').is(':checked'));
  },
});

export default LayerListItemView;
