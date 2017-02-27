import Marionette from 'backbone.marionette';
import $ from 'jquery';
import 'bootstrap-slider';
import 'bootstrap-slider/dist/css/bootstrap-slider.css';

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
    'shown.bs.popover': 'onPopoverShown',
    'hidden.bs.popover': 'onPopoverHidden',
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

  onAttach() {
    this.$('[data-toggle="popover"]').popover({
      content: 'x',
      animation: false,
    });
  },

  onPopoverShown() {
    const $popoverContent = $(`#${this.$('.layer-adjust-opacity').attr('aria-describedby')} .popover-content`);
    $popoverContent
      .empty().text('')
      .css('width', '200px');

    let opacity = this.model.get('display.opacity');
    opacity = typeof opacity === 'undefined' ? 1 : opacity;

    this.$slider = $('<div/>')
      .appendTo($popoverContent)
      .slider({
        min: 0,
        max: 100,
        value: opacity * 100,
        formatter(value) {
          return `${value}%`;
        }
      });
    this.$slider.on('slide', (event) => {
      this.model.set('display.opacity', event.value / 100);
    });
  },
  onPopoverHidden() {
    this.$slider.off('slide');
    this.$slider.slider('destroy');
  },

  onLayerVisibleChange() {
    this.model.set('display.visible', this.$('.layer-visible').is(':checked'));
  },

  onLayerOptionsClick() {
    this.model.trigger('show', this.model);
  },
});

export default LayerListItemView;
