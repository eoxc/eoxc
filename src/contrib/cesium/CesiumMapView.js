import Marionette from "backbone.marionette";

import _ from "underscore";
import $ from "jquery";
import turfBBox from "@turf/bbox";

import { getISODateTimeString } from "eoxc/src/core/util";

var BuildModuleUrl = require("cesium/Core/buildModuleUrl");
BuildModuleUrl.setBaseUrl("./");
var Viewer = require("cesium/Widgets/Viewer/Viewer");
var viewerCesiumInspectorMixin = require("cesium/Widgets/Viewer/viewerCesiumInspectorMixin");
var WebMapTileServiceImageryProvider = require("cesium/Scene/WebMapTileServiceImageryProvider");
var HeightReference = require("cesium/Scene/HeightReference");
var WebMapServiceImageryProvider = require("cesium/Scene/WebMapServiceImageryProvider");
var GeoJsonDataSource = require("cesium/DataSources/GeoJsonDataSource");
var GeographicTilingScheme = require("cesium/Core/GeographicTilingScheme");
var ScreenSpaceEventHandler = require("cesium/Core/ScreenSpaceEventHandler");
var ScreenSpaceEventType = require("cesium/Core/ScreenSpaceEventType");
var Cesium_defined = require("cesium/Core/defined");
var PolygonHierarchy = require("cesium/Core/PolygonHierarchy");
var PolylineOutlineMaterialProperty = require("cesium/DataSources/PolylineOutlineMaterialProperty");
var Rectangle = require("cesium/Core/Rectangle");
var Credit = require("cesium/Core/Credit");
var Color = require("cesium/Core/Color");
var EntityCollection = require("cesium/DataSources/EntityCollection");
var ColorMaterialProperty = require("cesium/DataSources/ColorMaterialProperty");
var Material = require("cesium/Scene/Material");
var CallbackProperty = require("cesium/DataSources/CallbackProperty");
var CesiumTerrainProvider = require("cesium/Core/CesiumTerrainProvider");
var Cartesian3 = require("cesium/Core/Cartesian3");
var Cartographic = require("cesium/Core/Cartographic");
var Cartesian2 = require("cesium/Core/Cartesian2");
var Cesium_Math = require("cesium/Core/Math");

import "cesium/Widgets/widgets.css";
import "./CesiumMapView.css";
import addImage from "../images/add.png";
import removeImage from "../images/remove.png";
import infoImage from "../images/info.png";

import template from "./CesiumMapView.hbs";
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
    this.baseLayersCollection = options.baseLayersCollection;
    this.layersCollection = options.layersCollection;
    this.overlayLayersCollection = options.overlayLayersCollection;

    this.searchCollection = options.searchCollection;
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
    this.pickedEntities = undefined;
    this.productList = [];
    this.basketList = [];
    this.selectedFeatures = [];

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

  onAttach() {}

  applyLayerFilters(layer, mapModel) {
    var string =
      getISODateTimeString(mapModel.get("time")[0], false) +
      "/" +
      getISODateTimeString(mapModel.get("time")[1], false);
    layer.updateProperties("time", string);
  }

  createLayer(layer, mapModel, bbox) {
    var returnLayer = null;
    var options;
    switch (layer.display.protocol) {
      case "WMTS":
        options = {
          url: layer.display.urls ? layer.display.urls[0] : layer.display.url,
          layer: layer.display.id,
          style: layer.display.style,
          format: layer.display.format,
          rectangle: bbox
            ? new Rectangle.fromDegrees(bbox[0], bbox[1], bbox[2], bbox[3])
            : Rectangle.MAX_VALUE,
          tileMatrixSetID: layer.display.matrixSet,
          maximumLevel: 12,
          tilingScheme: new GeographicTilingScheme({
            numberOfLevelZeroTilesX: 2,
            numberOfLevelZeroTilesY: 1,
          }),
          credit:
            layer.display.attribution && new Credit(layer.display.attribution),
          show: layer.display.visible,
        };
        if (
          layer.hasOwnProperty("urlTemplate") &&
          layer.hasOwnProperty("subdomains")
        ) {
          options.url = layer.urlTemplate;
          options.subdomains = layer.subdomains;
        }
        returnLayer = new WebMapTileServiceImageryProvider(options);
        this.applyLayerFilters(returnLayer, mapModel);
        break;

      case "WMS":
        var params = $.extend(
          {
            transparent: "true",
          },
          WebMapServiceImageryProvider.DefaultParameters
        );

        // Check if layer has additional parameters configured
        var addParams = { transparent: true };
        addParams.styles = layer.display.style || "";
        if (layer.display.synchronizeTime) {
          var string =
            getISODateTimeString(mapModel.get("time")[0], false) +
            "/" +
            getISODateTimeString(mapModel.get("time")[1], false);
          addParams.time = string;
        }

        params.format = layer.display.format;
        returnLayer = new WebMapServiceImageryProvider({
          url: layer.display.urls ? layer.display.urls[0] : layer.display.url,
          layers: layer.display.id,
          rectangle: bbox
            ? new Rectangle.fromDegrees(bbox[0], bbox[1], bbox[2], bbox[3])
            : Rectangle.MAX_VALUE,
          tileWidth: layer.display.tileSize,
          tileHeight: layer.display.tileSize,
          enablePickFeatures: false,
          parameters: params,
        });

        for (var par in addParams) {
          returnLayer.updateProperties(par, addParams[par]);
        }
        break;

      default:
        returnLayer = false;
        break;
    }
    return returnLayer;
  }

  addCustomAttribution(view) {
    if (view.hasOwnProperty("attribution")) {
      $("#cesium_custom_attribution").append(
        '<div id="' +
          view.id.replace(/[^A-Z0-9]/gi, "_") +
          '" style="float: left; margin-left: 3px;">' +
          view.attribution +
          "</div>"
      );
    }
  }

  removeCustomAttribution(view) {
    if (view.hasOwnProperty("id")) {
      $("#" + view.id.replace(/[^A-Z0-9]/gi, "_")).remove();
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
      width: "100%",
      height: "100%",
    });
    this.$el.append('<div id="cesium_custom_attribution"></div>');

    WebMapTileServiceImageryProvider.prototype.updateProperties = function (
      property,
      value
    ) {
      var qPars = this._resource._queryParameters;
      qPars[property] = value;
    };

    WebMapServiceImageryProvider.prototype.updateProperties = function (
      property,
      value
    ) {
      var qPars = this._tileProvider._resource._queryParameters;
      qPars[property] = value;
    };

    var baseLayers = [];
    var initialLayer = null;

    config.baseLayers.forEach((baselayer) => {
      var layer = this.createLayer(baselayer, this.mapModel);
      baseLayers.push(layer);
      if (baselayer.display.visible) {
        initialLayer = layer;
      }
    });
    this.CesiumBaseLayersCollection = baseLayers;

    const terrain =
      config.settings.terrainUrl && config.settings.terrainUrl.length > 0
        ? new CesiumTerrainProvider({
            url: config.settings.terrainUrl,
          })
        : undefined;

    // add this dummy element as the credit container in order to remove default credit.
    const dummyCredit = document.createElement("div");

    this.map = new Viewer(this.el, {
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity,
      selectionIndicator: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      homeButton: false,
      sceneModePicker: false,
      timeline: false,
      animation: false,
      geocoder: false,
      creditContainer: dummyCredit,
      terrainProvider: terrain,
      imageryProvider: initialLayer,
    });
    this.map.scene.globe.depthTestAgainstTerrain = true;
    var initialCesiumLayer = this.map.imageryLayers.get(0);
    //Go through all defined baseLayer and add them to the map
    for (var i = 0; i < this.CesiumBaseLayersCollection.length; i++) {
      config.baseLayers.forEach((baselayer) => {
        if (initialLayer._layer === baselayer.id) {
          baselayer.ces_layer = initialCesiumLayer;
        } else {
          if (
            this.CesiumBaseLayersCollection[i]._layer === baselayer.display.id
          ) {
            var imagerylayer = this.map.scene.imageryLayers.addImageryProvider(
              this.CesiumBaseLayersCollection[i]
            );
            imagerylayer.show = baselayer.display.visible;
            baselayer.ces_layer = imagerylayer;
          }
        }
      });
    }

    // Go through all products and add them to the map
    config.layers.forEach((product) => {
      var layer = this.createLayer(product, this.mapModel);
      if (layer) {
        var imagerylayer =
          this.map.scene.imageryLayers.addImageryProvider(layer);
        product.ces_layer = imagerylayer;
        imagerylayer.show = product.display.visible;

        // If product protocol is not WMS or WMTS they are
        // shown differently so don't activate 'dummy' layers
        if (
          product.display.protocol !== "WMS" &&
          product.display.protocol !== "WMTS"
        ) {
          imagerylayer.show = false;
        }
      }
    });

    // Go through all overlays and add them to the map
    config.overlayLayers.forEach((overlay) => {
      var imagerylayer;

      var layer = this.createLayer(overlay, this.mapModel);
      if (layer) {
        imagerylayer = this.map.scene.imageryLayers.addImageryProvider(layer);
      }

      imagerylayer.show = overlay.display.visible;
      overlay.ces_layer = imagerylayer;
    });

    this.map.scene.globe.depthTestAgainstTerrain = true;
    var PreDrawnShape = this.mapModel.get("area");
    if (PreDrawnShape) {
      if (PreDrawnShape.geometry && PreDrawnShape.geometry.type === "Polygon") {
        var positionData = PreDrawnShape.geometry.coordinates[0].map((point) =>
          Cartesian3.fromDegrees(point[0], point[1])
        );
      } else if (
        PreDrawnShape.geometry &&
        PreDrawnShape.geometry.type === "Point"
      ) {
        var point = PreDrawnShape.geometry.coordinates;
        this.createPoint(
          this.map,
          Cartesian3.fromDegrees(point[0], point[1]),
          0
        );
      } else if (Array.isArray(PreDrawnShape)) {
        PreDrawnShape.push(PreDrawnShape[PreDrawnShape.length - 1]);
        var coords = [
          [PreDrawnShape[0], PreDrawnShape[1]],
          [PreDrawnShape[0], PreDrawnShape[3]],
          [PreDrawnShape[2], PreDrawnShape[3]],
          [PreDrawnShape[2], PreDrawnShape[1]],
          [PreDrawnShape[0], PreDrawnShape[1]],
        ];
        var positionData = coords.map((point) =>
          Cartesian3.fromDegrees(point[0], point[1])
        );
      }

      this.drawShape(this.map, positionData, true);
    }

    this.drawTool();
    this.flyTO();
    this.cameraMovementListener(this.map);
    this.setupEvents();
    this.map.scene.postRender.addEventListener(() => {
      if ($("#cesium_custom_attribution").text().length < 1) {
        config.baseLayers.map(
          (layer) =>
            layer.display.visible && this.addCustomAttribution(layer.display)
        );
      }
    });
    return this;
  }

  enableContour(map, model) {
    var contourColor = Color.RED.clone();
    var contourUniforms = {};

    // The viewModel tracks the state of our mini application.
    var viewModel = {
      enableContour: false,
      contourSpacing: Math.abs(17 - model.get("zoom")) * 110.0,
      contourWidth: 2.0,
      selectedShading: "elevation",
      changeColor: function () {
        contourUniforms.color = Color.fromRandom({ alpha: 1.0 }, contourColor);
      },
    };

    // Convert the viewModel members into knockout observables.
    // Cesium.knockout.track(viewModel);

    function updateMaterial() {
      var globe = map.scene.globe;
      var material;
      material = Material.fromType("ElevationContour");
      contourUniforms = material.uniforms;

      contourUniforms.width = viewModel.contourWidth;
      contourUniforms.spacing = viewModel.contourSpacing;
      contourUniforms.color = contourColor;

      globe.material = material;
    }

    updateMaterial();
  }

  addBillboards(entities, pos, identifier, list) {
    var billboards = ["remove", "add", "info"];
    var mapToImage = {
      remove: removeImage,
      add: addImage,
      info: infoImage,
    };
    var offset = -19;
    billboards.map((bill) => {
      var color =
        (list.includes(identifier) && bill === "add") ||
        (bill === "remove" && !list.includes(identifier))
          ? Color.DARKGRAY
          : Color.White;
      entities.add({
        id: bill,
        position: Cartesian3.fromDegrees(pos[0], pos[1]),
        billboard: {
          scale: 0.02,
          image: mapToImage[bill],
          pixelOffset: new Cartesian2(offset, 0),
          heightReference: HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          color: color,
        },
      });
      offset += 19;
    });
  }

  removeBillboards(entities) {
    var billboards = ["add", "remove", "info"];
    billboards.map((bill) => entities.removeById(bill));
  }

  onDrawFinished(map, model) {
    function setPointSearchGeometry(point) {
      var [xc, yc] = point;
      var x1 = xc - 0.5;
      var x2 = xc + 0.5;
      var y1 = yc - 0.5;
      var y2 = yc + 0.5;
      var coordinates = [
        [x1, y1],
        [x2, y1],
        [x2, y2],
        [x1, y2],
        [x1, y1],
      ];
      return coordinates;
    }
    var polygon = map.entities.getById("draw");
    var coordinates;
    var geoJsonArea = {
      type: "Feature",
      geometry: {},
    };

    if (polygon) {
      coordinates = polygon.polygon.hierarchy.getValue().positions;
      coordinates = coordinates.map((position) => [
        Cesium_Math.toDegrees(Cartographic.fromCartesian(position).longitude),
        Cesium_Math.toDegrees(Cartographic.fromCartesian(position).latitude),
      ]);
      geoJsonArea.geometry.type = "Polygon";
      coordinates.push(coordinates[0]);
      geoJsonArea.geometry.coordinates = [coordinates];
    } else if (model.get("tool") === "point") {
      var point = map.entities.getById("point Number_0");
      if (point) {
        var pointPosition = point.position._value;
        var xc = Cesium_Math.toDegrees(
          Cartographic.fromCartesian(pointPosition).longitude
        );
        var yc = Cesium_Math.toDegrees(
          Cartographic.fromCartesian(pointPosition).latitude
        );
        coordinates = setPointSearchGeometry([xc, yc]);
      } else if (model.get("area").geometry.type === "Point") {
        coordinates = setPointSearchGeometry(
          model.get("area").geometry.coordinates
        );
      }
      geoJsonArea.geometry.type = "Point";
      geoJsonArea.geometry.coordinates = [xc, yc];
    }
    // can be used to create the extent of the drawn polygon
    const bbox = turfBBox(geoJsonArea);
    model.set("tool", null);
    model.set("area", geoJsonArea);
  }

  drawShape(map, positionData, validate) {
    var drawn = map.entities.getById("draw");
    var identifier = null;
    // remove the previous polygon and draw the last polygon
    if (validate) {
      map.entities.remove(drawn);
      identifier = "draw";
    }
    var shape = map.entities.add({
      id: identifier,
      polygon: {
        hierarchy: positionData,
        material: new ColorMaterialProperty(Color.GRAY.withAlpha(0.3)),
      },
    });
    return shape;
  }

  setupEvents() {
    this.listenTo(this.baseLayersCollection, "change", (layerModel) => {
      this.map.scene.requestRender();
      this.onLayerChange(config.baseLayers, layerModel, true);
    });
    this.listenTo(this.highlightModel, "change", (model) => {
      var features = model.get("highlightFeature");

      if (features) {
        if (!Array.isArray(features)) {
          features = [features];
        }
        this.pickedEntities && this.pickedEntities.removeAll();
        features = features.filter(feature => typeof feature !== "undefined")
        features.map((feature) => {
          var layerId = feature.layerId || feature.properties.layer;
          var polygon = this.map.dataSources.getByName(
            feature.id + "_" + layerId
          );
          var polygonEntity = polygon[0] && polygon[0].entities && polygon[0].entities._entities._array[0];

          //var borders = this.map.entities.getById(feature.id + "_border");

          polygonEntity && this.pickedEntities && this.pickedEntities.add(polygonEntity);
          this.map.scene.requestRender();
        });
      } else {
        this.pickedEntities && this.pickedEntities.removeAll();
        this.map.scene.requestRender();
      }
    });
    this.listenTo(this.layersCollection, "change", (layerModel) => {
      this.onLayerChange(config.layers, layerModel, false);
      this.clearLayersVectorData(layerModel);
      this.updateSearchCollection();
      this.onStyleChange(layerModel);
      this.map.scene.requestRender();
    });
    this.listenTo(this.overlayLayersCollection, "change", (layerModel) =>
      this.onLayerChange(config.overlayLayers, layerModel, false)
    );
    this.listenTo(this.mapModel, "change:time", (model) =>
      this.onTimeChange(config.layers, config.overlayLayers, model)
    );
    this.listenTo(this.mapModel, "change:tool", () => {
      if (this.mapModel.get("tool") === "bbox") {
        this.clearPoints(this.map);
        this.map.scene.screenSpaceCameraController.enableRotate = false;
      } else {
        this.map.scene.screenSpaceCameraController.enableRotate = true;
      }
    });
    this.listenTo(this.mapModel, "change", () => this.updateSearchCollection());
    this.listenTo(this.searchCollection, "change", () =>
      this.updateSearchCollection()
    );
    this.listenTo(this.mapModel, "change:area", () => {
      if (!this.mapModel.get("area")) {
        this.clearPoints(this.map);
        var drawn = this.map.entities.getById("draw");
        this.map.entities.remove(drawn);
      }
    });
    // this.listenTo(this.mapModel, "change:zoom", (model) =>
    // this.enableContour(this.map, model)
    // );
  }

  clearPoints(map) {
    var points = map.entities.values.filter((object) => object.point);
    points.map((point) => map.entities.remove(point));
  }
  createPoint(map, worldPosition, id) {
    var name = "point Number_" + id;
    // prevent duplication
    if (!map.entities.getById(name)) {
      var point = map.entities.add({
        id: name,
        position: worldPosition,
        point: {
          color: Color.DEEPSKYBLUE,
          pixelSize: 10,
          heightReference: HeightReference.RELATIVE_TO_GROUND,
        },
      });
      return point;
    }
  }
  drawTool() {
    //onclick events.

    // disable the default onClick response on Cesium's widget
    this.map.cesiumWidget.screenSpaceEventHandler.removeInputAction(
      ScreenSpaceEventType.LEFT_CLICK
    );
    this.map.cesiumWidget.screenSpaceEventHandler.removeInputAction(
      ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );
    this.map.cesiumWidget.screenSpaceEventHandler.removeInputAction(
      ScreenSpaceEventType.MOUSE_MOVE
    );

    var handler = new ScreenSpaceEventHandler(this.map.scene.canvas);

    var selectedFeatures = this.selectedFeatures;
    var FeatureClick = this.onFeatureClicked;
    var map = this.map;
    var removeBillboards = this.removeBillboards;
    var addBillboards = this.addBillboards;
    var basketList = this.basketList;
    var model = this.mapModel;
    var activeShapePoints = [];
    var activeShape;
    var floatingPoint;
    var scene = map.scene;

    var rightEdge;
    var leftEdge;
    var xo;
    var yo;
    var earthPosition;

    //click function
    handler.setInputAction((movement) => {
      function terminateShape(map) {
        // draw shape only if there are more than (2 double click + 1) points created

        drawShape(map, activeShapePoints, true);

        floatingPoint = undefined;
        activeShape = undefined;
        activeShapePoints = [];
      }
      var features = scene.drillPick(movement.position);
      // separate buttons from products
      var icons = features.filter((feature) =>
        ["remove", "add", "info"].includes(feature.id.id)
      );
      var products = features.filter(
        (feature) => !["remove", "add", "info"].includes(feature.id.id)
      );

      // buttons functions add remove or info
      if (
        Cesium_defined(icons) &&
        icons.length === 1 &&
        !this.mapModel.get("tool")
      ) {
        var records = [];
        selectedFeatures.map((feature) => {
          records.push(feature.id.properties.record.getValue());
        });
        switch (icons[0].id.id) {
          case "info":
            if (records.length > 0) {
              FeatureClick(records);
              removeBillboards(map.entities);
            }
            break;
          case "add":
            if (icons[0].primitive.color !== Color.DARKGRAY) {
              if (records.length > 0) {
                records.map((record) => {
                  const [recordModel, searchModel] = record;
                  const downloadSelection =
                    searchModel.get("downloadSelection");
                  downloadSelection.add(recordModel);
                  var searchModelId = searchModel.get("layerModel").id;
                  var layerId = recordModel.get("id") + "_" + searchModelId;
                  basketList.push(layerId);
                });
                icons[0].primitive.color === Color.DARKGRAY;
                removeBillboards(map.entities);
              }
            }
            break;
          case "remove":
            records.map((record) => {
              if (icons[0].primitive.color !== Color.DARKGRAY) {
                const [recordModel, searchModel] = record;
                const downloadSelection = searchModel.get("downloadSelection");
                downloadSelection.remove(recordModel);
                var searchModelId = searchModel.get("layerModel").id;
                var layerId = recordModel.get("id") + "_" + searchModelId;
                basketList.map((item, index) => {
                  item === layerId && basketList.splice(index, 1);
                });
              }
              removeBillboards(map.entities);
            });

            break;
          default:
        }
      } else if (
        Cesium_defined(products) &&
        products.length > 0 &&
        !this.mapModel.get("tool") &&
        products[0].id.id != "draw"
      ) {
        // create billboards when click on products

        // get the bbox of the product
        const [recordModel, searchModel] =
          products[0].id.properties.record.getValue();
        var box = recordModel.get("bbox");
        var searchModelId = searchModel.get("layerModel").id;
        // the position of the billboards as the center of the bbox
        var position = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
        var layerId = recordModel.get("id") + "_" + searchModelId;

        removeBillboards(map.entities);
        addBillboards(map.entities, position, layerId, basketList);
        selectedFeatures = products.filter(
          (product) => product.id.id != "draw"
        );
      } else {
        // We use `this.map.scene.pickPosition` here instead of `this.map.camera.pickEllipsoid` so that
        // we get the correct point when the mouse moves over terrain.
        var earthPosition = map.scene.pickPosition(movement.position);
        removeBillboards(map.entities);
        if (this.mapModel.get("tool") === "point") {
          // `earthPosition` will be undefined if our mouse is not over the globe.
          if (Cesium_defined(earthPosition)) {
            clearPoints(map);
            floatingPoint = createPoint(map, earthPosition, 0);
            onDrawFinished(map, model);
          }
        } else if (this.mapModel.get("tool") === "polygon") {
          // `earthPosition` will be undefined if our mouse is not over the globe.
          if (Cesium_defined(earthPosition)) {
            if (activeShapePoints.length === 0) {
              clearPoints(map);
              floatingPoint = createPoint(
                map,
                earthPosition,
                activeShapePoints.length
              );
              activeShapePoints.push(earthPosition);
              var dynamicPositions = new CallbackProperty(function () {
                return new PolygonHierarchy(activeShapePoints);
              }, false);
              var activeShapes = map.entities.values.filter(
                (entity) => entity.polygon
              );
              if (activeShapes.length === 0 || map.entities.getById("draw")) {
                activeShape = drawShape(map, dynamicPositions, false);
              }
            }
            activeShapePoints.push(earthPosition);
            createPoint(map, earthPosition, activeShapePoints.length);
          }
        } else if (model.get("tool") === "bbox") {
          if (activeShapePoints.length === 0) {
            clearPoints(map);
            var staticPoint = createPoint(map, earthPosition, 0);
            xo = Cesium_Math.toDegrees(
              Cartographic.fromCartesian(earthPosition).longitude
            );
            yo = Cesium_Math.toDegrees(
              Cartographic.fromCartesian(earthPosition).latitude
            );

            rightEdge = createPoint(map, earthPosition, 1);
            leftEdge = createPoint(map, earthPosition, 2);
            floatingPoint = createPoint(map, earthPosition, 3);
            activeShapePoints.push(earthPosition);
            var dynamicPositions = new CallbackProperty(function () {
              return new PolygonHierarchy(activeShapePoints);
            }, false);
            activeShape = drawShape(map, dynamicPositions);
          } else {
            terminateShape(map);
            onDrawFinished(map, model);
            clearPoints(map);
          }
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
    // this.enableContour(this.map, this.mapModel);

    var dataSources = map.dataSources._dataSources;
    this.clearVectors(dataSources);
    var borders = map.entities.values.filter((entity) => entity.polyline);
    this.clearBorders(borders);

    var createPoint = this.createPoint;

    var drawShape = this.drawShape;
    var clearPoints = this.clearPoints;

    var onDrawFinished = this.onDrawFinished;

    // Redraw the shape so it's not dynamic and remove the dynamic shape.
    function terminatePolygon(map) {
      // draw shape only if there are more than (2 double click + 1) points created
      var points = activeShapePoints;
      points.splice(-2);
      if (points.length > 2) {
        activeShapePoints.pop();
        drawShape(map, activeShapePoints, true);
      }
      map.entities.remove(floatingPoint);
      map.entities.remove(activeShape);
      floatingPoint = undefined;
      activeShape = undefined;
      activeShapePoints = [];
    }

    handler.setInputAction((event) => {
      if (this.mapModel.get("tool") === "polygon") {
        // We use `this.map.scene.pickPosition` here instead of `this.map.camera.pickEllipsoid` so that
        // we get the correct point when mousing over terrain.
        var earthPosition = map.scene.pickPosition(event.position);
        // `earthPosition` will be undefined if our mouse is not over the globe.
        if (Cesium_defined(earthPosition)) {
          if (activeShapePoints.length === 0) {
            clearPoints(map);
            floatingPoint = createPoint(
              map,
              earthPosition,
              activeShapePoints.length
            );
            activeShapePoints.push(earthPosition);
            var dynamicPositions = new CallbackProperty(function () {
              return new PolygonHierarchy(activeShapePoints);
            }, false);
            activeShape = drawShape(map, dynamicPositions);
          }
          activeShapePoints.push(earthPosition);
          createPoint(map, earthPosition, activeShapePoints.length);
        }
        terminatePolygon(map);
        onDrawFinished(map, model);
        clearPoints(map);
      }
    }, ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    handler.setInputAction((event) => {
      if (!model.get("tool")) {
        // get an array of all primitives at the mouse position
        var pickedObjects = this.map.scene.drillPick(event.endPosition);
        if (Cesium_defined(pickedObjects)) {
          //Update the collection of picked entities.
          if (this.pickedEntities) {
            var validEntities = pickedObjects.map((object) => object.id.id);
            if (validEntities.length > 0) {
              this.pickedEntities.removeAll();
              let highlightedFeatures = [];
              pickedObjects
                .filter((object) => object.id.id && object.id.id != "draw")
                .map((object) => {
                  this.pickedEntities.add(object.id);
                  this.map.scene.requestRender();
                  let highlightedFeature =
                    object.id.properties &&
                    object.id.properties.record.getValue()[0].attributes;
                  if (highlightedFeature) {
                    highlightedFeature.layerId =
                      highlightedFeature.layerId ||
                      highlightedFeature.properties.layer;
                  }
                  highlightedFeatures.push(highlightedFeature);
                });
              this.highlightModel.set("highlightFeature", highlightedFeatures);
            } else {
              this.pickedEntities.removeAll();
              this.map.scene.requestRender();
              this.highlightModel.set("highlightFeature", undefined);
            }
          }
        }
      } else if (
        Cesium_defined(floatingPoint) &&
        model.get("tool") === "bbox"
      ) {
        var newPosition = map.scene.pickPosition(event.endPosition);
        if (Cesium_defined(newPosition)) {
          var points = map.entities.values.filter((object) => object.point);
          if (points.length > 0) {
            // all the 4 points has the initial point location
            activeShapePoints[0] = points[0].position._value;

            var xc = Cesium_Math.toDegrees(
              Cartographic.fromCartesian(newPosition).longitude
            );
            var yc = Cesium_Math.toDegrees(
              Cartographic.fromCartesian(newPosition).latitude
            );
            var rightPosition = new Cartographic();
            rightPosition.longitude = xo;
            rightPosition.latitude = yo - (yo - yc);
            var leftPosition = new Cartographic();
            leftPosition.longitude = xo - (xo - xc);
            leftPosition.latitude = yo;

            floatingPoint.position.setValue(newPosition);
            rightEdge.position.setValue(
              Cartesian3.fromDegrees(
                rightPosition.longitude,
                rightPosition.latitude
              )
            );
            leftEdge.position.setValue(
              Cartesian3.fromDegrees(
                leftPosition.longitude,
                leftPosition.latitude
              )
            );
            activeShapePoints[1] = Cartesian3.fromDegrees(
              rightPosition.longitude,
              rightPosition.latitude
            );
            activeShapePoints[3] = Cartesian3.fromDegrees(
              leftPosition.longitude,
              leftPosition.latitude
            );
            activeShapePoints[2] = newPosition;
          }
        }
      } else {
        if (Cesium_defined(floatingPoint) && model.get("tool") === "polygon") {
          var newPosition = map.scene.pickPosition(event.endPosition);
          if (Cesium_defined(newPosition)) {
            floatingPoint.position.setValue(newPosition);
            activeShapePoints.pop();
            activeShapePoints.push(newPosition);
          }
        }
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);
  }

  onStyleChange(model) {
    var layerChanged = model.get("display").extraParameters;
    var option = layerChanged && layerChanged.LAYERS;
    this.updateWMTSLayer(model, config.layers, option, model.get("display").id);
  }

  updateSearchCollection() {
    // generate vectorLayers from searchModel results
    var collection = this.searchCollection;
    this.productList = [];
    collection.map((model) => {
      var length = model.get("results").length - 1;
      model.get("results").map((model, index) => {
        var searchModel = model.collection.searchModel;
        var searchModelId = searchModel.get("layerModel").id;
        var layerId = model.get("id") + "_" + searchModelId;
        var show = searchModel.get("layerModel").get("display").visible;
        // create vector layers only for the visible layers.
        if (show) {
          this.productList.push(layerId);
          this.productList = _.uniq(this.productList);
          var makePropertyForLastItem = index === length;
          this.createVectorLayers(
            model,
            searchModel,
            layerId,
            makePropertyForLastItem
          );
        }
      });
      this.clearVectorLayers(this.productList);
    });
  }
  clearVectorLayers(list) {
    var dataSources = this.map.dataSources._dataSources;
    dataSources.map((source) => {
      if (list && list.indexOf(source.name) < 0) {
        var removedSource = this.map.dataSources.getByName(source.name);
        removedSource.map((item) => this.map.dataSources.remove(item));
        this.map.entities.removeById(source.name + "_border");
      }
    });
  }

  clearVectors(dataSources) {
    var removedList = [];
    // when loop over dataSources & removing a dataSources, the loop is forced to end
    // so the workaround is to create a list of the removed items
    dataSources.map((source) =>
      removedList.push(this.map.dataSources.getByName(source.name)[0])
    );

    removedList.map((item) => this.map.dataSources.remove(item));
  }

  clearBorders(entities) {
    var removedList = [];
    entities.map((border) => removedList.push(border));

    removedList.map((item) => this.map.entities.remove(item));
  }

  clearLayersVectorData(model) {
    var dataSources = this.map.dataSources._dataSources;
    if (model && !model.get("display").visible) {
      var clearedData = dataSources.filter(
        (dataSource) =>
          dataSource.entities.values[0].properties.layer.getValue() === model.id
      );
      var borders = this.map.entities.values.filter(
        (border) => border.polyline
      );

      this.clearVectors(clearedData);
      this.clearBorders(borders);
    }
  }

  createVectorLayers(model, searchModel, identifier, lastItem) {
    var fillColor = Color.fromCssColorString(this.footprintFillColor);
    var highlightFillColor = Color.fromCssColorString(this.highlightFillColor);
    var selectedFootprintFillColor = Color.fromCssColorString(
      this.selectedFootprintFillColor
    );
    var footprintStrokeColor = Color.fromCssColorString(
      this.footprintStrokeColor
    );
    var highlightStrokeColor = Color.fromCssColorString(
      this.highlightStrokeColor
    );
    var selectedFootprintStrokeColor = Color.fromCssColorString(
      this.selectedFootprintStrokeColor
    );
    var vectorLayer = {};

    vectorLayer.id = identifier;
    // add the parent layer to the product
    model.get("properties").layer = searchModel.get("layerModel").id;
    // attach the openSearchModel to the vector layer ( will be used in onClick event)
    model.get("properties").record = [model, searchModel];
    var productExist = this.map.dataSources.getByName(vectorLayer.id);
    // create geojsons if they are not already created
    var show = searchModel.get("layerModel").get("display").visible;

    if (
      show &&
      this.productList.indexOf(vectorLayer.id) > -1 &&
      productExist.length === 0
    ) {
      var Geojson_template = {
        type: "Feature",
        geometry: model.get("geometry"),
        // if the product is added to the basket a selected (e.g red) polygon with no need to have properties
        // otherwise the created polygon would contain properties
        properties: model.get("properties"),
      };

      vectorLayer.geojson = Geojson_template;
      // create a geojson from the models data
      var feature = new GeoJsonDataSource(vectorLayer.id).load(
        vectorLayer.geojson,
        {
          clampToGround: true,
        }
      );
      var bbox = model.get("bbox");
      var borders = {
        id: vectorLayer.id + "_border",
        polyline: {
          positions: Cartesian3.fromDegreesArray([
            bbox[0],
            bbox[1],
            bbox[0],
            bbox[3],
            bbox[2],
            bbox[3],
            bbox[2],
            bbox[1],
            bbox[0],
            bbox[1],
          ]),
          clampToGround: true,
          width: 1,
          material: new PolylineOutlineMaterialProperty({
            color: Color.fromCssColorString(this.footprintStrokeColor),
          }),
        },
      };

      // add the created goejson to the map
      this.map.dataSources.add(feature);
      this.map.entities.add(borders);
      if (lastItem) {
        //update the scene entities
        this.pickedEntities = new EntityCollection();
        // specify the geojson color, and the highlight effect when mouseOver
        this.map.dataSources._dataSources.map((dataSource) => {
          this.makeProperty(
            dataSource,
            fillColor,
            this.pickedEntities,
            highlightFillColor,
            selectedFootprintFillColor,
            this.basketList
          );
        });
      }
    }
  }

  makeProperty(entity, color, pickedItem, pickedColor, selectedColor, list) {
    entity.entities.values.map((product) => {
      var colorProperty = new CallbackProperty(function (time, result) {
        if (pickedItem.contains(product)) {
          // if mouse over geojson is yellow
          return pickedColor.clone(result);
        } else if (
          list.filter((item) => item.includes(product.name)).length > 0
        ) {
          // add the red overlay in case added to the basket
          return selectedColor.clone(result);
        } else if (
          list.filter((item) => item.includes(product.name)).length < 0
        ) {
          // default color ( from configuration)
          return color.clone(result);
        }
        return color.clone(result);
      }, false);

      product.polygon.material = new ColorMaterialProperty(colorProperty);
    });
  }

  onTimeChange(layers, overLayers, mapModel) {
    var string =
      getISODateTimeString(mapModel.attributes.time[0], false) +
      "/" +
      getISODateTimeString(mapModel.attributes.time[1], false);

    this.updateTime(layers, string);
    this.updateTime(overLayers, string);
  }

  cameraMovementListener(map) {
    map.scene.camera.moveEnd.addEventListener(() => this.onMapMoveEnd());
  }
  onMapMoveEnd() {
    var scratchRectangle = new Rectangle();
    var bbox = this.map.camera.computeViewRectangle(
      this.map.scene.globe.ellipsoid,
      scratchRectangle
    );
    var view = [
      Cesium_Math.toDegrees(bbox.west),
      Cesium_Math.toDegrees(bbox.south),
      Cesium_Math.toDegrees(bbox.east),
      Cesium_Math.toDegrees(bbox.north),
    ];
    this.mapModel.set("bbox", view);

    // set the new center in mapModel
    var coords = this.map.camera.positionCartographic;
    var easting = Cesium_Math.toDegrees(coords.longitude).toFixed(1);
    var northing = Cesium_Math.toDegrees(coords.latitude).toFixed(1);
    this.mapModel.set("center", [easting, northing]);

    // set the zoom level and height in mapModel
    var zoom = this.getZoomFromHeight(coords.height);

    this.mapModel.set("zoom", zoom);
    this.map.scene.requestRender();
  }

  updateTime(layers, string) {
    layers.forEach((layer) => {
      var cesLayer = layer.ces_layer;
      if (cesLayer) {
        cesLayer.imageryProvider.updateProperties("time", string);
        if (cesLayer.show) {
          var index = this.map.scene.imageryLayers.indexOf(cesLayer);
          this.map.scene.imageryLayers.remove(cesLayer, false);
          this.map.scene.imageryLayers.add(cesLayer, index);
        }
      }
    });
  }

  updateWMTSLayer(LayerModel, layers, newID, oldID) {
    if (newID) {
      layers.forEach((layer) => {
        var cesLayer = layer.ces_layer;
        if (cesLayer && cesLayer.imageryProvider._layer === oldID) {
          cesLayer.imageryProvider._layer = newID;
          if (cesLayer.show) {
            var index = this.map.scene.imageryLayers.indexOf(cesLayer);
            this.map.scene.imageryLayers.remove(cesLayer, false);
            this.map.scene.imageryLayers.add(cesLayer, index);
          }
        }
      });
      LayerModel.attributes.display.id = newID;
    }
  }

  onLayerChange(baseLayers, layerModel, conditional) {
    var removeCustomAttribution = this.removeCustomAttribution;
    var addCustomAttribution = this.addCustomAttribution;
    baseLayers.forEach(function (baselayer) {
      var cesLayer = baselayer.ces_layer;
      var layerId =
        cesLayer._imageryProvider._layer || cesLayer._imageryProvider._layers;
      if (cesLayer) {
        if (
          layerId === layerModel.attributes.display.id &&
          layerModel.attributes.display.visible
        ) {
          cesLayer.show = true;
          addCustomAttribution(baselayer.display);
        }
      }
    });

    baseLayers.forEach(function (baselayer) {
      var cesLayer = baselayer.ces_layer;
      var layerId =
        cesLayer._imageryProvider._layer || cesLayer._imageryProvider._layers;
      if (cesLayer) {
        if (conditional) {
          if (layerId !== layerModel.attributes.display.id) {
            cesLayer.show = false;
            removeCustomAttribution(baselayer.display);
          }
        } else if (layerId === layerModel.attributes.display.id) {
          cesLayer.show = layerModel.attributes.display.visible;
        }
      }
    });
  }

  flyTO() {
    var east = this.mapModel.get("center")[0];
    var north = this.mapModel.get("center")[1];
    var height = this.getHeightFromZoom(this.mapModel.get("zoom"));
    this.map.camera.flyTo({
      destination: Cartesian3.fromDegrees(east, north, height),
    });
  }

  getZoomFromHeight(height) {
    return Math.log2(this.mapModel.get("heightFactor") / height) + 1;
  }

  getHeightFromZoom(zoom) {
    return this.mapModel.get("heightFactor") / Math.pow(2, zoom - 1);
  }
}

CesiumMapView.prototype.template = () => "";

CesiumMapView.prototype.events = {};

export default CesiumMapView;
