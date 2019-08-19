import 'jquery';
import 'bootstrap-slider';
import 'bootstrap-slider/dist/css/bootstrap-slider.css';
import './LayerOptionsModalView.css';

import ModalView from '../ModalView';
import template from './LayerOptionsModalView.hbs';

// eslint-disable-next-line max-len
const LayerOptionsModalView = ModalView.extend(/** @lends core/views/layers.LayerOptionsModalView# */{
  template,
  events: {
    'input #layer-options-opacity': 'onOpacitySlide',
    'change .layer-option': 'onLayerOptionChange',
    'change .layer-option-three': 'onSelectThreeChange'
  },

  templateHelpers() {
    return {
      options: this.getDisplayOptions(),
      legendUrl: this.getLegendUrl(),
    };
  },

  initialize(options) {
    ModalView.prototype.initialize.call(this, options);
    this.useDetailsDisplay = options.useDetailsDisplay && !!this.model.get('detailsDisplay');
  },

  useBackdrop() {
    return true;
  },

  getDisplayOptions() {
    const display = this.useDetailsDisplay ? this.model.get('detailsDisplay') : this.model.get('display');
    if (typeof display.options !== 'undefined') {
      const options = display.options
        .map((option) => {
          let values = option.values;
          let low;
          let high;
          let targetLow;
          let targetHigh;
          const target = option.target;
          let bands;
          if (values) {
            const tar = this.model.get(target);
            if (typeof tar !== 'undefined') {
              bands = tar.split(',');
            }
            if (option.selectThree) {
              values = values.map((value) => {
                return Object.assign({}, value, {
                  isCurrentB1: bands ? bands[0] === value.value : null,
                  isCurrentB2: bands ? bands[1] === value.value : null,
                  isCurrentB3: bands ? bands[2] === value.value : null,
                })
              });
            } else {
              values = values.map(value =>
                Object.assign({}, value, {
                  isCurrent: tar === value.value
                })
              );
            }
          }
          if (typeof option.min !== 'undefined') {
            [targetLow, targetHigh] = Array.isArray(target) ? target : target.split(',');
            low = this.model.get(targetLow);
            high = this.model.get(targetHigh);
          }
          return Object.assign({}, option, { values, low, high, targetLow, targetHigh });
        });
      return options;
    }
    return {};
  },

  getLegendUrl() {
    const display = this.model.get('display');
    return display.legendUrl;
  },

  onRender() {
    const display = this.useDetailsDisplay ? this.model.get('detailsDisplay') : this.model.get('display');
    let opacity = display.opacity;
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
  },

  onOpacitySlide() {
    const display = Object.assign({}, this.model.get('display'));
    display.opacity = this.$('.opacity-slider').val();
    this.model.set('display', display);
  },

  onLayerOptionChange(event) {
    const $target = $(event.target);
    this.model.set(`${$target.attr('name')}`, $target.val());
  },

  onSelectThreeChange(event) {
    const $target = $(event.target);
    const $targetGroup = $target.parent().parent().find('.layer-option-three');
    let allThreeSelected = true;
    const values = [];
    const replace = this.model.get('display').replace;
    $targetGroup.each((i, el) => {
      if (el.value === '') {
        allThreeSelected = false;
        return;
      } else {
        values.push(el.value);
      }
    });
    if (allThreeSelected) {
      const valuesString = values.join(',');
      this.model.set(`${$target.attr('name')}`, valuesString);
      if (replace && replace.target && replace.value) {
        this.model.set(replace.target, replace.value);
      }
    }
  }
});

export default LayerOptionsModalView;
