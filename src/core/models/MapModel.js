import Backbone from "backbone";

/**
 * @memberof core/models
 */

class MapModel extends Backbone.Model {
  validate(attrs, options) {
    if ([null, "map", "columbus", "globe"].indexOf(attrs.displayMode) !== -1) {
      return "invalid display mode";
    }
  }
}

MapModel.prototype.defaults = {
  // the current center and zoom of the map view
  center: [0, 0],
  zoom: 2,

  tool: null,

  // properties to indicate that the map is currently panned or zoomed by the user
  isZooming: false,
  isPanning: false,

  // for 3D viewers
  heading: 0,
  pitch: 0,
  roll: 0,

  displayMode: null, // one of "map", "columbus", "globe"
}

export default MapModel;
