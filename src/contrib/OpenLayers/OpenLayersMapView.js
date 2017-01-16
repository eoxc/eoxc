import { Model } from 'backbone';
import Marionette from 'backbone.marionette';
import ol from 'openlayers';
import $ from 'jquery';

import { getISODateTimeString } from '../../core/util';
import { createMap, createVectorLayer } from './utils';

import 'openlayers/dist/ol.css';

const Collection = ol.Collection;
const Group = ol.layer.Group;
const getProjection = ol.proj.get;
const getExtentWidth = ol.extent.getWidth;
const getExtentTopLeft = ol.extent.getTopLeft;

const WMTSSource = ol.source.WMTS;
const WMSTileSource = ol.source.TileWMS;
const WMTSTileGrid = ol.tilegrid.WMTS;
const TileLayer = ol.layer.Tile;
const Attribution = ol.Attribution;

const GeoJSON = ol.format.GeoJSON;

const Draw = ol.interaction.Draw;

const Polygon = ol.geom.Polygon;
const Feature = ol.Feature;


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

    this.staticHighlight = options.staticHighlight;

    this.map = undefined;

    this.isPanning = false;
    this.isZooming = false;

    this.onFeatureClicked = options.onFeatureClicked;
  }

  onRender() {
    this.createMap();
    return this;
  }

  onAttach() {
    if (this.map) {
      this.map.setTarget(this.el);
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
      // 'min-height': '100%',
      // 'background-color': 'red',
      // position: 'absolute',
    });

    // create the map object
    this.map = createMap(
      this.mapModel.get('center') || [0, 0],
      this.mapModel.get('zoom') || 2,
      options.mapRenderer || 'canvas'
    );

    // create layer groups for base, normal and overlay layers

    const createGroupForCollection = (collection) => {
      const group = new Group({
        layers: collection.map(layerModel => this.createLayer(layerModel)),
      });
      this.map.addLayer(group);
      return group;
    };

    this.groups = {
      baseLayers: createGroupForCollection(this.baseLayersCollection),
      layers: createGroupForCollection(this.layersCollection),
      overlayLayers: createGroupForCollection(this.overlayLayersCollection),
    };

    this.groups.layers.getLayers().forEach((layer) => {
      this.applyLayerFilters(layer, this.filtersModel);
    }, this);

    // create layer to display footprints of search results
    const searchLayer = createVectorLayer('rgba(255, 255, 255, 0.2)', '#cccccc');
    this.searchSource = searchLayer.getSource();
    this.map.addLayer(searchLayer);

    // create layer to display footprints of download selection
    const downloadSelectionLayer = createVectorLayer('rgba(255, 0, 0, 0.2)', '#ff0000');
    this.downloadSelectionSource = downloadSelectionLayer.getSource();
    this.map.addLayer(downloadSelectionLayer);

    // create layer for highlighting features
    const highlightLayer = createVectorLayer(
      this.highlightFillColor || 'rgba(255, 255, 255, 0.2)',
      this.highlightStrokeColor || '#cccccc'
    );
    this.highlightSource = highlightLayer.getSource();
    this.map.addLayer(highlightLayer);

    const selectionLayer = createVectorLayer('rgba(255, 255, 255, 0.2)', '#ffcc33', 2, 7);
    this.selectionSource = selectionLayer.getSource();
    this.map.addLayer(selectionLayer);

    this.onHighlightChange(this.highlightModel);

    // attach to signals of the collections
    this.setupEvents();
    this.setupControls();

    return this;
  }

  /**
   * Creates an OpenLayers layer from a given LayerModel.
   *
   * @param {core/models.LayerModel} layerModel The layerModel to create a layer for.
   * @returns {ol.Layer} The OpenLayers layer object
   */
  createLayer(layerModel) {
    const params = layerModel.get('display');
    let layer;

    const projection = getProjection('EPSG:4326');
    const projectionExtent = projection.getExtent();
    const size = getExtentWidth(projectionExtent) / 256;
    const resolutions = new Array(18);
    const matrixIds = new Array(18);

    for (let z = 0; z < 18; ++z) {
      // generate resolutions and matrixIds arrays for this WMTS
      resolutions[z] = size / Math.pow(2, z + 1);
      let id = z;

      if (params.matrixIdPrefix) {
        id = params.matrixIdPrefix + id;
      }
      if (params.matrixIdPostfix) {
        id = id + params.matrixIdPostfix;
      }
      matrixIds[z] = id;
    }

    switch (params.protocol) {
      case 'WMTS':
        layer = new TileLayer({
          visible: params.visible,
          source: new WMTSSource({
            urls: (params.url) ? [params.url] : params.urls,
            layer: params.id,
            matrixSet: params.matrixSet,
            format: params.format,
            projection: params.projection,
            tileGrid: new WMTSTileGrid({
              origin: getExtentTopLeft(projectionExtent),
              resolutions,
              matrixIds,
            }),
            style: params.style,
            attributions: [
              new Attribution({
                html: params.attribution,
              }),
            ],
            wrapX: true,
            dimensions: {
              time: '',
            }
          }),
        });
        break;
      case 'WMS':
        layer = new TileLayer({
          visible: params.visible,
          source: new WMSTileSource({
            crossOrigin: 'anonymous',
            params: {
              LAYERS: params.id,
              VERSION: '1.1.0',
              FORMAT: params.format, // TODO: use format here?
            },
            url: params.url || params.urls[0],
            wrapX: true,
            attributions: [
              new Attribution({
                html: params.attribution,
              }),
            ],
          }),
        });
        break;
      default:
        throw new Error('Unsupported view protocol');
    }
    layer.id = layerModel.get('id');
    return layer;
  }

  applyLayerFilters(layer, filtersModel) {
    const time = filtersModel.get('time');
    const isoTime = (time !== null) ?
        `${getISODateTimeString(time[0])}/${getISODateTimeString(time[1])}` : null;

    const source = layer.getSource();
    if (source instanceof WMSTileSource) {
      const params = source.getParams();
      if (isoTime !== null) {
        params.time = isoTime;
      } else {
        delete params.time;
      }
      source.updateParams(params);
    } else if (source instanceof WMTSSource) {
      source.updateDimensions({ time: isoTime });
    }
    // Workaround to make sure tiles are reloaded when parameters change
    source.setTileLoadFunction(source.getTileLoadFunction());
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
    group.getLayers().forEach(layer => {
      if (layer.id === id) {
        foundLayer = layer;
      }
    });
    return foundLayer;
  }

  /**
   * Set up all events from the layer collections
   *
   */

  setupEvents() {
    // setup collection signals
    this.listenTo(this.layersCollection, 'add', (layerModel) =>
      this.addLayer(layerModel, this.groups.layers)
    );
    this.listenTo(this.layersCollection, 'change', (layerModel) =>
      this.onLayerChange(layerModel, this.groups.layers)
    );
    this.listenTo(this.layersCollection, 'remove', (layerModel) =>
      this.removeLayer(layerModel, this.groups.layers)
    );
    this.listenTo(this.layersCollection, 'sort', (layers) => this.onLayersSorted(layers));

    this.listenTo(this.baseLayersCollection, 'add', (layerModel) =>
      this.addLayer(layerModel, this.groups.baseLayers)
    );
    this.listenTo(this.baseLayersCollection, 'change', (layerModel) =>
      this.onLayerChange(layerModel, this.groups.baseLayers)
    );
    this.listenTo(this.baseLayersCollection, 'remove', (layerModel) =>
      this.removeLayer(layerModel, this.groups.baseLayers)
    );

    this.listenTo(this.overlayLayersCollection, 'add', (layerModel) =>
      this.addLayer(layerModel, this.groups.overlayLayers)
    );
    this.listenTo(this.overlayLayersCollection, 'change', (layerModel) =>
      this.onLayerChange(layerModel, this.groups.overlayLayers)
    );
    this.listenTo(this.overlayLayersCollection, 'remove', (layerModel) =>
      this.removeLayer(layerModel, this.groups.overlayLayers)
    );

    // setup mapModel signals

    // directly tie the changes to the map
    this.listenTo(this.mapModel, 'change:center', (mapModel) => {
      if (!this.isPanning) {
        this.map.getView().setCenter(mapModel.get('center'));
      }
    });
    this.listenTo(this.mapModel, 'change:zoom', (mapModel) => {
      if (!this.isZooming) {
        this.map.getView().setZoom(mapModel.get('zoom'));
      }
    });

    this.listenTo(this.mapModel, 'change:roll', (mapModel) => {
      this.map.getView().setRotation(mapModel.get('roll'));
    });

    this.listenTo(this.mapModel, 'change:tool', this.onToolChange);

    this.listenTo(this.highlightModel, 'change:highlightFeature', this.onHighlightChange);

    this.listenTo(this.mapModel, 'show', (feature) => {
      let geometry = null;
      if (feature.bbox) {
        geometry = feature.bbox;
      } else if (Array.isArray(feature)) {
        geometry = Polygon.fromExtent([
          feature[0], feature[1], feature[2], feature[3],
        ]);
      } else {
        const format = new GeoJSON();
        if (feature.geometry.type === 'Point') {
          const c = feature.geometry.coordinates;
          const b = 0.5;
          geometry = [c[0] - b, c[1] - b, c[0] + b, c[1] + b];
        } else {
          geometry = format.readGeometry(feature.geometry);
        }
      }
      this.map.getView().fit(geometry, this.map.getSize(), { duration: 250 });
    });

    if (this.searchCollection) {
      this.searchCollection.forEach(searchModel => {
        // TODO: merge from different layers
        this.listenTo(searchModel.get('results'), 'reset', () => {
          this.searchSource.clear();
          const olFeatures = this.createMapFeatures(searchModel.get('results'), searchModel);
          this.searchSource.addFeatures(olFeatures);
        });

        this.listenTo(searchModel.get('results'), 'add', (model) => {
          const olFeatures = this.createMapFeatures(model, searchModel);
          this.searchSource.addFeatures(olFeatures);
        });

        // TODO: merge from different layers
        this.listenTo(searchModel.get('downloadSelection'), 'reset remove', () => {
          this.downloadSelectionSource.clear();
          const olFeatures = this.createMapFeatures(searchModel.get('downloadSelection'), searchModel);
          this.downloadSelectionSource.addFeatures(olFeatures);
        });

        this.listenTo(searchModel.get('downloadSelection'), 'add', (model) => {
          const olFeatures = this.createMapFeatures(model, searchModel);
          this.downloadSelectionSource.addFeatures(olFeatures);
        });
      });
    }

    // setup filters signals

    this.listenTo(this.filtersModel, 'change:time', this.onFiltersTimeChange);
    this.listenTo(this.filtersModel, 'change:area', this.onFiltersAreaChange);

    // setup map events

    const self = this;
    this.map.on('pointerdrag', () => {
      // TODO: check if the currently selected tool is the panning tool
      // TODO: improve this to allow
      self.isPanning = true;
    });

    this.map.on('moveend', () => {
      let bbox = self.map.getView().calculateExtent(self.map.getSize());
      // wrap minX and maxX to fit -180, 180
      bbox = wrapBox(bbox);

      self.mapModel.set({
        center: self.map.getView().getCenter(),
        zoom: self.map.getView().getZoom(),
        bbox,
      });
      self.isPanning = false;
      self.isZooming = false;
    });

    this.map.on('pointermove', (event) => {
      if (this.mapModel.get('tool')) {
        return;
      }
      if (!this.staticHighlight) {
        const coordinate = wrapCoordinate(event.coordinate);
        const features = this.searchSource.getFeaturesAtCoordinate(coordinate);
        this.highlightModel.highlight(features.map(feature => feature.model));
      }
    });

    this.map.on('click', (event) => {
      if (this.mapModel.get('tool')) {
        return;
      }
      // if (!this.searchCollection) {
      //   return;
      // }
      // const toAdd = this.searchSource.getFeaturesAtCoordinate(event.coordinate);
      // const toRemove = this.downloadSelectionSource.getFeaturesAtCoordinate(event.coordinate);
      // const downloadSelection = this.searchCollection.at(0).get('downloadSelection');
      // if (toRemove.length) {
      //   for (let i = 0; i < toRemove.length; ++i) {
      //     downloadSelection.remove(toRemove[i].orig.id);
      //   }
      // } else {
      //   for (let i = 0; i < toAdd.length; ++i) {
      //     downloadSelection.add(toAdd[i].orig);
      //   }
      // }
      const coordinate = wrapCoordinate(event.coordinate);
      const records = this.searchSource.getFeaturesAtCoordinate(coordinate)
        .map(feature => [feature.model, feature.searchModel]);
      if (records.length && this.onFeatureClicked) {
        this.onFeatureClicked(records);
      }
    });
  }

  /**
   * Creates OpenLayers interactions and adds them to the map.
   *
   */
  setupControls() {
    this.drawControls = {
      point: new Draw({ source: this.selectionSource, type: 'Point' }),
      line: new Draw({ source: this.selectionSource, type: 'LineString' }),
      polygon: new Draw({ source: this.selectionSource, type: 'Polygon' }),
      bbox: new Draw({
        source: this.selectionSource,
        type: 'LineString',
        geometryFunction: (coordinates, geometry) => {
          const geom = geometry || new Polygon(null);
          const start = coordinates[0];
          const end = coordinates[1];
          geom.setCoordinates([
            [start, [start[0], end[1]], end, [end[0], start[1]], start],
          ]);
          geom.isBox = true;
          return geom;
        },
        maxPoints: 2,
      }),
    };

    // this.drawControls.bbox.on('boxstart', (evt) => {
    //   this.drawControls.bbox.boxstart = evt.coordinate;
    // }, this);
    //
    // this.drawControls.bbox.on('boxend', (evt) => {
    //   this.selectionSource.clear();
    //   const boxend = evt.coordinate;
    //   const boxstart = this.drawControls.bbox.boxstart;
    //   this.filtersModel.set('area', [
    //     boxstart[0], boxstart[1], boxend[0], boxend[1],
    //   ]);
    //   setTimeout(() => this.mapModel.set('tool', null));
    // }, this);

    const format = new GeoJSON();
    for (let key in this.drawControls) {
      if (this.drawControls.hasOwnProperty(key)) {
        const control = this.drawControls[key];
        control.on('drawend', (event) => {
          this.selectionSource.clear();
          let geom;
          if (event.feature.getGeometry().isBox) {
            geom = event.feature.getGeometry().getExtent();
          } else {
            geom = format.writeFeatureObject(event.feature);
          }
          this.filtersModel.set('area', geom);
          // to avoid a zoom-in on a final double click
          setTimeout(() => this.mapModel.set('tool', null));
        });
      }
    }
  }


  // collection/model signal handlers

  onLayersSorted(layersCollection) {
    const ids = layersCollection.pluck('id');
    const layers = this.groups.layers.getLayers();

    this.groups.layers.setLayers(
      new Collection(layers.getArray().sort((layer) => ids.indexOf(layer.id)))
    );
  }

  onLayerChange(layerModel, group) {
    const layer = this.getLayerOfGroup(layerModel, group);
    if (layerModel.hasChanged('display')) {
      const display = layerModel.get('display');
      layer.setVisible(display.visible);
      layer.setOpacity(display.opacity);
    }
  }

  onFiltersTimeChange(filtersModel) {
    this.layersCollection.forEach((layerModel) => {
      this.applyLayerFilters(this.getLayerOfGroup(layerModel, this.groups.layers), filtersModel);
    }, this);
  }

  onFiltersAreaChange(filtersModel) {
    this.selectionSource.clear();
    const area = filtersModel.get('area');
    let feature = null;

    if (Array.isArray(area)) {
      const polygon = Polygon.fromExtent([
        area[0], area[1], area[2], area[3],
      ]);
      feature = new Feature();
      feature.setGeometry(polygon);
    } else if (area && typeof area === 'object') {
      const format = new GeoJSON();
      feature = format.readFeature(area);
    }
    if (feature) {
      this.selectionSource.addFeature(feature);
    }
  }

  onToolChange(mapModel) {
    const toolName = mapModel.get('tool');
    // deactivate all potentially activated tools
    for (const key in this.drawControls) {
      if (this.drawControls.hasOwnProperty(key)) {
        this.map.removeInteraction(this.drawControls[key]);
      }
    }
    // activate the requested tool if it is available
    if (this.drawControls.hasOwnProperty(toolName)) {
      this.map.addInteraction(this.drawControls[toolName]);
    }
  }

  onHighlightChange(highlightModel) {
    this.highlightSource.clear();
    const features = highlightModel.get('highlightFeature');
    this.highlightSource.addFeatures(this.createMapFeatures(features));
  }

  /* helper to create OL features */
  createMapFeatures(models, searchModel) {
    if (!models) {
      return [];
    }
    const actualModels = models.map ? models : [models];

    const format = new GeoJSON();
    return actualModels
      .map(model => {
        if (model) {
          let geometry = null;
          if (model.geometry || model.get('geometry')) {
            geometry = format.readGeometry(model.geometry || model.get('geometry'));
          } else if (model.bbox || model.get('bbox')) {
            geometry = Polygon.fromExtent(model.bbox || model.get('bbox'));
          }

          if (geometry) {
            const olFeature = new Feature();
            olFeature.setGeometry(geometry);
            olFeature.model = model;
            olFeature.searchModel = searchModel;
            return olFeature;
          }
        }
        return null;
      })
      .filter(olFeature => olFeature);
  }

  onDestroy() {
    // TODO: necessary?
  }

  onResize() {
    this.map.updateSize();
  }
}

OpenLayersMapView.prototype.template = () => '';

OpenLayersMapView.prototype.events = {
  resize: 'onResize',
};

export default OpenLayersMapView;
