import Backbone from 'backbone';
import LayerModel from './LayerModel';

const LayersCollection = Backbone.Collection.extend(/** @lends core/models.LayersCollection# */{
  model: LayerModel,
  comparator: 'ordinal',

  /**
    @constructs
    @param {core/models.LayerModel[]|Object[]} models The models of this collection
    @param {Object} options
    @param {boolean} options.exclusiveVisibility Whether the visibility of the layers
                                                 are mutually exclusive.
   */
  initialize(models, options) {
    if (options && options.exclusiveVisibility) {
      this.listenTo(this, 'change:display', this.onDisplayChange);
    }
  },

  /**
    Add a single model or an array of models to the collection. Automtically
    sets the 'ordinal' property for sorting.

    @param {Object|Object[]} layerDefinition The layer definition(s).
   */
  add(layerDefinition, options) {
    if (Array.isArray(layerDefinition)) {
      for (let i = 0; i < layerDefinition.length; ++i) {
        // eslint-disable-next-line no-param-reassign
        layerDefinition[i].ordinal = this.size() + i;
      }
    } else {
      // eslint-disable-next-line no-param-reassign
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
