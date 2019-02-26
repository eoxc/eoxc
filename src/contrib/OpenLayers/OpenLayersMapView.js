import Marionette from 'backbone.marionette';

import $ from 'jquery';
import _ from 'underscore';

import Feature from 'ol/feature';
import Collection from 'ol/collection';
import Overlay from 'ol/overlay';

import Draw from 'ol/interaction/draw';

import Group from 'ol/layer/group';

import WMTSSource from 'ol/source/wmts';
import WMSTileSource from 'ol/source/tilewms';

import GeoJSON from 'ol/format/geojson';

import Polygon from 'ol/geom/polygon';

import { getISODateTimeString, uniqueBy, filtersToCQL } from '../../core/util';
import { createMap, updateLayerParams, createRasterLayer, createVectorLayer, sortLayers, createCutOut, wrapToBounds } from './utils';
import CollectionSource from './CollectionSource';
import ModelAttributeSource from './ModelAttributeSource';
import ProgressBar from './progressbar';
import './ol.css';
import template from './OpenLayersMapView.hbs';
import { isRecordDownloadable } from '../../download';

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
    this.useDetailsDisplay = options.useDetailsDisplay;

    this.map = undefined;

    this.isPanning = false;
    this.isZooming = false;

    this.onFeatureClicked = options.onFeatureClicked;

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

    const minZoom = this.layersCollection.map(
      layer => (
        this.useDetailsDisplay && layer.get('detailsDisplay')
          ? layer.get('detailsDisplay')
          : layer.get('display')
      ).minZoom
    )
      .filter(layerMinZoom => typeof layerMinZoom !== 'undefined')
      .reduce((acc, layerMinZoom) => Math.max(acc, layerMinZoom), this.mapModel.get('minZoom'));

    const maxZoom = this.layersCollection.map(
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
      maxZoom + 1
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
          strokeColor: this.footprintStrokeColor
        },
        new CollectionSource({
          collection: searchModel.get('results'),
          transformModel: model => this.createMapFeatures(model, searchModel)[0],
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
      layer, mapModel, layer.layerModel, filtersModel, this.useDetailsDisplay,
    );
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
        const [minx, miny, maxx, maxy] = feature;

        geometry = Polygon.fromExtent([
          minx, miny, maxx > minx ? maxx : maxx + 360, maxy,
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
          updateLayerParams(
            layer, this.mapModel, layerModel, filtersModel, this.useDetailsDisplay,
          );
        }
      });
    });

    // setup map events
    this.map.on('pointerdrag', (...args) => this.onMapPointerDrag(...args));
    this.map.on('moveend', (...args) => this.onMapMoveEnd(...args));
    this.map.on('pointermove', _.throttle((...args) => this.onMapPointerMove(...args), 100));
    this.map.on('click', (...args) => this.onMapClick(...args));
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
        const bounds = [-180, -90, 180, 90];
        const extent = event.feature.getGeometry().getExtent();
        if (event.feature.getGeometry().isBox) {
          geom = wrapToBounds(extent, bounds);
        } else {
          // TODO: check that feature is within bounds
          geom = wrapToBounds(format.writeFeatureObject(event.feature), bounds);
        }


        // to avoid a zoom-in on a final double click
        setTimeout(() => this.mapModel.set({
          area: geom,
          tool: null,
        }));
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
      searchLayer.setVisible(display.visible && searchModel.get('automaticSearch'));
    }
    const searchFillLayer = this.searchLayersFillGroup.getLayerById(layerModel.get('id'));
    if (searchFillLayer && searchModel) {
      searchFillLayer.setVisible(display.visible && searchModel.get('automaticSearch'));
    }
  }

  onTimeChange() {
    this.layersCollection.forEach((layerModel) => {
      this.applyLayerFilters(
        this.getLayerOfGroup(layerModel, this.groups.layers), this.mapModel, layerModel
      );
    }, this);
  }

  onMapAreaChange(mapModel) {
    this.selectionSource.clear();
    const area = mapModel.get('area');

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

    this.searchLayersGroup.setVisible(toolName === null);
    this.searchLayersFillGroup.setVisible(toolName === null);
  }

  onMapPointerDrag() {
    // TODO: check if the currently selected tool is the panning tool
    // TODO: improve this to allow
    this.isPanning = true;
  }

  onMapMoveEnd() {
    let bbox = this.map.getView().calculateExtent(this.map.getSize());
    // wrap minX and maxX to fit -180, 180
    bbox = wrapBox(bbox);

    this.mapModel.set({
      center: this.map.getView().getCenter(),
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
      const wrappedCoordinate = wrapCoordinate(event.coordinate);


      const rawFeatures = [0, 360].map((offset) => {
        const coordinate = [wrappedCoordinate[0] + offset, wrappedCoordinate[1]];
        const features = this.searchLayersGroup.getLayers().getArray()
          .filter(layer => layer.getVisible())
          .map(layer => layer.getSource())
          .reduce((acc, source) => acc.concat(source.getFeaturesAtCoordinate(coordinate)), [])
          .concat(this.downloadSelectionLayerGroup.getLayers().getArray()
            .filter(layer => layer.getVisible())
            .map(layer => layer.getSource())
            .reduce((acc, source) => acc.concat(source.getFeaturesAtCoordinate(coordinate)), [])
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
    const coordinate = wrapCoordinate(event.coordinate);

    const searchFeatures = [];
    const selectedFeatures = [];
    [0, 360].forEach((offset) => {
      const offsetCoordinate = [coordinate[0] + offset, coordinate[1]];
      this.searchLayersGroup.getLayers().getArray()
        .filter(layer => layer.getVisible())
        .map(layer => layer.getSource())
        .reduce((acc, source) => acc.concat(source.getFeaturesAtCoordinate(offsetCoordinate)), [])
        .forEach(feature => searchFeatures.indexOf(feature) === -1 ? searchFeatures.push(feature) : null);

      this.downloadSelectionLayerGroup.getLayers().getArray()
        .map(layer => layer.getSource())
        .reduce((acc, source) => acc.concat(source.getFeaturesAtCoordinate(offsetCoordinate)), [])
        .forEach(feature => selectedFeatures.indexOf(feature) === -1 ? selectedFeatures.push(feature) : null);
    });

    this.highlightModel.highlight(searchFeatures.map(feature => feature.model));
    this.showOverlay(event.coordinate, searchFeatures, selectedFeatures);
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
          if (model.geometry || (model.get && model.get('geometry'))) {
            geometry = format.readGeometry(model.geometry || model.get('geometry'));
          } else if (model.bbox || (model.get && model.get('bbox'))) {
            geometry = Polygon.fromExtent(model.bbox || model.get('bbox'));
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
