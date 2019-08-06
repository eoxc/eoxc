import Marionette from 'backbone.marionette';
import 'font-awesome/scss/font-awesome.scss';

import LayersCollection from '../../../src/core/models/LayersCollection';
import MapModel from '../../../src/core/models/MapModel';
import FiltersModel from '../../../src/core/models/FiltersModel';

import LayerControlLayoutView from '../../../src/core/views/layers/LayerControlLayoutView';
import LayerOptionsView from '../../../src/core/views/layers/LayerOptionsView';
import HighlightModel from '../../../src/core/models/HighlightModel';

import OpenLayersMapView from '../../../src/contrib/OpenLayers/OpenLayersMapView';
import TimeSliderView from '../../../src/core/views/TimeSliderView';
import PanelView from '../../../src/core/views/PanelView';

import RootLayoutView from './views/RootLayoutView';
import NavBarView from './views/NavBarView';
import ToolsView from './views/ToolsView';

import $ from 'jquery';

// require styles
require('bootstrap/dist/css/bootstrap.min.css');
require('bootstrap/dist/js/bootstrap.min.js');
const config = require('./config.json');


const app = new Marionette.Application();

app.on('start', () => {
  const communicator = new Marionette.Controller();
  // set up config
  const baseLayersCollection = new LayersCollection(config.baseLayers, {
    exclusiveVisibility: true,
  });
  const layersCollection = new LayersCollection(config.layers);
  const overlayLayersCollection = new LayersCollection(config.overlayLayers);

  const mapModel = new MapModel();
  const filtersModel = new FiltersModel({
    time: [
      new Date('2006-01-01T00:00:00Z'),
      new Date('2011-12-31T00:00:00Z'),
    ],
  });

  // set up layout

  const layout = new RootLayoutView({ el: $('#app') });
  layout.render();

  // set up views

  const navBarView = new NavBarView({
    communicator,
  });

  const layerControlLayoutView = new PanelView({
    title: 'Layers',
    icon: 'fa-globe',
    width: '25em',
    top: '8em',
    left: '3em',
    closed: true,
    view: new LayerControlLayoutView({
      baseLayersCollection,
      layersCollection,
      overlayLayersCollection,
    }),
  });

  communicator.on('toggle:layers', () => {
    layerControlLayoutView.toggleOpen();
  });

  const toolsView = new PanelView({
    title: 'Tools',
    icon: 'fa-wrench',
    width: '10em',
    top: '8em',
    right: '3em',
    closed: true,
    view: new ToolsView({
      mapModel,
      communicator,
    }),
  });

  communicator.on('toggle:tools', () => {
    toolsView.toggleOpen();
  });

  // hook up on the layer collections 'show' event
  layersCollection.on('show', (layerModel) => {
    const layerOptionsView = new PanelView({
      title: `${layerModel.get('displayName')} Options`,
      icon: 'fa-sliders',
      left: '45%',
      top: '8em',
      view: new LayerOptionsView({
        model: layerModel,
      }),
    });
    layout.showChildView('layerOptions', layerOptionsView);
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
      start: new Date('2006-01-01T00:00:00Z'),
      end: new Date('2011-12-31T00:00:00Z'),
    },
  });

  // render the views to the regions

  layout.showChildView('header', navBarView);
  layout.showChildView('layers', layerControlLayoutView);
  layout.showChildView('tools', toolsView);
  layout.showChildView('map', mapView);
  layout.showChildView('timeSlider', timeSliderView);
});


$(() => { app.start(); });
