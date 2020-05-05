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
 */

class MapModel extends Backbone.Model {

  show(featureOrExtent) {
    this.trigger('show', featureOrExtent);
  }

  showTime(timeExtent) {
    this.trigger('show:time', timeExtent);
  }
}

MapModel.prototype.defaults = {
  // the current center and zoom of the map view
  center: [0, 0],
  bbox: [0, 0, 1, 1],
  area: null, // area that is used for search
  zoom: 2,
  minZoom: 0,
  maxZoom: 28,
  projection: null,
  drawnArea: null, // area that will be drawn (over crs bounds)

  // the current start/end time selection
  time: [null, null],
  extendedTime: null,
  maxMapInterval: null,
  exceedMaxMapInterval: false,

  tool: null,

  // properties to indicate that the map is currently panned or zoomed by the user
  isZooming: false,
  isPanning: false,

  // for 3D viewers
  heading: 0,
  pitch: 0,
  roll: 0,

  highlightFeature: null,
};

export default MapModel;
