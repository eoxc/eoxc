import Marionette from 'backbone.marionette';

import LayerModel from '../../../src/core/models/LayerModel';
import LayersCollection from '../../../src/core/models/LayersCollection';
import MapModel from '../../../src/core/models/MapModel';
import FiltersModel from '../../../src/core/models/FiltersModel';

import OpenLayersMapView from '../../../src/contrib/OpenLayers/OpenLayersMapView';
import TimeSliderView from '../../../src/core/views/TimeSliderView';

import $ from "jquery";
import _ from "underscore";

require('openlayers/dist/ol.css');


var config = require('./config.json');



let RootLayout = Marionette.LayoutView.extend({
  template: () => `
    <div id="map" style="width: 100%; height:100%; margin: 0; padding:0;"></div>
    <div id="timeSlider" style="position: absolute; width: 90%; left: 5%; bottom: 30px"></div>
  `,
  regions: {
    map: "#map",
    timeSlider: "#timeSlider"
  }
});


let app = new Marionette.Application();

app.on('start', () => {
  // set up config
  let baseLayersCollection = new LayersCollection(config.baseLayers),
      layersCollection = new LayersCollection(config.layers),
      overlayLayersCollection = new LayersCollection(config.overlayLayers),

      mapModel = new MapModel(),
      filtersModel = new FiltersModel({

      });

  // set up layout

  let layout = new RootLayout({el: $("#app")});
  layout.render();

  // set up views

  let mapView = new OpenLayersMapView({
    baseLayersCollection,
    layersCollection,
    overlayLayersCollection,
    mapModel,
    filtersModel
  });

  let timeSliderView = new TimeSliderView({
    layersCollection,
    filtersModel,
    domain: {
      start: new Date("2009-07-01T00:00:00Z"),
      end: new Date("2011-06-10T00:00:00Z")
    },
    brush: {
      start: new Date("2009-07-01T00:00:00Z"),
      end: new Date("2009-09-20T00:00:00Z")
    }
  });

  // render the views to the regions

  layout.showChildView("map", mapView);
  layout.showChildView("timeSlider", timeSliderView);

});


$(() => { app.start(); });
