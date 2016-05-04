import Marionette from "backbone.marionette";
import Backbone from "backbone";
import ol from "openlayers"

/**
 * @memberof contrib/OpenLayers
 */

class OpenLayersMapView extends Backbone.View {
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

  render() {
    this.createMap();
    return this;
  }

  /**
   * Convenience function to setup the map.
   */

  createMap(options = {}) {

    // assure that we only set up everything once

    if (this.map) {
      return this;
    }

    // create the map object

    this.map = new ol.Map({
      target: this.el,
      renderer: options.mapRenderer || 'canvas',
      view: new ol.View({
        center: this.mapModel.get("center") || [0, 0],
        zoom: this.mapModel.get("zoom") || 2
      })
    });

    // create layer groups for base, normal and overlay layers

    const createGroupForCollection = (collection) => {
      let group = new ol.layer.Group({
        layers: collection.map(layerModel => this.createLayer(layerModel) )
      })
      this.map.addLayer(group);
      return group;
    };

    this.groups = {
      baseLayers: createGroupForCollection(this.baseLayersCollection),
      layers: createGroupForCollection(this.layersCollection),
      overlayLayers: createGroupForCollection(this.overlayLayersCollection)
    };

    // TODO: create vector layer for selections etc

    // attach to signals of the collections

    this.setupEvents();

    return this;
  }

  createLayer(layerModel) {
    const params = layerModel.get("view");
    let layer;

    var projection = ol.proj.get('EPSG:4326');
    var projectionExtent = projection.getExtent();
    var size = ol.extent.getWidth(projectionExtent) / 256;
    var resolutions = new Array(18);
    var matrixIds = new Array(18);
    for (var z = 0; z < 18; ++z) {
      // generate resolutions and matrixIds arrays for this WMTS
      resolutions[z] = size / Math.pow(2, z+1);
      matrixIds[z] = z;
    }

    switch (params.protocol) {
      case "WMTS":
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
              resolutions: resolutions,
              matrixIds: matrixIds
            }),
            style: params.style,
            attributions: [
              new ol.Attribution({
                html: params.attribution
              })
            ],
            wrapX: true
          })
        });
        break;
      case "WMS":
        layer = new ol.layer.Tile({
          visible: layerdesc.get("visible"),
            source: new ol.source.TileWMS({
              crossOrigin: 'anonymous',
              params: {
                'LAYERS': params.id,
                'VERSION': '1.1.0',
                'FORMAT': 'image/png' // TODO: use format here?
              },
              url: params.url || params.urls[0],
              wrapX: true
            }),
            attribution: params.attribution,
          });
        break;
      default:
        throw new Error("Unsupported view protocol ")
    };
    layer.id = params.id;
    return layer;
  }

  removeLayer(layerModel, group) {
    const viewParams = layerModel.get("view");
    group.getLayers().remove(this.getLayerOfGroup(group, viewParams.id));
  }

  getLayerOfGroup(group, id) {
    let foundLayer;
    group.getLayers().forEach(layer => {
      if (layer.id === id) {
        foundLayer = layer;
      }
    });
    return foundLayer;
  }

  setupEvents() {

    // setup collection signals
    this.listenTo(this.layersCollection, "add", (layerModel) => this.addLayer(layerModel, this.groups.layers) );
    this.listenTo(this.layersCollection, "change", (layerModel) => this.onLayerChange(layerModel, this.groups.layers) );
    this.listenTo(this.layersCollection, "remove", (layerModel, layers) => {} );
    this.listenTo(this.layersCollection, "sort", (layers) => this.onLayersSorted() );

    // setup mapModel signals

    // directly tie the changes to the map
    this.listenTo(this.mapModel, "change:center", (mapModel) => {
      if (!this.isPanning) {
        this.map.getView().setCenter(mapModel.get("center"))
      }
    });
    this.listenTo(this.mapModel, "change:zoom", (mapModel) => {
      if (!this.isZooming) {
        this.map.getView().setZoom(mapModel.get("zoom"))
      }
    });

    this.listenTo(this.mapModel, "change:roll", (mapModel) => {this.map.getView().setRotation(mapModel.get("roll")) });

    // setup filters signals

    this.listenTo(this.filtersModel, "change")


    // setup map events

    let self = this;
    this.map.on("pointerdrag", (evt) => {
      // TODO: check if the currently selected tool is the panning tool
      // TODO: improve this to allow
      self.isPanning = true;
    });

    this.map.on("moveend", (evt) => {
      self.isPanning = false;
      self.isZooming = false;
      self.mapModel.set({
        center: self.map.getView().getCenter(),
        zoom: self.map.getView().getZoom()
      })
    });
  }


  // collection/model signal handlers

  onLayerChange(layerModel, group) {
    let layer = this.getLayerOfGroup(group, layerModel)
  }


  onFiltersChange(filtersModel, options) {


  }



  onDestroy() {
    // TODO: implement
  }
};

export default OpenLayersMapView;
