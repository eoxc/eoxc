import Marionette from 'backbone.marionette';

require('jquery-ui/draggable');

const template = require('./LayerControlLayoutView.hbs');
import LayerListView from './LayerListView';


const LayerControlLayoutView = Marionette.LayoutView.extend({
  template,
  regions: {
    baseLayers: '.baseLayers',
    layers: '.layers',
    overlayLayers: '.overlayLayers',
  },
  className: 'layer-control',
  events: {
    'click .close': 'onCloseClick',
  },

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

  onCloseClick() {
    // TODO: implement
    // this.close();
  },

});


export default LayerControlLayoutView;
