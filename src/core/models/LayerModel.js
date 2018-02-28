import Backbone from 'backbone';
import 'backbone-nested';


const LayerModel = Backbone.NestedModel.extend(/** @lends core/models.LayerModel# */{
  defaults: {
    id: null,
    displayName: null,
    displayColor: 'red',
    display: {
      visible: false,
      protocol: null,
      url: null,
      urls: [],
      id: null,
      opacity: 1.0,
      style: 'default',
      attribution: null,
    },
    search: {
      protocol: null,
      url: null,
      id: null,
      format: null,
      method: 'GET',
      histogramThreshold: undefined,
      histogramBinCount: undefined,
    },
    download: {
      protocol: null,
      id: null,
    },
    fullResolution: {
      protocol: null,
      maxSizeWarning: 500,
      maxSizeResolution: 0.0000858306884765625,
    },
  },

  /**
    @constructs
    @param {Object} options
    @param {string} options.id The internal layer identifier. Must be unique among
                               all layers of one collection.
    @param {string} options.displayName The name of the layer displayed on the UI.
    @param {boolean} [options.visible=false] The default visibility of the layer
    @param {string} [options.displayColor] The color to identify the layer.

    @param {Object} options.display Display specific options.
    @param {string} options.display.protocol The display protocol to use.
    @param {string} options.display.url The URL to access the display of the layer.
    @param {string[]} options.display.urls The URLs to access the display of the layer.
    @param {string} options.display.id The layer ID for the display service.
    @param {Number} [options.display.opacity=1.0] The default opacity.
    @param {string} [options.display.style=default] The style parameter for services like WMS.
    @param {string} [options.display.attribution] The layer attribution.

    @param {Object} options.search Search specific options.
    @param {string} options.search.protocol The search protocol to use.
    @param {string} options.search.url The URL to search on.
    @param {Object} options.search.id The layer ID for the search service.

    @param {Object} options.download Download specific options
    @param {string} options.download.protocol The download protocol to use.
    @param {string} options.download.url The URL to download from.
    @param {Object} options.download.id The layer ID for the download service.
   */
  initialize() {

  },

  validate() {
    // TODO: validate attributes
    // if (!attrs.id) {
    //   return 'missing mandatory identifier';
    // }
    // else if (!attrs.displayName) {
    //   return 'missing mandatory display name';
    // }
    // else if (url === null && urls.length === 0) {
    //   return 'missing mandatory url or urls';
    // }
  },
});


export default LayerModel;
