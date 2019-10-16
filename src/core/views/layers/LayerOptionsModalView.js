import 'jquery';
import 'bootstrap-slider';
import 'bootstrap-slider/dist/css/bootstrap-slider.css';
import _ from 'underscore';
import './LayerOptionsModalView.css';

import ModalView from '../ModalView';
import template from './LayerOptionsModalView.hbs';

// eslint-disable-next-line max-len
const LayerOptionsModalView = ModalView.extend(/** @lends core/views/layers.LayerOptionsModalView# */{
  template,
  events: {
    'input #layer-options-opacity': 'onOpacitySlide',
    'change .layer-option': 'onLayerOptionChange',
    'change .visualization-selector': 'onVisualizationChange'
  },

  templateHelpers() {
    return {
      options: this.getDisplayOptions(),
      legendUrl: this.display ? this.display.legendUrl : null,
    };
  },

  initialize(options) {
    ModalView.prototype.initialize.call(this, options);
    // determine if details display or simple display is being configured
    this.useDetailsDisplay = options.useDetailsDisplay && !!this.model.get('detailsDisplay');
    this.display = this.useDetailsDisplay ? this.model.get('detailsDisplay') : this.model.get('display');
  },

  getDisplayOptions() {
    if (typeof this.display.options !== 'undefined') {
      // if opened for the first time, choose the first option
      if (_.filter(this.display.options, option => option.isChosen === true).length === 0) {
        this.display.options[0].isChosen = true;
      }
      // to set internal numeric id of elements
      let counter = 0;
      const options = this.display.options
        .map((option) => {
          let values = option.values;
          let low;
          let high;
          let targetLow;
          let targetHigh;
          const target = option.target;
          let bands;
          const id = counter;
          if (values) {
            // get currently set values
            const tar = this.model.get(target);
            if (typeof tar !== 'undefined') {
              bands = tar.split(',');
            }
            if (option.selectThree === true) {
              // select used items
              values = values.map(value => Object.assign({}, value, {
                isCurrentB1: bands ? bands[0] === value.value : null,
                isCurrentB2: bands ? bands[1] === value.value : null,
                isCurrentB3: bands ? bands[2] === value.value : null,
                // set value as label if label not set
                label: typeof (value.label) !== 'undefined' ? value.label : value.value,
              }));
            } else {
              // select used item
              values = values.map(value =>
                Object.assign({}, value, {
                  isCurrent: tar === value.value,
                  label: typeof (value.label) !== 'undefined' ? value.label : value.value,
                })
              );
            }
          }
          if (typeof option.min !== 'undefined') {
            [targetLow, targetHigh] = Array.isArray(target) ? target : target.split(',');
            low = this.model.get(targetLow);
            high = this.model.get(targetHigh);
          }
          counter += 1;
          return Object.assign({}, option, { values, low, high, targetLow, targetHigh, id });
        });
      return options;
    }
    return {};
  },

  onRender() {
    let opacity = this.display.opacity;
    opacity = typeof opacity === 'undefined' ? 1 : opacity;
    this.$slider = this.$('.opacity-slider').slider({
      min: 0,
      max: 100,
      value: opacity * 100,
      formatter(value) {
        return `${value}%`;
      }
    });

    this.$slider.on('slide', (event) => {
      this.model.set(`${this.useDetailsDisplay ? 'detailsDisplay' : 'display'}.opacity`, event.value / 100);
    });
    this.$slider.on('change', () => {
      this.model.set(`${this.useDetailsDisplay ? 'detailsDisplay' : 'display'}.opacity`, parseInt(this.$slider.val(), 10) / 100);
    });

    const $dataSliders = this.$('input[data-slider-min]');
    if ($dataSliders.length) {
      $dataSliders.slider()
        .on('slideStop', (event) => {
          const $target = $(event.target);
          this.model.set({
            [$target.data('targetLow')]: event.value[0],
            [$target.data('targetHigh')]: event.value[1],
          });
        });
    }
    this.applySettings();
  },

  onOpacitySlide() {
    const display = Object.assign({}, this.model.get('display'));
    display.opacity = this.$('.opacity-slider').val();
    this.model.set('display', display);
  },

  onLayerOptionChange(event) {
    // set the corresponding visualization to be used and apply changes
    const $target = this.$(event.target);
    const $input = $target.parent().parent().find('.visualization-selector');
    // to trigger onchange event if necessary
    $input.click();
    this.applySettings();
  },

  replaceLayerParameters(option) {
    // perform replacing of parameters in underyling model if it was configured
    const replaceList = option.replace;
    _.each(replaceList, (config) => {
      if (typeof config.target !== 'undefined' && typeof config.value !== 'undefined' && this.model.get(config.target) !== config.value) {
        this.model.set(config.target, config.value);
      }
    });
  },

  onVisualizationChange(event) {
    // find checked input and reset option.isChosen based on id of that input
    _.each(this.display.options, (option) => { option.isChosen = false; });
    // get #id
    const id = event.target.id;
    // get the number at the end - index
    const idNum = id.substring(id.lastIndexOf('_') + 1, id.length);
    // set isChosen on underlying option object
    this.display.options[idNum].isChosen = true;
    this.applySettings();
  },

  applySettings() {
    // set values from currently chosen form/s in layerModel
    _.each(this.display.options, (option, index) => {
      // get corresponding form/s
      const $forms = this.$(`#visualization-selector_${index}`).parent().parent().find('.layer-option');
      const values = [];
      $forms.each((i, el) => {
        values.push(el.value);
      });
      if (option.isChosen === true) {
        // set option
        this.model.set(`${$forms.attr('name')}`, values.join(','));
        // if replace was configured for this option, apply it
        this.replaceLayerParameters(option);
      } else {
        // reset option
        this.model.set(`${$forms.attr('name')}`, '');
      }
    });
  }
});

export default LayerOptionsModalView;
