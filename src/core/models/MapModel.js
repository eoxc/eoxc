import Backbone from 'backbone';

/**
 * This model is used to store the relevant values for map views (2D or 3D), such as camera options
 *
 * @memberof core/models
 *
 * @param {Object} attributes The attributes of the model instance
 * @param {Number[]} [attributes.center] The center of the view
 * @param {Number} [attributes.zoom] The zoomlevel of the view
 * @param {string} [attributes.tool] The currently selected tool
 * @param {bool} [attributes.isZooming] Indicator whether the map is currently zooming
 * @param {bool} [attributes.isPanning] Indicator whether the map is currently panning
 * @param {Number} [attributes.heading] The heading
 * @param {Number} [attributes.pitch] The pitch
 * @param {Number} [attributes.roll] The roll
 * @param {string?} [attributes.displayMode] The display mode of the map. One of 'map',
                                             'columbus' and 'globe'
 */

class MapModel extends Backbone.Model {
  validate(attrs) {
    if ([null, 'map', 'columbus', 'globe'].indexOf(attrs.displayMode) !== -1) {
      return 'invalid display mode';
    }
    return null;
  }
}

MapModel.prototype.defaults = {
  // the current center and zoom of the map view
  center: [0, 0],
  bbox: [0, 0, 1, 1],
  zoom: 2,

  tool: null,

  // properties to indicate that the map is currently panned or zoomed by the user
  isZooming: false,
  isPanning: false,

  // for 3D viewers
  heading: 0,
  pitch: 0,
  roll: 0,

  displayMode: null, // one of 'map', 'columbus', 'globe'
};

export default MapModel;
