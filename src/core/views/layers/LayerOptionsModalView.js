import ModalView from '../ModalView';
import template from './LayerOptionsModalView.hbs';
import LayerOptionsCoreView from './LayerOptionsCoreView';

const LayerOptionsModalView = ModalView.extend({
  template,

  initialize(options) {
    ModalView.prototype.initialize.call(this, options);
  },

  onRender() {
    this.showChildView('content', new LayerOptionsCoreView({
      useDetailsDisplay: this.useDetailsDisplay,
      model: this.model,
    }));
  },
});

export default LayerOptionsModalView;
