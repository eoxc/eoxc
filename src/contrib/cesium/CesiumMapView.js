import Marionette from 'backbone.marionette';
import Backbone from 'backbone';

import $ from 'jquery';
import _ from 'underscore';


import Group from 'ol/layer/Group';


import { Wkt } from 'wicket';


import { createMap, updateLayerParams, createRasterLayer, createVectorLayer, sortLayers, createCutOut, wrapToBounds, featureCoordsToBounds } from '../OpenLayers/utils';

import ExportWMSLayerListView from '../OpenLayers/ExportWMSLayerListView';
import ProgressBar from '../OpenLayers/progressbar';
import './ol-source.css';
import './ol.css';
import template from './OpenLayersMapView.hbs';


const wkt = new Wkt();

class GroupById extends Group {
  constructor(options = {}) {
    const layers = options.layers || [];
    super(options);
    this.byId = {};
    for (let i = 0; i < layers.length; ++i) {
      const layer = layers[i];
      this.byId[layer.id] = layer;
    }
  }

  getLayerById(id) {
    return this.byId[id];
  }
}


/**
 * @memberof contrib/cesium
 */

class CesiumMapView extends Marionette.ItemView {
  /**
   * Initialize an OpenLayersMapView
   * @param {Object} options - Options to initialize the view with.
   * @param {core/models.FiltersModel} options.filters - the filters model
   */

  initialize(options) {
    this.baseLayersCollection = options.baseLayersCollection;
    this.layersCollection = options.layersCollection;
    this.overlayLayersCollection = options.overlayLayersCollection;

    this.searchCollection = options.searchCollection;
    this.threeD = options.threeD
    this.mapModel = options.mapModel;
    this.filtersModel = options.filtersModel;
    this.highlightModel = options.highlightModel;

    this.highlightFillColor = options.highlightFillColor;
    this.highlightStrokeColor = options.highlightStrokeColor;
    this.highlightStrokeWidth = options.highlightStrokeWidth;
    this.filterFillColor = options.filterFillColor;
    this.filterStrokeColor = options.filterStrokeColor;
    this.filterOutsideColor = options.filterOutsideColor;
    this.footprintFillColor = options.footprintFillColor;
    this.footprintStrokeColor = options.footprintStrokeColor;
    this.selectedFootprintFillColor = options.selectedFootprintFillColor;
    this.selectedFootprintStrokeColor = options.selectedFootprintStrokeColor;

    this.staticHighlight = options.staticHighlight;
    this.useDetailsDisplay = options.useDetailsDisplay;

    this.map = undefined;

    this.isPanning = false;
    this.isZooming = false;

    this.onFeatureClicked = options.onFeatureClicked;
    this.constrainOutCoords = options.constrainOutCoords;
    this.singleLayerModeUsed = options.singleLayerModeUsed;
    this.areaFilterLayerExtent = options.areaFilterLayerExtent;

    this.template = template;
  }

  onRender() {
    this.progressBar = new ProgressBar();
    this.createMap();
    return this;
  }

  onAttach() {
    if (this.map) {
      this.map.setTarget(this.el);
      this.progressBar.setElement(this.$('.progress-bar')[0]);

      const WMScollections = new Backbone.Collection(this.layersCollection.filter((layer) => {
        const display = this.useDetailsDisplay && layer.get('detailsDisplay')
          ? layer.get('detailsDisplay')
          : layer.get('display');
        const isValidDisplay = typeof display.urls !== 'undefined' ? display.urls[0] !== '' : display.url !== '';
        return display.protocol === 'WMS' && isValidDisplay;
      }));
      if (WMScollections.length > 0) {
        new ExportWMSLayerListView(
          {
            el: this.$('.export-tools')[0],
            collection: WMScollections,
            useDetailsDisplay: this.useDetailsDisplay,
            mapModel: this.mapModel,
            usedView: this
          }
        ).render();
      }

      $(window).resize(() => this.onResize());
    }
  }

  /**
   * Convenience function to setup the map.
   */

  createMap(options = {}) {
    // assure that we only set up everything once

    if (this.map) {
      return this;
    }

    // TODO: move this to layout containing this view
    this.$el.css({
      width: '100%',
      height: '100%',
    });

    // for internal conversions

    // create the map object
    this.map = new Cesium.Viewer(this.el, {
      terrainProvider: terrain
    });
    // Your access token can be found at: https://cesium.com/ion/tokens.
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI2Y2NhMmFkYi1hMWU5LTQyMTQtYmFkNC1lMGM2NjJjZmIzZTEiLCJpZCI6MzM3LCJpYXQiOjE1MjUyMjI0MTF9.FqlX283huXgbY7faNlTftzG-WJhljG-m5C-uJgV8Uuk';
    const terrain = new Cesium.CesiumTerrainProvider({
        url: 'http://127.0.0.1:9000/tilesets/terrain-mesh'
    })
    // Initialize the Cesium Viewer in the HTML element with the `cesiumContainer` ID.

    var scene = this.map.scene;
    scene.globe.depthTestAgainstTerrain = true;

    this.map.extend(Cesium.viewerCesiumInspectorMixin);
    var layers = this.map.scene.imageryLayers;
    const part1_image = new Cesium.ImageryLayer(new Cesium.SingleTileImageryProvider({
    url: './part1.png',
    rectangle: Cesium.Rectangle.fromDegrees(23.0026388888888889, 0.6748611111111111, 23.4004166666666684, 0.9976388888888890)
    }));
    const part2_image = new Cesium.ImageryLayer(new Cesium.SingleTileImageryProvider({
    url: './part2.png',
    rectangle: Cesium.Rectangle.fromDegrees(23.4240277777777806, 0.0329166666666663, 23.9837500000000041, 0.4881944444444443)
    }));
    var timeInterval = new Cesium.TimeInterval({
    start : Cesium.JulianDate.fromIso8601('1980-08-01T00:00:00Z'),
    stop : Cesium.JulianDate.fromIso8601('1980-08-02T00:00:00Z'),
    isStartIncluded : true,
    isStopIncluded : false
    });

    var dem = new Cesium.WebMapTileServiceImageryProvider({
    url : '//a.dem.pass.copernicus.eu/cache/ows/wmts',
    layer : 'DEM_COP-DEM_GLO-90-DTED__EARTH',
    style : 'default',
    maximumLevel : 17,
    tileMatrixSetID : 'WGS84',
    format : 'image/png'
    });

    this.map.imageryLayers.addImageryProvider(dem);
    layers.add(part1_image);
    layers.add(part2_image);
    // Fly the camera to San Francisco at the given longitude, latitude, and height.
    this.map.camera.flyTo({
      destination : Cesium.Cartesian3.fromDegrees(23.59861, 0.5, 50000000)
    });

    // create layer groups for base, normal and overlay layers


    // create layer group to display footprints of search results

    // create layer group to display footprints of download selection


    // create layer for highlighting features

    // add the layers to the map

    // attach to signals of the collections


    return this;
  }


}

CesiumMapView.prototype.template = () => '';

CesiumMapView.prototype.events = {
  resize: 'onResize',
};

export default CesiumMapView;
