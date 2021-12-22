import Marionette from 'backbone.marionette';
import Backbone from 'backbone';
import i18next from 'i18next';

import $ from 'jquery';
import _ from 'underscore';

import Feature from 'ol/Feature';
import Collection from 'ol/Collection';
import Overlay from 'ol/Overlay';

import Draw, { createBox } from 'ol/interaction/Draw';
import Control from 'ol/control/Control';

import Group from 'ol/layer/Group';

import GeoJSON from 'ol/format/GeoJSON';

import Polygon, { fromExtent } from 'ol/geom/Polygon';
import Point from 'ol/geom/Point';
import { appendParams } from 'ol/uri';

import { get as getProj, transform, transformExtent } from 'ol/proj';
import { getArea } from 'ol/sphere';

import { Wkt } from 'wicket';

import { uniqueBy, getISODateTimeString, setSearchParam, numberThousandSep } from '../../core/util';
import { createMap, updateLayerParams, createRasterLayer, createVectorLayer, sortLayers, createCutOut, wrapToBounds, featureCoordsToBounds, getProjectionOl } from './utils';
import CollectionSource from './CollectionSource';
import ModelAttributeSource from './ModelAttributeSource';
import ExportWMSLayerListView from './ExportWMSLayerListView';
import ProgressBar from './progressbar';
import './ol-source.css';
import './ol.css';
import template from './OpenLayersMapView.hbs';
import { isRecordDownloadable } from '../../download';

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


function wrapBox(box) {
  const bbox = box;
  if (bbox[2] - bbox[0] > 360) {
    bbox[0] = -180;
    bbox[2] = 180;
  }
  bbox[1] = Math.max(bbox[1], -90);
  bbox[3] = Math.min(bbox[3], 90);

  for (let i = 0; i <= 2; i += 2) {
    while (bbox[i] > 180) {
      bbox[i] -= 360;
    }
    while (bbox[i] < -180) {
      bbox[i] += 360;
    }
  }
  return bbox;
}

function wrapCoordinate(coord) {
  let x = coord[0];
  while (x > 180) {
    x -= 360;
  }
  while (x < -180) {
    x += 360;
  }
  const y = Math.min(Math.max(coord[1], -90), 90);
  return [x, y];
}

/**
 * @memberof contrib/OpenLayers
 */

class OpenLayersMapView extends Marionette.ItemView {
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
    this.footprintLabel = options.footprintLabel;

    this.staticHighlight = options.staticHighlight;
    this.useDetailsDisplay = options.useDetailsDisplay;

    this.map = undefined;

    this.isPanning = false;
    this.isZooming = false;

    this.onFeatureClicked = options.onFeatureClicked;
    this.constrainOutCoords = options.constrainOutCoords;
    this.singleLayerModeUsed = options.singleLayerModeUsed;
    this.areaFilterLayerExtent = options.areaFilterLayerExtent;
    this.maxAreaFilter = options.maxAreaFilter;

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

      const validCollections = new Backbone.Collection(this.layersCollection.filter((layer) => {
        const display = this.useDetailsDisplay && layer.get('detailsDisplay')
          ? layer.get('detailsDisplay')
          : layer.get('display');
        const isValidDisplay = typeof display.urls !== 'undefined' ? display.urls[0] !== '' : display.url !== '';
        return ['WMS', 'WMTS'].includes(display.protocol.toUpperCase()) && isValidDisplay;
      }));
      if (validCollections.length > 0) {
        new ExportWMSLayerListView(
          {
            el: this.$('.export-tools')[0],
            collection: validCollections,
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

    this.projection = getProjectionOl(this.mapModel.get('projection'));

    this.geoJSONFormat = new GeoJSON();
    this.readerOptions = {
      featureProjection: this.projection,
    };

    const minZoom = this.layersCollection.filter(layer => !layer.get('display').noAntialiasing)
    .map(
      layer => (
        this.useDetailsDisplay && layer.get('detailsDisplay')
          ? layer.get('detailsDisplay')
          : layer.get('display')
      ).minZoom
    )
      .filter(layerMinZoom => typeof layerMinZoom !== 'undefined')
      .reduce((acc, layerMinZoom) => Math.max(acc, layerMinZoom), this.mapModel.get('minZoom'));

    const maxZoom = this.layersCollection.filter(layer => !layer.get('display').noAntialiasing)
    .map(
      layer => (
        this.useDetailsDisplay && layer.get('detailsDisplay')
          ? layer.get('detailsDisplay')
          : layer.get('display')
      ).maxZoom
    )
      .filter(layerMaxZoom => typeof layerMaxZoom !== 'undefined')
      .reduce((acc, layerMaxZoom) => Math.min(acc, layerMaxZoom), this.mapModel.get('maxZoom'));

    // create the map object
    this.map = createMap(
      this.mapModel.get('center') || [0, 0],
      this.mapModel.get('zoom') + 1 || 2,
      options.mapRenderer || 'canvas',
      minZoom + 1,
      maxZoom + 1,
      this.projection || 'EPSG:4326'
    );

    // create layer groups for base, normal and overlay layers

    const createGroupForCollection = (collection) => {
      const group = new Group({
        layers: sortLayers(
          collection, collection.map(layerModel => createRasterLayer(
            layerModel, this.useDetailsDisplay
          ))
        ),
      });
      return group;
    };

    this.groups = {
      baseLayers: createGroupForCollection(this.baseLayersCollection),
      layers: createGroupForCollection(this.layersCollection),
      overlayLayers: createGroupForCollection(this.overlayLayersCollection),
    };

    this.groups.layers.getLayers().forEach((layer) => {
      this.applyLayerFilters(layer, this.mapModel);
      this.progressBar.addSource(layer.getSource());
    }, this);

    const selectionLayer = createVectorLayer({
      fillColor: 'rgba(255, 255, 255, 0.0)',
      strokeColor: '#ffcc33',
      strokeWidth: 2,
      circleRadius: 7,
    });
    this.selectionSource = selectionLayer.getSource();

    const searchCollection = this.searchCollection || [];
    // create layer group to display footprints of search results
    this.searchLayersGroup = new GroupById({
      layers: searchCollection.map((searchModel) => {
        const searchLayer = createVectorLayer({
          strokeColor: this.footprintStrokeColor,
          footprintLabel: this.footprintLabel,
        },
        new CollectionSource({
          collection: searchModel.get('results'),
          transformModel: model => this.createMapFeatures(model, searchModel)[0],
          format: new GeoJSON({
            featureProjection: this.projection,
          }),
        }));
        searchLayer.id = searchModel.get('layerModel').get('id');
        searchLayer.searchModel = searchModel;
        this.listenTo(searchModel, 'change:automaticSearch', () => (
          this.onLayerChange(searchModel.get('layerModel'), this.groups.layers)
        ));
        return searchLayer;
      }),
    });

    this.searchLayersFillGroup = new GroupById({
      layers: searchCollection.map((searchModel) => {
        const searchLayer = createVectorLayer({
          fillColor: this.footprintFillColor,
        }, this.searchLayersGroup.getLayerById(searchModel.get('layerModel').get('id')).getSource());
        searchLayer.id = searchModel.get('layerModel').get('id');
        return searchLayer;
      }),
    });

    // create layer group to display footprints of download selection
    this.downloadSelectionLayerGroup = new GroupById({
      layers: searchCollection.map((searchModel) => {
        const downloadSelectionLayer = createVectorLayer({
          strokeColor: this.selectedFootprintStrokeColor,
        }, new CollectionSource({
          collection: searchModel.get('downloadSelection'),
          transformModel: model => this.createMapFeatures(model, searchModel)[0],
          format: new GeoJSON({
            featureProjection: this.projection,
          }),
        }));
        downloadSelectionLayer.id = searchModel.get('layerModel').get('id');
        return downloadSelectionLayer;
      })
    });

    const downloadSelectionLayerFillGroup = new GroupById({
      layers: searchCollection.map((searchModel) => {
        const downloadSelectionLayer = createVectorLayer({
          fillColor: this.selectedFootprintFillColor,
        }, this.downloadSelectionLayerGroup.getLayerById(searchModel.get('layerModel').get('id')).getSource());
        return downloadSelectionLayer;
      }),
    });

    // create layer for highlighting features
    const highlightSource = new ModelAttributeSource({
      model: this.highlightModel,
      attributeName: 'highlightFeature',
      transformAttribute: attr => this.createMapFeatures(attr),
      format: new GeoJSON({
        featureProjection: this.projection,
      }),
    });

    const highlightLayer = createVectorLayer({
      strokeColor: this.highlightStrokeColor,
      strokeWidth: this.highlightStrokeWidth,
    }, highlightSource);
    const highlightFillLayer = createVectorLayer({
      fillColor: this.highlightFillColor,
      strokeWidth: this.highlightStrokeWidth,
    }, highlightSource);

    // add the layers to the map

    this.map.addLayer(this.groups.baseLayers);

    this.map.addLayer(this.searchLayersFillGroup);
    this.map.addLayer(downloadSelectionLayerFillGroup);
    this.map.addLayer(highlightFillLayer);

    this.map.addLayer(this.groups.layers);
    this.map.addLayer(this.groups.overlayLayers);

    this.map.addLayer(selectionLayer);

    this.map.addLayer(this.searchLayersGroup);
    this.map.addLayer(this.downloadSelectionLayerGroup);

    this.map.addLayer(highlightLayer);

    // attach to signals of the collections
    this.setupEvents();
    this.setupControls();

    return this;
  }

  applyLayerFilters(layer, mapModel) {
    let filtersModel;
    if (layer.searchModel) {
      filtersModel = layer.searchModel.get('filtersModel');
    }
    updateLayerParams(
      layer, mapModel, layer.layerModel, filtersModel, this.useDetailsDisplay);
  }

  /**
   * Remove the layer from the given group;
   *
   */
  removeLayer(layerModel, group) {
    group.getLayers().remove(this.getLayerOfGroup(layerModel, group));
  }

  getLayerOfGroup(layerModel, group) {
    const id = layerModel.get('id');
    let foundLayer;
    group.getLayers().forEach((layer) => {
      if (layer.id === id) {
        foundLayer = layer;
      }
    });
    return foundLayer;
  }

  // Set up all events to change url search parameters
  setupSearchParamsEvents() {
    this.listenTo(this.mapModel, 'change:center', () => {
      this.setSearchParamCenter();
    });
    this.listenTo(this.mapModel, 'change:zoom', () => {
      this.setSearchParamZoom();
    });
    this.listenTo(this.mapModel, 'change:time', () => {
      this.setSearchParamTime();
    });
    this.selectionSource.on('change', () => {
      this.setSearchParamArea();
    });
  }

  setSearchParamCenter() {
    setSearchParam('x', (transform(this.mapModel.get('center'), 'EPSG:4326', this.projection)[0]).toFixed(6));
    setSearchParam('y', (transform(this.mapModel.get('center'), 'EPSG:4326', this.projection)[1]).toFixed(6));
  }

  setSearchParamZoom() {
    setSearchParam('z', this.mapModel.get('zoom').toFixed(0));
  }

  setSearchParamTime() {
    setSearchParam('start', getISODateTimeString(this.mapModel.get('time')[0], false));
    setSearchParam('end', getISODateTimeString(this.mapModel.get('time')[1], false));
  }

  setSearchParamArea() {
    const vectorFeatures = this.selectionSource.getFeatures();
    if (vectorFeatures.length !== 2) {
      setSearchParam('area', null);
    } else {
      const writerOptions = {
        decimals: 6,
        dataProjection: 'ESPG:4326',
        featureProjection: this.projection,
      };
      // convert feature to geojson format in map projection
      const geomJson = this.geoJSONFormat.writeGeometryObject(vectorFeatures[1].getGeometry(), writerOptions);
      // write as JSON string and save read it with wkt
      wkt.read(JSON.stringify(geomJson));
      // write as WKT string and set it as search param
      setSearchParam('area', wkt.write());
    }
  }

  /**
   * Set up all events from the layer collections
   *
   */

  setupEvents() {
    // setup collection signals
    this.listenTo(this.layersCollection, 'add', layerModel =>
      this.addLayer(layerModel, this.groups.layers)
    );
    this.listenTo(this.layersCollection, 'change', layerModel =>
      this.onLayerChange(layerModel, this.groups.layers)
    );
    this.listenTo(this.layersCollection, 'remove', layerModel =>
      this.removeLayer(layerModel, this.groups.layers)
    );
    this.listenTo(this.layersCollection, 'sort', layers => this.onLayersSorted(layers));

    this.listenTo(this.baseLayersCollection, 'add', layerModel =>
      this.addLayer(layerModel, this.groups.baseLayers)
    );
    this.listenTo(this.baseLayersCollection, 'change', layerModel =>
      this.onLayerChange(layerModel, this.groups.baseLayers)
    );
    this.listenTo(this.baseLayersCollection, 'remove', layerModel =>
      this.removeLayer(layerModel, this.groups.baseLayers)
    );

    this.listenTo(this.overlayLayersCollection, 'add', layerModel =>
      this.addLayer(layerModel, this.groups.overlayLayers)
    );
    this.listenTo(this.overlayLayersCollection, 'change', layerModel =>
      this.onLayerChange(layerModel, this.groups.overlayLayers)
    );
    this.listenTo(this.overlayLayersCollection, 'remove', layerModel =>
      this.removeLayer(layerModel, this.groups.overlayLayers)
    );

    // setup mapModel signals

    // directly tie the changes to the map
    this.listenTo(this.mapModel, 'change:center', (mapModel) => {
      if (!this.isPanning) {
        this.map.getView().setCenter(transform(mapModel.get('center'), 'EPSG:4326', this.projection));
      }
      this.checkMaxAreaFilter();
    });
    this.listenTo(this.mapModel, 'change:zoom', (mapModel) => {
      if (!this.isZooming) {
        this.map.getView().setZoom(mapModel.get('zoom'));
      }
      this.checkMaxAreaFilter();
    });

    this.listenTo(this.mapModel, 'change:roll', (mapModel) => {
      this.map.getView().setRotation(mapModel.get('roll'));
    });

    this.listenTo(this.mapModel, 'change:time', this.onTimeChange);
    this.listenTo(this.mapModel, 'change:tool', this.onToolChange);

    this.listenTo(this.mapModel, 'show', (feature) => {
      // assume EPSG:4326 object is received
      let geometry = null;
      if (feature.bbox) {
        geometry = transformExtent(feature.bbox, 'EPSG:4326', this.projection);
      } else if (Array.isArray(feature)) {
        const [minx, miny, maxx, maxy] = feature;
        geometry = fromExtent([
          minx, miny, maxx > minx ? maxx : maxx + 360, maxy,
        ]).transform('EPSG:4326', this.projection);
      } else if (feature.geometry.type === 'Point') {
        const c = feature.geometry.coordinates;
        const b = 0.5;
        geometry = transformExtent([c[0] - b, c[1] - b, c[0] + b, c[1] + b], 'EPSG:4326', this.projection);
      } else {
        geometry = this.geoJSONFormat.readGeometry(feature.geometry, this.readerOptions);
      }
      this.map.getView().fit(geometry, { duration: 250 });
    });

    // setup filters signals
    this.listenTo(this.mapModel, 'change:area', this.onMapAreaChange);

    const searchCollection = this.searchCollection || [];
    searchCollection.forEach((searchModel) => {
      this.listenTo(searchModel.get('filtersModel'), 'change', (filtersModel) => {
        const layerModel = searchModel.get('layerModel');
        const cqlParameterName = layerModel.get('display.cqlParameterName');
        if (cqlParameterName) {
          const layer = this.getLayerOfGroup(layerModel, this.groups.layers);
          updateLayerParams(layer, this.mapModel, layerModel, filtersModel, this.useDetailsDisplay,
          );
        }
      });
    });

    // setup map events
    this.map.on('pointerdrag', (...args) => this.onMapPointerDrag(...args));
    this.map.on('moveend', (...args) => this.onMapMoveEnd(...args));
    this.map.on('pointermove', _.throttle((...args) => this.onMapPointerMove(...args), 100));
    this.map.on('click', (...args) => this.onMapClick(...args));
    this.listenTo(this.mapModel, 'manual:filterFromConfig', this.filterFromConfig);
  }

  /**
   * Creates OpenLayers interactions and adds them to the map.
   *
   */
  setupControls() {
    const boxFunc = createBox();
    this.drawControls = {
      point: new Draw({ type: 'Point' }),
      line: new Draw({ type: 'LineString' }),
      polygon: new Draw({ type: 'Polygon' }),
      bbox: new Draw({
        type: 'Circle',
        geometryFunction(...args) {
          const box = boxFunc(...args);
          box.isBox = true;
          return box;
        }
      })
    };
    Object.keys(this.drawControls).forEach((key) => {
      const control = this.drawControls[key];
      control.on('drawend', (event) => {
        this.onDrawFinished(event);
      });
    });

    const $html = $(`
    <div class="popover top in" role="tooltip"
         style="width: 75px; height: 32px; top: -32px; left: -37px; z-index: unset">
      <div class="arrow" style="left: 50%;"></div>
      <div class="popover-content" style="padding: 3px;">
        <div class="btn-group" role="group">
          <button type="button" class="btn btn-default btn-xs deselect-feature">
            <i class="fa fa-minus-circle" aria-hidden="true"></i>
          </button>
          <button type="button" class="btn btn-default btn-xs select-feature">
            <i class="fa fa-plus-circle" aria-hidden="true"></i>
          </button>
          <button type="button" class="btn btn-default btn-xs feature-info">
            <i class="fa fa-info-circle" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>`);
    this.marker = new Overlay({
      positioning: 'top-center',
      element: $html[0],
      stopEvent: true,
    });
    this.map.addOverlay(this.marker);

    $html.find('.select-feature').on('click', () => {
      for (let i = 0; i < this.marker.searchRecords.length; ++i) {
        const [recordModel, searchModel] = this.marker.searchRecords[i];
        const downloadSelection = searchModel.get('downloadSelection');
        downloadSelection.add(recordModel);
      }
      this.hideOverlay();
    });

    $html.find('.deselect-feature').on('click', () => {
      for (let i = 0; i < this.marker.selectedRecords.length; ++i) {
        const [recordModel, searchModel] = this.marker.selectedRecords[i];
        const downloadSelection = searchModel.get('downloadSelection');
        downloadSelection.remove(recordModel.get('id'));
      }
      this.hideOverlay();
    });

    $html.find('.feature-info').on('click', () => {
      this.hideOverlay();
      this.onFeatureClicked(this.marker.infoRecords);
    });

    if (this.maxAreaFilter) {
      
      this.maxAreaExceedLabel = new Control({
        element: $(`
        <div class="eoxc-area-exceed-label">
             <div class="eoxc-area-exceed-content"></div>
        </div>`)[0],
      });
      this.map.addControl(this.maxAreaExceedLabel);
    }
  }

  filterFromConfig(type, coordinates) {
    let feature = null;
    if (type === 'Point' && coordinates.length === 2) {
      feature = new Feature({
        geometry: new Point(coordinates).transform(this.projection, 'EPSG:4326'),
      });
    } else if (type === 'Rectangle' && coordinates.length === 4) {
      const [minx, miny, maxx, maxy] = coordinates;
      const geometry = fromExtent([
        minx, miny, maxx > minx ? maxx : maxx + 360, maxy,
      ]).transform('EPSG:4326', this.projection);
      geometry.isBox = true;
      feature = new Feature({
        geometry
      });
    } else if (type === 'Polygon') {
      feature = new Feature({
        geometry: new Polygon(coordinates).transform(this.projection, 'EPSG:4326'),
      });
    } else {
      console.log(`Not implemented or unknown type: ${type}.`);
    }
    if (feature !== null) {
      this.onDrawFinished({ feature });
    }
  }

  filterFromSearchParams(area) {
    try {
      wkt.read(area);
    } catch (e) {
      return;
    }
    const geometryJson = wkt.toJson();
    const geometry = this.geoJSONFormat.readGeometry(geometryJson);
    const feature = new Feature({ geometry });
    this.onDrawFinished({ feature });
  }

  onDrawFinished(event) {
    this.mapModel.set('drawnArea', null);
    this.selectionSource.clear();
    let geom;
    let newGeom = null;
    const bounds = [-180, -90, 180, 90];
    const extent = transformExtent(event.feature.getGeometry().getExtent(), this.projection, 'EPSG:4326');
    if (event.feature.getGeometry().isBox) {
      geom = wrapToBounds(extent, bounds);
    } else {
      // it is a feature (point/polygon)
      geom = wrapToBounds(this.geoJSONFormat.writeFeatureObject(event.feature, this.readerOptions), bounds);
      if (this.constrainOutCoords) {
        // clip coordinates to CRS bounds
        [newGeom, geom] = featureCoordsToBounds(geom, bounds);
      }
    }

    // to avoid a zoom-in on a final double click
    setTimeout(() => this.mapModel.set({
      area: newGeom || geom,
      tool: null,
      drawnArea: newGeom ? geom : null,
    }));
  }

  // collection/model signal handlers

  onLayersSorted(layersCollection) {
    const layers = this.groups.layers.getLayers().getArray();
    this.groups.layers.setLayers(
      new Collection(sortLayers(layersCollection, layers))
    );
  }

  onLayerChange(layerModel, group) {
    const layer = this.getLayerOfGroup(layerModel, group);
    let filtersModel;
    if (layer.searchModel) {
      filtersModel = layer.searchModel.get('filtersModel');
    }
    updateLayerParams(layer, this.mapModel, layerModel, filtersModel, this.useDetailsDisplay);

    const display = this.useDetailsDisplay
      ? layerModel.get('detailsDisplay') || layerModel.get('display')
      : layerModel.get('display');

    const searchLayer = this.searchLayersGroup.getLayerById(layerModel.get('id'));
    let searchModel = null;
    if (searchLayer) {
      searchModel = searchLayer.searchModel;
    }

    if (searchLayer && searchModel) {
      searchLayer.setVisible((display.visible || this.singleLayerModeUsed) && searchModel.get('automaticSearch'));
    }
    const searchFillLayer = this.searchLayersFillGroup.getLayerById(layerModel.get('id'));
    if (searchFillLayer && searchModel) {
      searchFillLayer.setVisible((display.visible || this.singleLayerModeUsed) && searchModel.get('automaticSearch'));
    }
  }


  onTimeChange() {
    this.layersCollection.forEach((layerModel) => {
      this.applyLayerFilters(
        this.getLayerOfGroup(layerModel, this.groups.layers), this.mapModel, layerModel
      );
    }, this);
    this.baseLayersCollection.forEach((layerModel) => {
      if (layerModel.get('display.synchronizeTime')) {
        this.applyLayerFilters(
          this.getLayerOfGroup(layerModel, this.groups.baseLayers), this.mapModel, layerModel
        );
      }
    }, this);
    this.overlayLayersCollection.forEach((layerModel) => {
      if (layerModel.get('display.synchronizeTime')) {
        this.applyLayerFilters(
          this.getLayerOfGroup(layerModel, this.groups.overlayLayers), this.mapModel, layerModel
        );
      }
    }, this);
  }

  onMapAreaChange(mapModel) {
    this.selectionSource.clear();
    const area = mapModel.get('drawnArea') || mapModel.get('area');

    const format = new GeoJSON();

    if (area) {
      const [outer, inner] = createCutOut(
        area, format, this.filterFillColor, this.filterOutsideColor, this.filterStrokeColor, 1
      );
      if (outer) {
        outer.getGeometry().transform('EPSG:4326', this.projection);
        this.selectionSource.addFeature(outer);
      }
      if (inner) {
        inner.getGeometry().transform('EPSG:4326', this.projection);
        this.selectionSource.addFeature(inner);
        if (this.areaFilterLayerExtent) {
          // set extent of all layers to be same as area
          this.groups.layers.getLayers().forEach((l) => {
            l.setExtent(inner.getGeometry().getExtent());
          });
        }
      }
    } else if (this.areaFilterLayerExtent) {
      this.groups.layers.getLayers().forEach((l) => {
        l.setExtent(undefined);
      });
    }
    this.checkMaxAreaFilter();
  }

  onToolChange(mapModel) {
    const toolName = mapModel.get('tool');
    // deactivate all potentially activated tools
    Object.keys(this.drawControls).forEach(
      key => this.map.removeInteraction(this.drawControls[key])
    );
    // activate the requested tool if it is available
    if (this.drawControls.hasOwnProperty(toolName)) {
      this.map.addInteraction(this.drawControls[toolName]);
    }

    this.searchLayersGroup.setVisible(toolName === null);
    this.searchLayersFillGroup.setVisible(toolName === null);
  }

  onMapPointerDrag() {
    // TODO: check if the currently selected tool is the panning tool
    // TODO: improve this to allow
    this.isPanning = true;
  }

  onMapMoveEnd() {
    let bbox = transformExtent(this.map.getView().calculateExtent(this.map.getSize()), this.projection, 'EPSG:4326');
    // wrap minX and maxX to fit -180, 180
    bbox = wrapBox(bbox);

    this.mapModel.set({
      center: wrapCoordinate(transform(this.map.getView().getCenter(), this.projection, 'EPSG:4326')),
      zoom: this.map.getView().getZoom(),
      bbox,
    });
    this.isPanning = false;
    this.isZooming = false;
  }

  onMapPointerMove(event) {
    if (this.mapModel.get('tool')) {
      return;
    }
    if (!this.staticHighlight && !this.isOverlayShown()) {
      const wrappedCoordinate = wrapCoordinate(transform(event.coordinate, this.projection, 'EPSG:4326'));

      const rawFeatures = [-360, 0, 360].map((offset) => {
        const coordinate = [wrappedCoordinate[0] + offset, wrappedCoordinate[1]];
        const convertedCoordinate = transform(coordinate, 'EPSG:4326', this.projection);
        const features = this.searchLayersGroup.getLayers().getArray()
          .filter(layer => layer.getVisible())
          .map(layer => layer.getSource())
          .reduce((acc, source) => acc.concat(source.getFeaturesAtCoordinate(convertedCoordinate)), [])
          .concat(this.downloadSelectionLayerGroup.getLayers().getArray()
            .filter(layer => layer.getVisible())
            .map(layer => layer.getSource())
            .reduce((acc, source) => acc.concat(source.getFeaturesAtCoordinate(convertedCoordinate)), [])
          );

        return features.map((feature) => {
          const rawFeature = feature.model.toJSON();
          rawFeature.layerId = feature.searchModel.get('layerModel').get('id');
          return rawFeature;
        });
      })
      .reduce((acc, source) => acc.concat(source), []);

      this.highlightModel.highlight(rawFeatures);
    }
  }

  onMapClick(event) {
    if (this.mapModel.get('tool') || this.mapModel.get('noclick')) {
      return;
    }
    const coordinate = wrapCoordinate(transform(event.coordinate, this.projection, 'EPSG:4326'));

    const searchFeatures = [];
    const selectedFeatures = [];
    let sortedSearchFeatures = [];
    let sortedSelectedFeatures = [];
    [-360, 0, 360].forEach((offset) => {
      const offsetCoordinate = [coordinate[0] + offset, coordinate[1]];
      const convertedCoordinate = transform(offsetCoordinate, 'EPSG:4326', this.projection);

      this.searchLayersGroup.getLayers().getArray()
        .filter(layer => layer.getVisible())
        .map(layer => layer.getSource())
        .reduce((acc, source) => acc.concat(source.getFeaturesAtCoordinate(convertedCoordinate)), [])
        .forEach(feature => searchFeatures.indexOf(feature) === -1 ? searchFeatures.push(feature) : null);

      this.downloadSelectionLayerGroup.getLayers().getArray()
        .map(layer => layer.getSource())
        .reduce((acc, source) => acc.concat(source.getFeaturesAtCoordinate(convertedCoordinate)), [])
        .forEach(feature => selectedFeatures.indexOf(feature) === -1 ? selectedFeatures.push(feature) : null);
    });

    // sorting by model cid to maintain order of search items in which they came from the catalog
    sortedSearchFeatures = searchFeatures.slice().sort(this.sortByModelId);
    sortedSelectedFeatures = selectedFeatures.slice().sort(this.sortByModelId);
    this.highlightModel.highlight(sortedSearchFeatures.map(feature => feature.model));
    this.showOverlay(event.coordinate, sortedSearchFeatures, sortedSelectedFeatures);
  }

  /* helper to create OL features */
  createMapFeatures(models, searchModel) {
    if (!models) {
      return [];
    }
    const actualModels = models.map ? models : [models];

    return actualModels
      .map((model) => {
        if (model) {
          let geometry = null;
          if (model.geometry || (model.get && model.get('geometry'))) {
            geometry = this.geoJSONFormat.readGeometry(model.geometry || model.get('geometry'), this.readerOptions);
          } else if (model.bbox || (model.get && model.get('bbox'))) {
            geometry = this.geoJSONFormat.readGeometry(fromExtent(model.bbox || model.get('bbox')), this.readerOptions);
          }

          if (geometry) {
            const olFeature = new Feature();
            olFeature.setGeometry(geometry);
            olFeature.model = model;
            olFeature.searchModel = searchModel;
            olFeature.setId(model.get ? model.get('id') : model.id);
            return olFeature;
          }
        }
        return null;
      })
      .filter(olFeature => olFeature);
  }

  showOverlay(coordinate, searchFeatures, selectedFeatures) {
    if (searchFeatures.length || selectedFeatures.length) {
      const searchRecords = searchFeatures.map(f => [f.model, f.searchModel]);
      this.marker.searchRecords = searchRecords.filter(([recordModel, searchModel]) => isRecordDownloadable(searchModel.get('layerModel'), recordModel));
      this.marker.selectedRecords = selectedFeatures.map(f => [f.model, f.searchModel]);
      this.marker.infoRecords = uniqueBy(
        searchRecords.concat(this.marker.selectedRecords),
        (a, b) => a[0].get('id') === b[0].get('id') && a[1] === b[1]
      );
      this.marker.visible = true;
      this.marker.setPosition(coordinate);

      const $elem = $(this.marker.getElement());
      if (selectedFeatures.length) {
        $elem.find('.deselect-feature').removeAttr('disabled');
      } else {
        $elem.find('.deselect-feature').attr('disabled', 'disabled');
      }

      const unselected = this.marker.searchRecords.filter(([record, searchModel]) => (
        !this.marker.selectedRecords.find(([r2, s2]) => (
          record.get('id') === r2.get('id')
          && searchModel === s2
        ))
      ));

      if (unselected.length) {
        $elem.find('.select-feature').removeAttr('disabled');
      } else {
        $elem.find('.select-feature').attr('disabled', 'disabled');
      }

      $elem.show();
    } else {
      this.hideOverlay();
    }
  }

  sortByModelId(a, b) {
    // sorts array by model cid ascending
    if (typeof a.model !== 'undefined' && typeof b.model !== 'undefined') {
      const cidA = parseInt(a.model.cid.slice(1, a.model.cid.length), 10);
      const cidB = parseInt(b.model.cid.slice(1, b.model.cid.length), 10);
      return cidA - cidB;
    }
    return a - b;
  }

  hideOverlay() {
    this.marker.visible = false;
    $(this.marker.getElement()).hide();
  }

  isOverlayShown() {
    return this.marker.visible;
  }

  checkMaxAreaFilter() {
    // compares area filter or map bbox size on sphere with max allowed and either shows or hide label
    if (this.maxAreaFilter) {
      let geometry = null;
      const area = this.mapModel.get('drawnArea') || this.mapModel.get('area');
      if (area && Array.isArray(area)) {
        geometry = fromExtent(area);
      } else if (area) {
        geometry = this.geoJSONFormat.readGeometry(area.geometry, this.readerOptions);
      } else {
        geometry = fromExtent(this.mapModel.get('bbox'));
      }
      const areaSize = getArea(geometry, {
        projection: 'EPSG:4326',
      }) / 1000000; // in km2
      if (areaSize > this.maxAreaFilter) {
        this.setMaxAreaWarning(areaSize);
      } else {
        $(this.maxAreaExceedLabel.element).hide();
      }
    }
  }

  setMaxAreaWarning(current) {
    const el = $(this.maxAreaExceedLabel.element);
    const inner = el.find('.eoxc-area-exceed-content');
    inner.html(i18next.t('max_area_filter_exceed', {
      maxArea: numberThousandSep(this.maxAreaFilter, ' '),
      userArea: numberThousandSep(Math.floor(current), ' '),
      ratio: Math.round((current / this.maxAreaFilter) * 100) / 100,
    }));
    el.show();
  }

  onDestroy() {
    // TODO: necessary?
  }

  onResize() {
    this.map.updateSize();
  }

  onExportWmsurl(layerModel, useDetailsDisplay = false, wmtsTrimString = '/wmts') {
    // if able, for a given layer returns current map view as a single WMS link with same url
    const baseWmsParams = {
      SERVICE: 'WMS',
      REQUEST: 'GetMap',
      VERSION: '1.1.1',
      TRANSPARENT: true,
    };
    const displayParams = useDetailsDisplay
      ? layerModel.get('detailsDisplay') || layerModel.get('display')
      : layerModel.get('display');
    let url = typeof displayParams.urls !== 'undefined' ? displayParams.urls[0] : displayParams.url;
    // use layer projection or map projection if not set
    const layerProjection = displayParams.projection || this.projection.getCode();
    const format = displayParams.format || 'image/png';
    // get map layer corresponding to layerModel
    const mapLayer = this.getLayerOfGroup(layerModel, this.groups.layers);
    const source = mapLayer.getSource();

    let previousParams = {};
    let previousDimension = {};

    if (source.getParams) {
      // WMSTileSource
      previousParams = source.getParams();
    }
    if (source.getDimensions) {
      // WMTS Source time dimension
      previousDimension = source.getDimensions();
      previousParams.LAYERS = source.getLayer();
      // trim part of path usually used by wmts interface
      url = url.replace(wmtsTrimString, '');
    }

    const params = Object.assign(
      previousParams, baseWmsParams, previousDimension);
    const mapSizePx = this.map.getSize();
    let bbox = transformExtent(this.map.getView().calculateExtent(mapSizePx), this.projection, layerProjection);
    bbox = wrapBox(bbox);

    params.FORMAT = format;
    params.SRS = layerProjection;
    params.WIDTH = mapSizePx[0];
    params.HEIGHT = mapSizePx[1];
    params.BBOX = bbox.join(',');
    const urlWithParams = appendParams(url, params);
    return urlWithParams;
  }

}

OpenLayersMapView.prototype.template = () => '';

OpenLayersMapView.prototype.events = {
  resize: 'onResize',
};

export default OpenLayersMapView;
