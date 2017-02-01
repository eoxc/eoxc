import Marionette from 'backbone.marionette';
import ol from 'openlayers';
import $ from 'jquery';
import 'openlayers/dist/ol.css';

import { getISODateTimeString } from '../../core/util';
import { createMap, createVectorLayer, createCollectionVectorLayer, createCutOut } from './utils';

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
      this.applyLayerFilters(layer, this.mapModel, this.filtersModel);
    }, this);

    const selectionLayer = createVectorLayer('rgba(255, 255, 255, 0.0)', '#ffcc33', 2, 7);
    this.selectionSource = selectionLayer.getSource();
    this.map.addLayer(selectionLayer);

    const searchCollection = this.searchCollection || [];
    // create layer group to display footprints of search results
    this.searchLayersGroup = new GroupById({
      layers: searchCollection.map((searchModel) => {
        const searchLayer = createCollectionVectorLayer(
          searchModel.get('results'), searchModel,
          this.footprintFillColor, this.footprintStrokeColor
        );
        searchLayer.id = searchModel.get('layerModel').get('id');
        return searchLayer;
      }),
    });
    this.map.addLayer(this.searchLayersGroup);

    // create layer group to display footprints of download selection
    this.downloadSelectionLayerGroup = new GroupById({
      layers: searchCollection.map((searchModel) => {
        const downloadSelectionLayer = createCollectionVectorLayer(
          searchModel.get('downloadSelection'), searchModel,
          this.selectedFootprintFillColor, this.selectedFootprintStrokeColor
        );
        downloadSelectionLayer.id = searchModel.get('layerModel').get('id');
        return downloadSelectionLayer;
      })
    });
    this.map.addLayer(this.downloadSelectionLayerGroup);

    // create layer for highlighting features
    const highlightLayer = createVectorLayer(
      this.highlightFillColor || 'rgba(255, 255, 255, 0.2)',
      this.highlightStrokeColor || '#cccccc',
      this.highlightStrokeWidth
    );
    this.highlightSource = highlightLayer.getSource();
    this.map.addLayer(highlightLayer);

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
        id += params.matrixIdPostfix;
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

  applyLayerFilters(layer, mapModel) {
    const time = mapModel.get('time');
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
    group.getLayers().forEach((layer) => {
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

    this.listenTo(this.mapModel, 'change:time', this.onTimeChange);
    this.listenTo(this.mapModel, 'change:tool', this.onToolChange);

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

    this.listenTo(this.highlightModel, 'change:highlightFeature', this.onHighlightChange);

    // setup filters signals
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
      if (!this.staticHighlight && !this.isOverlayShown()) {
        const coordinate = wrapCoordinate(event.coordinate);
        const models = this.searchLayersGroup.getLayers().getArray()
          .map(layer => layer.getSource())
          .reduce((acc, source) => acc.concat(source.getFeaturesAtCoordinate(coordinate)), [])
          .map(feature => feature.model);

        this.highlightModel.highlight(models);
      }
    });

    this.map.on('click', (event) => {
      if (this.mapModel.get('tool')) {
        return;
      }
      const coordinate = wrapCoordinate(event.coordinate);
      const searchFeatures = this.searchLayersGroup.getLayers().getArray()
        .map(layer => layer.getSource())
        .reduce((acc, source) => acc.concat(source.getFeaturesAtCoordinate(coordinate)), []);
      const selectedFeatures = this.downloadSelectionLayerGroup.getLayers().getArray()
        .map(layer => layer.getSource())
        .reduce((acc, source) => acc.concat(source.getFeaturesAtCoordinate(coordinate)), []);
      this.highlightModel.highlight(searchFeatures.map(feature => feature.model));
      this.showOverlay(coordinate, searchFeatures, selectedFeatures);
    });
  }

  /**
   * Creates OpenLayers interactions and adds them to the map.
   *
   */
  setupControls() {
    this.drawControls = {
      point: new Draw({ type: 'Point' }),
      line: new Draw({ type: 'LineString' }),
      polygon: new Draw({ type: 'Polygon' }),
      bbox: new Draw({
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
    const format = new GeoJSON();
    Object.keys(this.drawControls).forEach((key) => {
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
    });

    const $html = $(`
    <div class="popover top in" role="tooltip"
         style="width: 75px; height: 32px; top: -32px; left: -37px; z-index: unset">
      <div class="arrow" style="left: 50%;"></div>
      <div class="popover-content" style="padding: 3px;">
        <div class="btn-group" role="group">
          <button type="button" class="btn btn-default btn-xs deselect-feature">
            <i class="fa fa-square-o" aria-hidden="true"></i>
          </button>
          <button type="button" class="btn btn-default btn-xs select-feature">
            <i class="fa fa-check-square-o" aria-hidden="true"></i>
          </button>
          <button type="button" class="btn btn-default btn-xs feature-info">
            <i class="fa fa-info-circle" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>`);
    this.marker = new ol.Overlay({
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
      this.onFeatureClicked(this.marker.searchRecords);
    });
  }

  // collection/model signal handlers

  onLayersSorted(layersCollection) {
    const ids = layersCollection.pluck('id');
    const layers = this.groups.layers.getLayers();

    this.groups.layers.setLayers(
      new Collection(layers.getArray().sort(layer => ids.indexOf(layer.id)))
    );
  }

  onLayerChange(layerModel, group) {
    const layer = this.getLayerOfGroup(layerModel, group);
    if (layerModel.hasChanged('display')) {
      const display = layerModel.get('display');
      layer.setVisible(display.visible);
      layer.setOpacity(display.opacity);
      const searchLayer = this.searchLayersGroup.getLayerById(layerModel.get('id'));
      if (searchLayer) {
        searchLayer.setVisible(display.visible);
      }
    }
  }

  onTimeChange() {
    this.layersCollection.forEach((layerModel) => {
      this.applyLayerFilters(
        this.getLayerOfGroup(layerModel, this.groups.layers), this.mapModel
      );
    }, this);
  }

  onFiltersAreaChange(filtersModel) {
    this.selectionSource.clear();
    const area = filtersModel.get('area');

    const format = new GeoJSON();

    if (area) {
      const [outer, inner] = createCutOut(
        area, format, this.filterFillColor, this.filterOutsideColor, this.filterStrokeColor, 1
      );
      if (outer) {
        this.selectionSource.addFeature(outer);
      }
      if (inner) {
        this.selectionSource.addFeature(inner);
      }
    }
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
      .map((model) => {
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

  showOverlay(coordinate, searchFeatures, selectedFeatures) {
    if (searchFeatures.length || selectedFeatures.length) {
      this.marker.searchRecords = searchFeatures.map(f => [f.model, f.searchModel]);
      this.marker.selectedRecords = selectedFeatures.map(f => [f.model, f.searchModel]);
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

  hideOverlay() {
    this.marker.visible = false;
    $(this.marker.getElement()).hide();
  }

  isOverlayShown() {
    return this.marker.visible;
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
