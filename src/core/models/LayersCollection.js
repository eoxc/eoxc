import LayerModel from './LayerModel';
import Backbone from 'backbone';

/**
 * @memberof core/models
 */

const LayersCollection = Backbone.Collection.extend({
  model: LayerModel,
  comparator: 'ordinal',

  /**
   * Add a single model or an array of models to the collection. Automtically
   * sets the 'ordinal' property for sorting.
   */
  add(layerDefinition, options) {
    if (Array.isArray(layerDefinition)) {
      for (let i = 0; i < layerDefinition.length; ++i) {
        layerDefinition[i].ordinal = this.size() + i;
      }
    }
    else {
      layerDefinition.ordinal = this.size();
    }
    return Backbone.Collection.prototype.add.call(this, layerDefinition, options);
  },
});

export default LayersCollection;
