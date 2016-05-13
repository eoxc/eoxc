import LayerModel from './LayerModel';
import Backbone from 'backbone';

/**
 * @memberof core/models
 * @class
 */

const LayersCollection = Backbone.Collection.extend(/** @lends LayersCollection */{
  model: LayerModel,
  comparator: 'ordinal',

  initialize(models, options) {
    if (options && options.exclusiveVisibility) {
      this.listenTo(this, 'change:display', this.onDisplayChange);
    }
  },

  /**
   * Add a single model or an array of models to the collection. Automtically
   * sets the 'ordinal' property for sorting.
   */
  add(layerDefinition, options) {
    if (Array.isArray(layerDefinition)) {
      for (let i = 0; i < layerDefinition.length; ++i) {
        layerDefinition[i].ordinal = this.size() + i;
      }
    } else {
      layerDefinition.ordinal = this.size();
    }
    return Backbone.Collection.prototype.add.call(this, layerDefinition, options);
  },

  onDisplayChange(layerModel) {
    // if this is an exclusive visibility collection, change the other layers
    // display.visible to false, when one layer was set to visible
    if (layerModel.get('display.visible')) {
      this.each((otherLayerModel) => {
        if (layerModel !== otherLayerModel) {
          otherLayerModel.set('display.visible', false);
        }
      });
    }
  },
});

export default LayersCollection;
