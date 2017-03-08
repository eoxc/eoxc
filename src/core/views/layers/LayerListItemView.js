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

    'click .layer-adjust-opacity': 'onLayerAdjustOpacityClick',
    'inserted.bs.popover': 'onPopoverInserted',
    'hidden.bs.popover': 'onPopoverHidden',
  },

  /**
    @constructs
    @param {Object} options
    @param {core/models.LayersCollection} options.collection The layers to display
    @param {boolean} options.singleChoice Whether the visibility of the layers
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
    this.$popoverButton = this.$('[data-toggle="popover"]');
    this.$popoverButton.popover({
      container: 'body',
      content: 'x',
      trigger: 'manual',
    });
  },

  onLayerAdjustOpacityClick() {
    if (!this.isPopoverShown) {
      this.$popoverButton.popover('show');
    }
  },

  onPopoverInserted() {
    this.isPopoverShown = true;
    const popoverId = this.$('.layer-adjust-opacity').attr('aria-describedby');
    const $popover = $(`#${popoverId}`);
    const $popoverContent = $popover.find('.popover-content');
    $popover.addClass('layer-adjust-opacity-popover');
    $popoverContent
      .empty().text('')
      .css('width', '200px');

    let opacity = this.model.get('display.opacity');
    opacity = typeof opacity === 'undefined' ? 1 : opacity;

    this.$slider = $('<input/>')
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
    this.$slider.on('change', () => {
      this.model.set('display.opacity', parseInt(this.$slider.val(), 10) / 100);
    });
    this.$slider.on('slideStop', () => $popover.focus());

    $popover.attr('tabindex', '0');
    $popover.focus();

    $popover[0].onblur = (event) => {
      // fix for IE, as the blur event is also raised when a child gets focused:
      // check if the currently targeted element is a descendant. Only hide the
      // popover when the new target is outside of the popover.
      const $target = $(event.explicitOriginalTarget || document.activeElement);
      if ($target.closest($popover).length === 0) {
        this.$popoverButton.popover('hide');
        $popover[0].onblur = null;
      } else {
        $popover.focus();
      }
    };
  },
  onPopoverHidden() {
    this.isPopoverShown = false;
    this.$slider.off('slide');
    this.$slider.off('change');
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
