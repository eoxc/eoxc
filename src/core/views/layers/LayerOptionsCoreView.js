import 'bootstrap-slider';
import 'bootstrap-slider/dist/css/bootstrap-slider.css';
import $ from 'jquery';
import Marionette from 'backbone.marionette';
import _ from 'underscore';
import './LayerOptionsCoreView.css';

import template from './LayerOptionsCoreView.hbs';

// eslint-disable-next-line max-len
const LayerOptionsCoreView = Marionette.ItemView.extend({
  template,
  events: {
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
    this.useDetailsDisplay = options.useDetailsDisplay && !!this.model.get('detailsDisplay');
    this.displayOption = this.useDetailsDisplay ? 'detailsDisplay' : 'display';
    this.model = options.model;
    this.displayOptions = this.model.get(`${this.displayOption}.options`);
  },

  getDisplayOptions() {
    if (this.displayOptions) {
      // if opened for the first time, choose the first option
      if (_.filter(this.displayOptions, option => option.isChosen === true).length === 0) {
        this.model.set(`${this.displayOption}.options[0].isChosen`, true);
      }
      // if opened for the first time, preset b1, b2, b3 as indices[0, 1, 2]
      _.each(this.displayOptions, (option, i) => {
        if (option.values) {
          const result = _.every(['isCurrentB1', 'isCurrentB2', 'isCurrentB3'], isCurrent => _.filter(option.values, val => val[isCurrent] === true).length === 0);
          if (result && option.selectThree) {
            this.model.set(`${this.displayOption}.options[${i}].values[0].isCurrentB1`, true);
            this.model.set(`${this.displayOption}.options[${i}].values[1].isCurrentB2`, true);
            this.model.set(`${this.displayOption}.options[${i}].values[2].isCurrentB3`, true);
          } else if (result) {
            this.model.set(`${this.displayOption}.options[${i}].values[0].isCurrentB1`, true);
          }
          _.each(option.values, (value, j) => {
            const label = typeof (value.label) !== 'undefined' ? value.label : value.value;
            this.model.set(`${this.displayOption}.options[${i}].values[${j}].label`, label);
          });
        }
      });
      // to set internal numeric id of elements
      let counter = -1;
      const options = this.model.get(`${this.displayOption}.options`)
        .map((option) => {
          let low;
          let high;
          let targetLow;
          let targetHigh;
          const target = option.target;
          counter += 1;
          if (typeof option.min !== 'undefined') {
            [targetLow, targetHigh] = Array.isArray(target) ? target : target.split(',');
            low = this.model.get(targetLow);
            high = this.model.get(targetHigh);
          }
          return Object.assign({}, option, { counter, low, high, targetLow, targetHigh });
        });
      return options;
    }
    return {};
  },

  onRender() {
    let opacity = this.displayOptions.opacity;
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
      this.model.set(`${this.displayOption}.opacity`, event.value / 100);
    });
    this.$slider.on('change', () => {
      this.model.set(`${this.displayOption}.opacity`, parseInt(this.$slider.val(), 10) / 100);
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

  onLayerOptionChange(event) {
    // set the corresponding visualization to be used and apply changes
    const $target = this.$(event.target);
    const $input = $target.parent().parent().find('.visualization-selector');
    // to trigger onchange event on input if necessary
    $input.click();
    this.applySettings();
  },

  replaceLayerParameters(option) {
    // perform replacing of parameters in underyling model if it was configured
    const replaceList = option.replace;
    _.each(replaceList, (config) => {
      if (typeof config.target !== 'undefined' && typeof config.value !== 'undefined') {
        this.model.set(config.target, config.value);
      }
    });
  },

  onVisualizationChange(event) {
    // find checked input and reset option.isChosen based on id of that input
    _.each(this.model.get(`${this.displayOption}.options`), (option, i) => {
      this.model.set(`${this.displayOption}.options[${i}].isChosen`, false);
    });
    const id = event.target.id;
    // get the number at the end of #id - index
    const idNum = id.substring(id.lastIndexOf('_') + 1, id.length);

    this.model.set(`${this.displayOption}.options[${idNum}].isChosen`, true);
    this.applySettings();
  },

  applySettings() {
    // set values from currently chosen form/s in layerModel
    _.each(this.model.get(`${this.displayOption}.options`), (option, index) => {
      // get corresponding form/s
      const $forms = this.$(`#visualization-selector_${index}`).parent().parent().find('.layer-option');
      const values = [];
      const selectedIndices = [];
      $forms.each((i, el) => {
        values.push(el.value);
        selectedIndices.push(el.selectedIndex);
      });

      // reset isSelected in model and update it with what is selected in ui
      _.each(option.values, (value, j) => {
        this.model.set(`${this.displayOption}.options[${index}].values[${j}].isCurrentB1`, false);
        this.model.set(`${this.displayOption}.options[${index}].values[${j}].isCurrentB2`, false);
        this.model.set(`${this.displayOption}.options[${index}].values[${j}].isCurrentB3`, false);
      });

      if (option.selectThree) {
        this.model.set(`${this.displayOption}.options[${index}].values[${selectedIndices[0]}].isCurrentB1`, true);
        this.model.set(`${this.displayOption}.options[${index}].values[${selectedIndices[1]}].isCurrentB2`, true);
        this.model.set(`${this.displayOption}.options[${index}].values[${selectedIndices[2]}].isCurrentB3`, true);
      } else {
        this.model.set(`${this.displayOption}.options[${index}].values[${selectedIndices[0]}].isCurrentB1`, true);
      }

      if (option.isChosen === true) {
        // set options to model and trigger a reload of layer in map
        this.model.set(`${$forms.attr('name')}`, values.join(','));
      } else {
        // reset option
        this.model.set(`${$forms.attr('name')}`, '');
      }
    });
    _.each(this.model.get(`${this.displayOption}.options`), (option) => {
      if (option.isChosen === true) {
        // if replace was configured for this option, apply it
        this.replaceLayerParameters(option);
      }
    });
  },
});

export default LayerOptionsCoreView;
