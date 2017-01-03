import Marionette from 'backbone.marionette';
import ol from 'openlayers';
import $ from 'jquery';

import { getISODateTimeString } from '../../core/util';

require('openlayers/dist/ol.css');

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

    this.map = undefined;

    this.isPanning = false;
    this.isZooming = false;
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
    this.map = new ol.Map({
      controls: [
        new ol.control.Attribution,
        new ol.control.Zoom,
        // new ol.control.MousePosition({
        //   coordinateFormat: ol.coordinate.createStringXY(4),
        //   projection: 'EPSG:4326',
        //   undefinedHTML: '&nbsp;',
        // }),
      ],
      renderer: options.mapRenderer || 'canvas',
      view: new ol.View({
        projection: ol.proj.get('EPSG:4326'),
        center: this.mapModel.get('center') || [0, 0],
        zoom: this.mapModel.get('zoom') || 2,
        enableRotation: false,
      }),
      logo: false,
    });

    // create layer groups for base, normal and overlay layers

    const createGroupForCollection = (collection) => {
      const group = new ol.layer.Group({
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

    this.selectionSource = new ol.source.Vector();

    const selectionStyle = new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.2)',
      }),
      stroke: new ol.style.Stroke({
        color: '#ffcc33',
        width: 2,
      }),
      image: new ol.style.Circle({
        radius: 7,
        fill: new ol.style.Fill({
          color: '#ffcc33',
        }),
      }),
    });

    const selectionLayer = new ol.layer.Vector({
      source: this.selectionSource,
      style: selectionStyle,
    });

    // create layer to display footprints of search results

    const searchStyle = new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.2)',
      }),
      stroke: new ol.style.Stroke({
        color: '#cccccc',
        width: 1,
      }),
    });

    this.searchSource = new ol.source.Vector();

    const searchLayer = new ol.layer.Vector({
      source: this.searchSource,
      style: searchStyle,
    });

    this.map.addLayer(searchLayer);

    // create layer for highlighting features

    const highlightStyle = new ol.style.Style({
      fill: new ol.style.Fill({
        color: this.highlightFillColor || 'rgba(255, 255, 255, 0.2)',
      }),
      stroke: new ol.style.Stroke({
        color: this.highlightStrokeColor || '#cccccc',
        width: 1,
      }),
    });

    this.highlightSource = new ol.source.Vector();

    const highlightLayer = new ol.layer.Vector({
      source: this.highlightSource,
      style: highlightStyle,
    });

    this.map.addLayer(highlightLayer);
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

    const projection = ol.proj.get('EPSG:4326');
    const projectionExtent = projection.getExtent();
    const size = ol.extent.getWidth(projectionExtent) / 256;
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
        layer = new ol.layer.Tile({
          visible: params.visible,
          source: new ol.source.WMTS({
            urls: (params.url) ? [params.url] : params.urls,
            layer: params.id,
            matrixSet: params.matrixSet,
            format: params.format,
            projection: params.projection,
            tileGrid: new ol.tilegrid.WMTS({
              origin: ol.extent.getTopLeft(projectionExtent),
              resolutions,
              matrixIds,
            }),
            style: params.style,
            attributions: [
              new ol.Attribution({
                html: params.attribution,
              }),
            ],
            wrapX: true,
          }),
        });
        break;
      case 'WMS':
        layer = new ol.layer.Tile({
          visible: params.visible,
          source: new ol.source.TileWMS({
            crossOrigin: 'anonymous',
            params: {
              LAYERS: params.id,
              VERSION: '1.1.0',
              FORMAT: params.format, // TODO: use format here?
            },
            url: params.url || params.urls[0],
            wrapX: true,
            attributions: [
              new ol.Attribution({
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
    const params = source.getParams();
    if (isoTime !== null) {
      params.time = isoTime;
    } else {
      delete params.time;
    }
    source.updateParams(params);

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
      } else {
        const format = new ol.format.GeoJSON();
        geometry = format.readGeometry(feature.geometry);
      }
      this.map.getView().fit(geometry, this.map.getSize(), { duration: 250 });
    });

    this.searchCollection.forEach(searchModel => {
      this.listenTo(searchModel.get('results'), 'reset', () => {
        this.searchSource.clear();
        const olFeatures = this.createMapFeatures(searchModel.get('results').toJSON());
        this.searchSource.addFeatures(olFeatures);
      });
    });

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
      const bbox = self.map.getView().calculateExtent(self.map.getSize());
      // wrap minX and maxX to fit -180, 180
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

      self.mapModel.set({
        center: self.map.getView().getCenter(),
        zoom: self.map.getView().getZoom(),
        bbox,
      });
      self.isPanning = false;
      self.isZooming = false;
    });

    this.map.on('pointermove', (event) => {
      const features = this.searchSource.getFeaturesAtCoordinate(event.coordinate);
      this.highlightModel.highlight(features.map(feature => feature.orig));
    });
  }

  /**
   * Creates OpenLayers interactions and adds them to the map.
   *
   */
  setupControls() {
    this.drawControls = {
      point: new ol.interaction.Draw({ source: this.selectionSource, type: 'Point' }),
      line: new ol.interaction.Draw({ source: this.selectionSource, type: 'LineString' }),
      polygon: new ol.interaction.Draw({ source: this.selectionSource, type: 'Polygon' }),
      bbox: new ol.interaction.Draw({
        source: this.selectionSource,
        type: 'LineString',
        geometryFunction: (coordinates, geometry) => {
          const geom = geometry || new ol.geom.Polygon(null);
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

    const format = new ol.format.GeoJSON();
    for (var key in this.drawControls) {
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
      new ol.Collection(layers.getArray().sort((layer) => ids.indexOf(layer.id)))
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
      const polygon = ol.geom.Polygon.fromExtent([
        area[0], area[1], area[2], area[3],
      ]);
      feature = new ol.Feature();
      feature.setGeometry(polygon);
    } else if (area && typeof area === 'object') {
      const format = new ol.format.GeoJSON();
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
  createMapFeatures(features) {
    if (!Array.isArray(features)) {
      features = [features];
    }

    return features
      .map(feature => {
        if (feature) {
          let geometry = null;
          if (feature.geometry) {
            const format = new ol.format.GeoJSON();
            geometry = format.readGeometry(feature.geometry);
          } else if (feature.bbox) {
            geometry = ol.geom.Polygon.fromExtent(feature.bbox);
          }

          if (geometry) {
            const olFeature = new ol.Feature();
            olFeature.setGeometry(geometry);
            olFeature.orig = feature;
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
