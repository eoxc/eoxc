import Marionette from 'backbone.marionette';
const template = require('./LayerControlLayoutView.hbs');
import LayerListView from './LayerListView';


const LayerControlLayoutView = Marionette.LayoutView.extend(/** @lends core/views/layers.LayerControlLayoutView# */{
  template,
  regions: {
    baseLayers: '.baseLayers',
    layers: '.layers',
    overlayLayers: '.overlayLayers',
  },
  className: 'layer-control',

  /**
    @constructs
    @param {Object} options
    @param {core/models.LayersCollection} options.layersCollection The background layers
    @param {core/models.LayersCollection} options.baseLayersCollection The content layers
    @param {core/models.LayersCollection} options.overlayLayersCollection The overlay layers
   */
  initialize(options) {
    this.baseLayersCollection = options.baseLayersCollection;
    this.layersCollection = options.layersCollection;
    this.overlayLayersCollection = options.overlayLayersCollection;
  },

  onShow() {
    this.showChildView('baseLayers', new LayerListView({
      collection: this.baseLayersCollection,
      singleChoice: true,
    }));
    this.showChildView('layers', new LayerListView({
      collection: this.layersCollection,
      fullDisplay: true,
      sortable: true,
    }));
    this.showChildView('overlayLayers', new LayerListView({
      collection: this.overlayLayersCollection,
    }));
  },
});


export default LayerControlLayoutView;
