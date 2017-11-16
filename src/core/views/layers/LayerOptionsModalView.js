import $ from 'jquery';
import 'bootstrap-slider';
import 'bootstrap-slider/dist/css/bootstrap-slider.css';

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
    };
  },

  getDisplayOptions() {
    const options = this.model.get('display.options')
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
  },

  onRender() {
    let opacity = this.model.get('display.opacity');
    opacity = typeof opacity === 'undefined' ? 1 : opacity;
    this.$slider = $(this.el).find('.opacity-slider').slider({
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

    $(this.el).find('input[data-slider-min]')
      .slider()
      .on('slideStop', (event) => {
        const $target = $(event.target);
        this.model.set({
          [$target.data('targetLow')]: event.value[0],
          [$target.data('targetHigh')]: event.value[1],
        });
      });
  },

  onLayerVisibleChange(event) {
    const $target = $(event.target);
    this.model.set('display.visible', $target.is(':checked'));
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
