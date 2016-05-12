import Marionette from 'backbone.marionette';

// import LayerModel from '../../../src/core/models/LayerModel';
import LayersCollection from '../../../src/core/models/LayersCollection';
import MapModel from '../../../src/core/models/MapModel';
import FiltersModel from '../../../src/core/models/FiltersModel';

import LayerControlLayoutView from '../../../src/core/views/layers/LayerControlLayoutView';

import OpenLayersMapView from '../../../src/contrib/OpenLayers/OpenLayersMapView';
import TimeSliderView from '../../../src/core/views/TimeSliderView';
import WindowView from '../../../src/core/views/WindowView';

import $ from 'jquery';


// require styles
require('bootstrap/dist/css/bootstrap.min.css');

const config = require('./config.json');


const RootLayout = Marionette.LayoutView.extend({
  template: () => `

    <div id='map' style='width: 100%; height:100%; margin: 0; padding:0;'></div>
    <div id='timeSlider' style='position: absolute; width: 90%; left: 5%; bottom: 30px'></div>
    <div id='layers'></div>
    <div id='tools'></div>
  `,
  regions: {
    layers: '#layers',
    tools: '#tools',
    map: '#map',
    timeSlider: '#timeSlider',
  },
});

const ToolView = Marionette.LayoutView.extend({
  template: () => `
    <div class="btn-group-vertical" role="group" aria-label="...">
      <button class="bbox btn btn-default">BBox</button>
      <button class="download btn btn-default">Download</button>
    </div>
  `,
  events: {
    'click .bbox': 'onBBoxClick',

  },
  initialize(options) {
    this.mapModel = options.mapModel;
  },
  onBBoxClick() {
    this.mapModel.set('tool', 'bbox');
  },
});


const app = new Marionette.Application();

app.on('start', () => {
  // set up config
  const baseLayersCollection = new LayersCollection(config.baseLayers);
  const layersCollection = new LayersCollection(config.layers);
  const overlayLayersCollection = new LayersCollection(config.overlayLayers);

  const mapModel = new MapModel();
  const filtersModel = new FiltersModel({
    time: [new Date('2009-07-01T00:00:00Z'), new Date('2009-09-20T00:00:00Z')],
  });

  // set up layout

  const layout = new RootLayout({ el: $('#app') });
  layout.render();

  // set up views

  const layerControlLayoutView = new WindowView({
    name: 'Layers',
    icon: 'fa-globe',
    width: '23.8em',
    top: '8em',
    left: '3em',
    view: new LayerControlLayoutView({
      baseLayersCollection,
      layersCollection,
      overlayLayersCollection,
    }),
  });

  const toolView = new WindowView({
    name: 'Tools',
    icon: 'fa-wrench',
    width: 'auto',
    top: '30em',
    left: '3em',
    view: new ToolView({
      mapModel,
    }),
  });

  const mapView = new OpenLayersMapView({
    baseLayersCollection,
    layersCollection,
    overlayLayersCollection,
    mapModel,
    filtersModel,
  });

  const timeSliderView = new TimeSliderView({
    layersCollection,
    filtersModel,
    mapModel,
    domain: {
      start: new Date('2009-07-01T00:00:00Z'),
      end: new Date('2011-06-10T00:00:00Z'),
    },
  });

  // render the views to the regions

  layout.showChildView('layers', layerControlLayoutView);
  layout.showChildView('tools', toolView);
  layout.showChildView('map', mapView);
  layout.showChildView('timeSlider', timeSliderView);
});


$(() => { app.start(); });
