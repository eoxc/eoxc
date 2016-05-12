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
    /*this.$el.draggable({
      handle: '.panel-heading',
      containment: '#main',
      scroll: false,
      start: () => {
        this.$('.ui-slider').detach();
        this.$('.fa-adjust').toggleClass('active');
        // TODO: whats that?
        // this.$('.fa-adjust').popover('hide');
      },
    });*/

    this.showChildView('layers', new LayerListView({
      collection: this.layersCollection,
    }));
    /*this.showChildView('layers', new LayerListView({
      collection: this.layersCollection,
    }));
    this.showChildView('layers', new LayerListView({
      collection: this.layersCollection,
    }));*/
  },

  onCloseClick() {
    // TODO: implement
    // this.close();
  },

});


export default LayerControlLayoutView;
