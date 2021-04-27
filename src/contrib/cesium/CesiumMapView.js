import Marionette from 'backbone.marionette';
import Backbone from 'backbone';

import $ from 'jquery';
import _ from 'underscore';


// import { createMap, updateLayerParams, createRasterLayer, createVectorLayer, sortLayers, createCutOut, wrapToBounds, featureCoordsToBounds } from '../OpenLayers/utils';


var BuildModuleUrl = require('cesium/Core/buildModuleUrl');
BuildModuleUrl.setBaseUrl('./');
var Viewer = require('cesium/Widgets/Viewer/Viewer');
var viewerCesiumInspectorMixin = require('cesium/Widgets/Viewer/viewerCesiumInspectorMixin');
var ImageryLayer = require('cesium/Scene/ImageryLayer');
var WebMapTileServiceImageryProvider = require('cesium/Scene/WebMapTileServiceImageryProvider');
var SingleTileImageryProvider = require('cesium/Scene/SingleTileImageryProvider')
var GeographicTilingScheme = require('cesium/Core/GeographicTilingScheme');
var TimeInterval = require('cesium/Core/TimeInterval');
var JulianDate = require('cesium/Core/JulianDate');
var Rectangle = require('cesium/Core/Rectangle');
var Credit = require('cesium/Core/Credit');
var CesiumTerrainProvider = require('cesium/Core/CesiumTerrainProvider');
var createWorldTerrain = require('cesium/Core/createWorldTerrain');
var Cartesian3 = require('cesium/Core/Cartesian3');

import "cesium/Widgets/widgets.css";

import template from './CesiumMapView.hbs';



// class GroupById extends Group {
//   constructor(options = {}) {
//     const layers = options.layers || [];
//     super(options);
//     this.byId = {};
//     for (let i = 0; i < layers.length; ++i) {
//       const layer = layers[i];
//       this.byId[layer.id] = layer;
//     }
//   }

//   getLayerById(id) {
//     return this.byId[id];
//   }
// }


/**
 * @memberof contrib/cesium
 */

class CesiumMapView extends Marionette.ItemView {
  /**
   * Initialize an CesiumMapView
   * @param {Object} options - Options to initialize the view with.
   * @param {core/models.FiltersModel} options.filters - the filters model
   */

  initialize(options) {
    this.CesiumBaseLayersCollection = options.CesiumBaseLayersCollection;
    this.baseLayersCollection = options.baseLayersCollection
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
    this.createMap();
    return this;

  }

  onAttach() {
    if (this.map) {

      // const WMScollections = new Backbone.Collection(this.layersCollection.filter((layer) => {
      //   const display = this.useDetailsDisplay && layer.get('detailsDisplay')
      //     ? layer.get('detailsDisplay')
      //     : layer.get('display');
      //   const isValidDisplay = typeof display.urls !== 'undefined' ? display.urls[0] !== '' : display.url !== '';
      //   return display.protocol === 'WMS' && isValidDisplay;
      // }));
      // if (WMScollections.length > 0) {
      //   new ExportWMSLayerListView(
      //     {
      //       el: this.$('.export-tools')[0],
      //       collection: WMScollections,
      //       useDetailsDisplay: this.useDetailsDisplay,
      //       mapModel: this.mapModel,
      //       usedView: this
      //     }
      //   ).render();
      // }

      // $(window).resize(() => this.onResize());
    }
  }

  createLayer(layer) {
    var options = {
      url : layer.display.urls[0],
      layer : layer.display.id,
      style : layer.display.style,
      format : layer.display.format,
      tileMatrixSetID : layer.display.matrixSet,
      maximumLevel: 12,
      tilingScheme: new GeographicTilingScheme({
          numberOfLevelZeroTilesX: 2, numberOfLevelZeroTilesY: 1
      }),
      // credit : new Credit(layer.attribution),
      show: layer.display.visible
  };
  var returnLayer = new WebMapTileServiceImageryProvider(options);
  return returnLayer

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
    var baseLayers = [];
    var initialLayer = null;
    config.baseLayers.forEach(baselayer => {
      var layer = this.createLayer(baselayer);
        baseLayers.push(layer);
        if (baselayer.display.visible){
            initialLayer = layer;
        }
    });
    this.CesiumBaseLayersCollection = baseLayers

    var dem = new WebMapTileServiceImageryProvider({
      url : '//c.s2maps-tiles.eu/wmts/',
      layer:'s2cloudless',
      style : 'default',
      maximumLevel : 17,
      tileMatrixSetID : 'WGS84',
      format : 'image/png',
      tilingScheme: new GeographicTilingScheme({
          numberOfLevelZeroTilesX: 2, numberOfLevelZeroTilesY: 1
      }),
      });



  //   const terrain = new CesiumTerrainProvider({
  //     url: 'http://127.0.0.1:9000/tilesets/terrain-mesh/'
  // })
    // this.map = new Viewer(this.el);
    this.map = new Viewer(this.el, {
      selectionIndicator: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      homeButton: false,
      sceneModePicker: false,
      timeline: false,
      animation: false,
      // terrainProvider: terrain,
      imageryProvider:initialLayer
    });
    var initialCesiumLayer = this.map.imageryLayers.get(0);
     //Go through all defined baselayer and add them to the map
     for (var i = 0; i < this.CesiumBaseLayersCollection.length; i++) {
      config.baseLayers.forEach(baselayer => {
          if(initialLayer._layer === baselayer.id){
              baselayer.ces_layer = initialCesiumLayer;
          }else{
              if(this.CesiumBaseLayersCollection[i]._layer === baselayer.display.id){
                  var imagerylayer = this.map.scene.imageryLayers.addImageryProvider(this.CesiumBaseLayersCollection[i]);
                  imagerylayer.show = baselayer.display.visible;
                  baselayer.ces_layer = imagerylayer;
              }
          }
      });
    }


    var scene = this.map.scene;
    scene.globe.depthTestAgainstTerrain = true;

    // this.map.extend(viewerCesiumInspectorMixin);

    // var layers = this.map.scene.imageryLayers;
    // const part1_image = new ImageryLayer(new SingleTileImageryProvider({
    // url: './cesium/part1.png',
    // rectangle: Rectangle.fromDegrees(23.0026388888888889, 0.6748611111111111, 23.4004166666666684, 0.9976388888888890)
    // }));
    // const part2_image = new ImageryLayer(new SingleTileImageryProvider({
    // url: './cesium/part2.png',
    // rectangle: Rectangle.fromDegrees(23.4240277777777806, 0.0329166666666663, 23.9837500000000041, 0.4881944444444443)
    // }));
    // var timeInterval = new TimeInterval({
    // start : JulianDate.fromIso8601('1980-08-01T00:00:00Z'),
    // stop : JulianDate.fromIso8601('1980-08-02T00:00:00Z'),
    // isStartIncluded : true,
    // isStopIncluded : false
    // });

    // var dem = new WebMapTileServiceImageryProvider({
    // url : 'https://a.dem.pass.copernicus.eu/cache/ows/wmts',
    // layer : 'DEM_COP-DEM_GLO-90-DTED__EARTH',
    // style : 'default',
    // maximumLevel : 17,
    // tileMatrixSetID : 'WGS84',
    // format : 'image/png'
    // });

    // this.map.imageryLayers.addImageryProvider(dem);
    // layers.add(part1_image);
    // layers.add(part2_image);
    // Fly the camera to San Francisco at the given longitude, latitude, and height.



    // create layer groups for base, normal and overlay layers


    // create layer group to display footprints of search results

    // create layer group to display footprints of download selection


    // create layer for highlighting features

    // add the layers to the map

    // attach to signals of the collections
    this.flyTO()
    this.setupEvents();

    return this;
  }
  setupEvents() {
    this.listenTo(this.baseLayersCollection, 'change', layerModel =>
    this.onLayerChange(config.baseLayers, layerModel)
    );
  }

  onLayerChange(baseLayers, layerModel){

    baseLayers.forEach(function(baselayer) {
      var cesLayer = baselayer.ces_layer;
      if (cesLayer) {
          if(cesLayer._imageryProvider._layer === layerModel.attributes.display.id && layerModel.attributes.display.visible){
              cesLayer.show = true;

          }
      }
    });

    baseLayers.forEach(function(baselayer) {
      var cesLayer = baselayer.ces_layer;
      if (cesLayer) {
          if(cesLayer._imageryProvider._layer !== layerModel.attributes.display.id || !layerModel.attributes.display.visible){
              cesLayer.show = false;

          }
      }
    });

  }
  flyTO() {
    return this.map.camera.flyTo({
      destination : Cartesian3.fromDegrees(23.59861, 0.5, 50000000)
    });

  }

}

CesiumMapView.prototype.template = () => '';

CesiumMapView.prototype.events = {
  resize: 'onResize',
};

export default CesiumMapView;
