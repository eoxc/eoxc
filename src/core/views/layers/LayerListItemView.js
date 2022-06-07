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

    // for when no options are set
    'click .layer-adjust-opacity': 'onLayerAdjustOpacityClick',
    'inserted.bs.popover': 'onPopoverInserted',
    'hidden.bs.popover': 'onPopoverHidden',
    'click .layer-download-full-resolution': 'onLayerDownloadFullResolutionClick',

    // when using options
    'click .layer-show-options': 'onShowOptionsClick',
    'click .display-name':'onPopoverClick',
    'click .close': 'close',
  },

  modelEvents: {
    change: 'onModelChange',
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
    const capabilitiesLink = this.model.get('display') && this.model.get('display').urls &&
    (this.model.get('display').protocol === "WMS" || this.model.get('display').protocol === "WMTS") ?
    `${this.model.get('display').urls[0]}?service=${this.model.get('display').protocol}&request=GetCapabilities` : '';
    const description = this.model.get('display') && this.model.get('display').description ? this.model.get('display').description : '';
    const GetCapabilities = `<p><p><strong>GetCapabilities:</strong></p><a href=${capabilitiesLink}>${capabilitiesLink}</a></p>`
    this.template = `${GetCapabilities}${description}`;

    return {
      singleChoice: this.singleChoice,
      fullDisplay: this.fullDisplay,
      options: this.model.get('display.options'),
      template: this.template,
      infoPopup: this.model.get('display').infoPopup,
    };
  },

  onAttach() {
    this.$popoverButton = this.$('.layer-adjust-opacity');
    this.$popoverButton.popover({
      container: 'body',
      content: 'x',
      trigger: 'manual',
    });

    $('.display-name').popover({
      placement: 'top',
      trigger: 'manual'
      })
  },
  onLayerAdjustOpacityClick() {
    if (!this.isPopoverShown) {
      this.$popoverButton.popover('show');
    }
  },

  onLayerDownloadFullResolutionClick() {
    this.model.trigger('download-full-resolution', this.model);
  },

  onPopoverInserted() {
    this.isPopoverShown = true;
    const popoverId = this.$('.layer-adjust-opacity').attr('aria-describedby');
    if (popoverId){
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
    }
  },

  onPopoverHidden() {
    this.isPopoverShown = false;
    if (typeof this.$slider !== 'undefined') {
      this.$slider.off('slide');
      this.$slider.off('change');
      this.$slider.slider('destroy');
    }
  },

  onLayerVisibleChange() {
    this.model.set('display.visible', this.$('.layer-visible').is(':checked'));
  },

  onShowOptionsClick() {
    this.model.trigger('show-options', this.model);
  },

  onModelChange(model) {
    // TODO: other fields required too?
    this.$('.layer-visible').prop('checked', model.get('display.visible'));
  },

  hidePopover() {
    this.$popoverButton.popover('hide');
  },
  onPopoverClick (e){

    $('.popover-title').find('button').remove();
    $("[data-toggle='popover']").popover('toggle');
    $("[data-toggle='popover']").not(e.target).popover("hide");
    $('.popover-title').append('<button id="popovercloseid" type="button" class="close">&times;</button>');

  },
  close() {
    $("[data-toggle='popover']").popover("hide");
  },

});

export default LayerListItemView;
