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

    this.mapModel = options.mapModel;
    this.filtersModel = options.filtersModel;

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
      position: 'absolute',
    });

    // create the map object
    this.map = new ol.Map({
      controls: ol.control.defaults().extend([
        new ol.control.MousePosition({
          coordinateFormat: ol.coordinate.createStringXY(4),
          projection: 'EPSG:4326',
          undefinedHTML: '&nbsp;',
        }),
      ]),
      renderer: options.mapRenderer || 'canvas',
      view: new ol.View({
        projection: ol.proj.get('EPSG:4326'),
        center: this.mapModel.get('center') || [0, 0],
        zoom: this.mapModel.get('zoom') || 2,
      }),
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

    this.selectionSource = new ol.source.Vector();

    // this.selectionSource.on("change", this.onDone);

    const selectionLayer = new ol.layer.Vector({
      source: this.selectionSource,
      style: selectionStyle,
    });

    // create layer for highlighting features

    const highlightStyle = new ol.style.Style({
      fill: new ol.style.Fill({
        color: 'rgba(255, 255, 255, 0.2)',
      }),
      stroke: new ol.style.Stroke({
        color: '#cccccc',
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


    // attach to signals of the collections

    this.setupEvents();
    this.setupControls(selectionStyle);

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
      matrixIds[z] = z;
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
          }),
          attribution: params.attribution,
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

    this.listenTo(this.mapModel, 'change:bbox', (mapModel) => {
      if (!this.isPanning) {
        this.map.getView().fit(mapModel.get('bbox'), this.map.getSize());
      }
    });

    this.listenTo(this.mapModel, 'change:tool', this.onToolChange);


    this.listenTo(this.mapModel, 'change:highlightFootprint', (mapModel) => {
      this.highlightSource.clear();
      const footprint = mapModel.get('highlightFootprint');
      if (footprint) {
        const polygon = new ol.geom.Polygon([footprint]);
        const feature = new ol.Feature();
        feature.setGeometry(polygon);
        this.highlightSource.addFeature(feature);
      }
    });

    this.listenTo(this.mapModel, 'change:highlightBBox', (mapModel) => {
      this.highlightSource.clear();
      const bbox = mapModel.get('highlightBBox');
      if (bbox) {
        const polygon = ol.geom.Polygon.fromExtent(bbox);
        const feature = new ol.Feature();
        feature.setGeometry(polygon);
        this.highlightSource.addFeature(feature);
      }
    });

    // setup filters signals

    this.listenTo(this.filtersModel, 'change:time', this.onFiltersTimeChange);


    // setup map events

    const self = this;
    this.map.on('pointerdrag', () => {
      // TODO: check if the currently selected tool is the panning tool
      // TODO: improve this to allow
      self.isPanning = true;
    });

    this.map.on('moveend', () => {
      self.mapModel.set({
        center: self.map.getView().getCenter(),
        zoom: self.map.getView().getZoom(),
        bbox: self.map.getView().calculateExtent(self.map.getSize()),
      });
      self.isPanning = false;
      self.isZooming = false;
    });
  }

  /**
   * Creates OpenLayers interactions and adds them to the map.
   *
   */
  setupControls(selectionStyle) {
    this.drawControls = {
      point: new ol.interaction.Draw({ source: this.selectionSource, type: 'Point' }),
      line: new ol.interaction.Draw({ source: this.selectionSource, type: 'LineString' }),
      polygon: new ol.interaction.Draw({ source: this.selectionSource, type: 'Polygon' }),
      bbox: new ol.interaction.DragBox({ style: selectionStyle }),
    };

    this.drawControls.bbox.on('boxstart', (evt) => {
      this.drawControls.bbox.boxstart = evt.coordinate;
    }, this);

    this.drawControls.bbox.on('boxend', (evt) => {
      const boxend = evt.coordinate;
      const boxstart = this.drawControls.bbox.boxstart;
      const polygon = ol.geom.Polygon.fromExtent([
        boxstart[0], boxstart[1], boxend[0], boxend[1],
      ]);

      // if (this.selectionType === "single"){
      //   var features = this.source.getFeatures();
      //   for (var i in features){
      //     this.source.removeFeature(features[i]);
      //   }
      //   Communicator.mediator.trigger("selection:changed", null);
      // }

      const feature = new ol.Feature();
      feature.setGeometry(polygon);
      this.selectionSource.addFeature(feature);
    }, this);
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
