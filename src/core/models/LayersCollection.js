import LayerModel from "./LayerModel";
import Backbone from "backbone";

/**
 * @memberof core/models
 */

class LayersCollection extends Backbone.Collection {
  getLayerById(id) {
    return this.find(layer => ( layer.get("identifier") === id ))
  }
}

LayersCollection.prototype.model = LayerModel;


export default LayersCollection;
