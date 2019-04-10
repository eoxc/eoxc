import Marionette from 'backbone.marionette';
import template from './LayerControlLayoutView.hbs';
import LayerListView from './LayerListView';
import './LayerControlLayoutView.css';

// eslint-disable-next-line max-len
const LayerControlLayoutView = Marionette.LayoutView.extend(/** @lends core/views/layers.LayerControlLayoutView# */{
  template,
  templateHelpers() {
    return {
      baseLayersCollection: this.baseLayersCollection,
      layersCollection: this.layersCollection,
      overlayLayersCollection: this.overlayLayersCollection,
    };
  },
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
    if (typeof this.baseLayersCollection !== 'undefined') {
      this.showChildView('baseLayers', new LayerListView({
        collection: this.baseLayersCollection,
        singleChoice: true,
      }));
    }
    if (typeof this.layersCollection !== 'undefined') {
      this.showChildView('layers', new LayerListView({
        collection: this.layersCollection,
        fullDisplay: true,
        sortable: true,
      }));
    }
    if (typeof this.overlayLayersCollection !== 'undefined') {
      this.showChildView('overlayLayers', new LayerListView({
        collection: this.overlayLayersCollection,
      }));
    }
  },
});


export default LayerControlLayoutView;
