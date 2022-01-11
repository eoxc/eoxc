import 'bootstrap-slider';
import 'bootstrap-slider/dist/css/bootstrap-slider.css';
import Marionette from 'backbone.marionette';
import _ from 'underscore';
import './LayerOptionsCoreView.css';

import template from './LayerOptionsCoreView.hbs';
import { flatten } from '../../../download/url';

// eslint-disable-next-line max-len
const LayerOptionsCoreView = Marionette.ItemView.extend({
  template,
  events: {
    'change .layer-option.layer-option-selection': 'onLayerOptionChange',
    'change .visualization-selector': 'onVisualizationChange',
    'slideStop .layer-option-slider': 'onLayerOptionChange',
  },

  templateHelpers() {
    return {
      options: this.getDisplayOptions(),
    };
  },

  onAttach() {
    // setup range sliders
    this.$('[data-provide="slider"]').slider({
      formatter(value) {
        if (Array.isArray(value)) {
          return `${value[0]} - ${value[1]}`;
        }
        return value;
      },
    });
    this.applySettings();
  },

  initialize(options) {
    this.useDetailsDisplay = options.useDetailsDisplay && !!this.model.get('detailsDisplay');
    this.displayOption = this.useDetailsDisplay ? 'detailsDisplay' : 'display';
    this.model = options.model;
    // make config valid, overwriting it in place
    this.model.set(`${this.displayOption}.options`, this.makeConfigValid(this.model.get(`${this.displayOption}.options`)))
    this.displayOptions = this.model.get(`${this.displayOption}.options`);
  },

  makeConfigValid(displayOptions) {
    // ensure backwards compatibility when options.parameters did not exist
    _.each(displayOptions, (option) => {
      if (!Array.isArray(option.parameters)) {
        option.parameters = [{
          "values": option.values,
          "target": option.target,
        }];
      }
    });
    return displayOptions
  },

  getDisplayOptions() {
    if (this.displayOptions) {
      // if opened for the first time, choose the first option as chosen
      if (_.filter(this.displayOptions, option => option.isChosen === true).length === 0) {
        this.model.set(`${this.displayOption}.options[0].isChosen`, true);
      }
      _.each(this.displayOptions, (option, i) => {
        // if opened for the first time, preset first three entries from selection as selected as indices[0, 1, 2]
        _.each(option.parameters, (param, j) => {
          if (param.values) {
            const result = _.every(['isCurrentB1', 'isCurrentB2', 'isCurrentB3'], isCurrent => _.filter(param.values, val => val[isCurrent] === true).length === 0);
            if (result) {
              this.model.set(`${this.displayOption}.options[${i}].parameters[${j}].values[0].isCurrentB1`, true);
            }
            if (result && param.selectThree) {
              this.model.set(`${this.displayOption}.options[${i}].parameters[${j}].values[1].isCurrentB2`, true);
              this.model.set(`${this.displayOption}.options[${i}].parameters[${j}].values[2].isCurrentB3`, true);
            }
            _.each(param.values, (value, k) => {
              const label = typeof (value.label) !== 'undefined' ? value.label : value.value;
              this.model.set(`${this.displayOption}.options[${i}].parameters[${j}].values[${k}].label`, label);
            });
          }
        })
      });
      // to set internal numeric id of inputs
      let counter = -1;
      const options = this.model.get(`${this.displayOption}.options`)
        .map((option) => {
          counter += 1; // for radio input
          let counterMultiple = -1; // for selections
          const parameters = option.parameters.map((param) => {
            counterMultiple += 1;
            // create config for range input element
            const step = typeof param.step !== 'undefined' ? param.step : 1;
            const valuesFromTarget = this.model.get(param.target);
            let low, high, sliderValue, value;
            const rangeInputsConfig = [];
            const countRangeInputs = param.min ? (param.selectThree ? 3 : 1) : 0;
            for (let i=0; i < countRangeInputs; i++) {
              let defaultValue = null;
              if (typeof valuesFromTarget === 'undefined' || valuesFromTarget === '') {
                // data for slider come from config
                // default expected to be an array of values (min, max)
                defaultValue = param.default;
              } else {
                // data for slider come from model 
                // split config at comma and "rangeSeparator"
                defaultValue = valuesFromTarget.split(',').reduce( (newArr, el, i) => {
                  let subArr = el.split(param.rangeSeparator);
                  newArr[i] = subArr;
                  return newArr;
                }, []);
                defaultValue = flatten(defaultValue);
              }
              if (!defaultValue) {
                low = param.min;
                high = param.max;
              } else if (!Array.isArray(defaultValue)) {
                low = defaultValue;
                high = defaultValue;
              } else if (defaultValue.length == 2) {
                low = defaultValue[0];
                high = defaultValue[1];
              } else if (defaultValue.length == 3 || defaultValue.length == 1) {
                low = defaultValue[i];
                high = defaultValue[i];
              } else if (defaultValue.length == 6) {
                low = defaultValue[i * 2];
                high = defaultValue[1 + i * 2];
              }
              // configure the value ranges
              sliderValue = param.range ? `[${low},${high}]` : low; // for the component
              value = param.range ? `${low}${param.rangeSeparator || ','}${high}` : low; // saved into model

              rangeInputsConfig.push({
                min: param.min,
                max: param.max,
                range: param.range,
                selectThree: param.selectThree,
                target: param.target,
                step,
                sliderValue,
                value,
              });
            }
            return Object.assign({}, param, { counterMultiple, rangeInputsConfig });
            });
          return Object.assign({}, option, { parameters, counter});
        });
      return options;
    }
    return {};
  },

  onRender() {
    // configure default opacity slider
    let opacity = this.model.get(this.displayOption).opacity;
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
      if (typeof config.target === 'string' && typeof config.value !== 'undefined') {
        if (config.value.template) {
          // interpolate template
          const evaluated = _.template(config.value.template, {
            interpolate: /\{\{(.+?)\}\}/g
          })(this.model.toJSON());
          this.model.set(config.target, evaluated);
        } else {
          this.model.set(config.target, config.value);
        }
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
    const options = this.model.get(`${this.displayOption}.options`);
    // first reset the unselected options to clear the parameters
    _.each(options, (option) => {
      _.each(option.parameters, (param) => {
        if (option.isChosen !== true) {
          this.model.set(param.target, '');
        }
      });
    });

    // to set the parameter values for the chosen option
    _.each(options, (option, i) => {
      _.each(option.parameters, (param, j) => {
        const $forms = this.$(`#visualization-selector_${i}`).parent().parent().find(`[data-counter='${j}']`);
        const values = [];
        const selectedIndices = [];
        _.each($forms, (form) => {
          // either get value from range input or from select input
          let value = form.value;
          const separatorToReplace = param.rangeSeparator;
          if (separatorToReplace) {
            value = value.replace(",", separatorToReplace)
          }
          values.push(value);
          if (typeof param.min === 'undefined') {
            selectedIndices.push(form.selectedIndex);
          }
        });
  
        // reset isSelected in model and update it with what is selected in ui
        _.each(param.values, (_, l) => {
          this.model.set(`${this.displayOption}.options[${i}].parameters[${j}].values[${l}].isCurrentB1`, false);
          this.model.set(`${this.displayOption}.options[${i}].parameters[${j}].values[${l}].isCurrentB2`, false);
          this.model.set(`${this.displayOption}.options[${i}].parameters[${j}].values[${l}].isCurrentB3`, false);
        });
  
        if (typeof param.min === 'undefined') {
          this.model.set(`${this.displayOption}.options[${i}].parameters[${j}].values[${selectedIndices[0]}].isCurrentB1`, true);
        }
        if (param.selectThree && typeof param.min === 'undefined') {
          this.model.set(`${this.displayOption}.options[${i}].parameters[${j}].values[${selectedIndices[1]}].isCurrentB2`, true);
          this.model.set(`${this.displayOption}.options[${i}].parameters[${j}].values[${selectedIndices[2]}].isCurrentB3`, true);
        }
  
        if (option.isChosen === true) {
          // set options to model and trigger a reload of layer in map
          this.model.set(param.target, values.join(','));
        } 
      })
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
