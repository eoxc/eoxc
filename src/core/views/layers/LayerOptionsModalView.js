import 'bootstrap-slider';
import 'bootstrap-slider/dist/css/bootstrap-slider.css';
import './LayerOptionsModalView.css';

import ModalView from '../ModalView';
import template from './LayerOptionsModalView.hbs';

// eslint-disable-next-line max-len
const LayerOptionsModalView = ModalView.extend(/** @lends core/views/layers.LayerOptionsModalView# */{
  template,
  events: {
    'change [name="layer-visible"]': 'onLayerVisibleChange',
    'input #layer-options-opacity': 'onOpacitySlide',
    'change .layer-option': 'onLayerOptionChange'
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
          if (values) {
            values = values.map(value =>
              Object.assign({}, value, {
                isCurrent: this.model.get(target) === value.value
              })
            );
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
    this.$slider = this.$('.opacity-slider').bootstrapSlider({
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
      $dataSliders.bootstrapSlider()
        .on('slideStop', (event) => {
          const $target = $(event.target);
          this.model.set({
            [$target.data('targetLow')]: event.value[0],
            [$target.data('targetHigh')]: event.value[1],
          });
        });
    }
  },

  onLayerVisibleChange(event) {
    const $target = $(event.target);
    this.model.set(`${this.useDetailsDisplay ? 'detailsDisplay' : 'display'}.visible`, $target.is(':checked'));
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
});

export default LayerOptionsModalView;
