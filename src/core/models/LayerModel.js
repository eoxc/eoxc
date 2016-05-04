import Backbone from "backbone";

/**
 * @memberof core/models
 */
class LayerModel extends Backbone.Model {
  initialize() {

  }

  validate(attrs, options) {
    /*if (!attrs.id) {
      return "missing mandatory identifier";
    }
    else if (!attrs.displayName) {
      return "missing mandatory display name";
    }
    else if (url === null && urls.length === 0) {
      return "missing mandatory url or urls";
    }*/
  }

  /**
   * Get a compiled hash of view parameters.
   */

  getViewParams() {

  }

  /**
   * Get a compiled hash of search parameters.
   */

  getSearchParams() {

  }

  /**
   * Get a compiled hash of download parameters.
   */

  getDownloadParams() {

  }
};

LayerModel.prototype.defaults = {
  id: null,
  displayName: null,
  visible: false,
  view: {
    protocol: null,
    url: null,
    urls: [],
    id: null,
    opacity: 0,
    style: 'default',
    attribution: null
  },
  search: {
    protocol: null,
    url: null,
    id: null
  },
  download: {
    protocol: null,
    id: null
  }
}

export default LayerModel
