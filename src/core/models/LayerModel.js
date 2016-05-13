import Backbone from 'backbone';
require('backbone-nested');

/**
 * @memberof core/models
 * @class
 */
const LayerModel = Backbone.NestedModel.extend(/** @lends LayerModel */{
  defaults: {
    id: null,
    displayName: null,
    visible: false,
    displayColor: 'red',
    display: {
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
    },
    download: {
      protocol: null,
      id: null,
    },
  },

  validate(attrs) {
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
