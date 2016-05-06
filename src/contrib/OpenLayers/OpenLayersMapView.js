import Marionette from 'backbone.marionette';
import ol from 'openlayers';


// TODO: move this to a general utils file

function padLeft(str, pad, size) {
  let out = str;
  while (out.length < size) {
    out = pad + str;
  }
  return out;
}

function getDateString(date) {
  return date.getFullYear() + '-'
    + padLeft(String(date.getUTCMonth() + 1), '0', 2) + '-'
    + padLeft(String(date.getUTCDate()), '0', 2);
}

function getISODateString(date) {
  return getDateString(date) + 'T';
}

function getISODateTimeString(date) {
  return getISODateString(date)
    + padLeft(String(date.getUTCHours()), '0', 2) + ':'
    + padLeft(String(date.getUTCMinutes()), '0', 2) + ':'
    + padLeft(String(date.getUTCSeconds()), '0', 2) + 'Z';
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

    this.$el.attr('style', 'width:100%;height:100%;');

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

    // TODO: create vector layer for selections etc

    // attach to signals of the collections

    this.setupEvents();


    this.map.render();

    return this;
  }

  /**
   * Creates an OpenLayers layer from a given LayerModel.
   *
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

    // TODO: implement
    this.applyLayerFilters(layer);

    return layer;
  }

  applyLayerFilters() {

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
    this.listenTo(this.layersCollection, 'remove', (layerModel, layers) => {});
    this.listenTo(this.layersCollection, 'sort', (layers) => this.onLayersSorted(layers));

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

    // setup filters signals

    this.listenTo(this.filtersModel, 'change:time', this.onFiltersTimeChange);


    // setup map events

    const self = this;
    this.map.on('pointerdrag', (evt) => {
      // TODO: check if the currently selected tool is the panning tool
      // TODO: improve this to allow
      self.isPanning = true;
    });

    this.map.on('moveend', (evt) => {
      self.isPanning = false;
      self.isZooming = false;
      self.mapModel.set({
        center: self.map.getView().getCenter(),
        zoom: self.map.getView().getZoom(),
      });
    });
  }


  // collection/model signal handlers

  onLayerChange(layerModel, group) {
    let layer = this.getLayerOfGroup(layerModel, group);
  }


  onFiltersTimeChange(filtersModel) {
    const time = filtersModel.get('time');
    this.layersCollection.forEach((layerModel) => {
      const source = this.getLayerOfGroup(layerModel, this.groups.layers).getSource();
      const params = source.getParams();
      if (time !== null) {
        params.time = `${getISODateTimeString(time[0])}/${getISODateTimeString(time[1])}`;
      }
      else {
        delete params.time;
      }
      source.updateParams(params);
    }, this);
  }

  onDestroy() {
    // TODO: implement
  }
}

OpenLayersMapView.prototype.template = () => '';

export default OpenLayersMapView;
