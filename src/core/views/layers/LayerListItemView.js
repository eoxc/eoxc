import Marionette from 'backbone.marionette';

import template from './LayerListItemView.hbs';
import './LayerListItemView.css';

// eslint-disable-next-line max-len
const LayerListItemView = Marionette.ItemView.extend(/** @lends core/views/layers.LayerListItemView# */{
  tagName: 'li',
  className: 'layer-list-item',
  template,
  events: {
    'change .layer-visible': 'onLayerVisibleChange',
    'click .layer-options': 'onLayerOptionsClick',
  },

  /**
    @constructs
    @param {Object} options
    @param {core/models.LayersCollection} options.collection The layers to display
    @param {boolean} options.singleChoive Whether the visibility of the layers
                                          is mutually exclusive.
    @param {boolean} options.fullDisplay Whether the layers shall be displayed
                                         with options, colors, etc.
   */
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
