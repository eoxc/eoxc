import $ from 'jquery';
import 'bootstrap-slider';
import 'bootstrap-slider/dist/css/bootstrap-slider.css';

import ModalView from '../ModalView';
import template from './LayerOptionsModalView.hbs';

// eslint-disable-next-line max-len
const LayerOptionsModalView = ModalView.extend(/** @lends core/views/layers.LayerOptionsModalView# */{
  template,
  events: {
    'input #layer-options-opacity': 'onOpacitySlide',
    'change .layer-option': 'onLayerOptionChange'
  },

  templateHelpers() {
    return {
      options: this.getDisplayOptions(),
    };
  },

  getDisplayOptions() {
    return this.model.get('display.options')
      .map((option) => {
        let values = option.values;
        if (values) {
          values = values.map(value =>
            Object.assign({}, value, { isCurrent: this.model.get(`display.${option.name}`) === value.value })
          );
        }
        return Object.assign({}, option, { values });
      });
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
  },

  onOpacitySlide() {
    const display = Object.assign({}, this.model.get('display'));
    display.opacity = this.$('.opacity-slider').val();
    this.model.set('display', display);
  },

  onLayerOptionChange(event) {
    const $target = $(event.target);
    this.model.set(`display.${$target.attr('name')}`, $target.val());
  },
});

export default LayerOptionsModalView;
