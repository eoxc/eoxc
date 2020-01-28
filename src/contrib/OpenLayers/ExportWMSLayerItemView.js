import Marionette from 'backbone.marionette';
import template from './ExportWMSLayerItemView.hbs';

const ExportWMSLayerItemView = Marionette.ItemView.extend({
  tagName: 'li',
  template,
  events: {
    mouseover: 'onMouseOver',
  },
  initialize(options) {
    this.useDetailsDisplay = options.useDetailsDisplay;
    this.mapModel = options.mapModel;
    this.usedView = options.usedView;
  },
  templateHelpers() {
    const id = this.model.get('id');
    const name = this.model.get('displayName') || id;
    return { id, name };
  },
  onMouseOver() {
    const url = this.usedView.triggerMethod('export:wmsurl', this.model, this.useDetailsDisplay);
    this.$el.find('a').attr('href', url);
  }
});

export default ExportWMSLayerItemView;
