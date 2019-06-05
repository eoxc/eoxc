import _ from 'underscore'; // eslint-disable-line import/no-extraneous-dependencies
import turfDifference from '@turf/difference';
import turfBBox from '@turf/bbox';
import turfIntersect from '@turf/intersect';
import turfUnion from '@turf/union';

import Map from 'ol/Map';
import View from 'ol/View';
import { get as getProj } from 'ol/proj';
import { getWidth as extentGetWidth, getTopLeft as extentGetTopLeft } from 'ol/extent';
// import Attribution from 'ol/attribution';

import AttributionControl from 'ol/control/Attribution';
import ZoomControl from 'ol/control/Zoom';
import MousePositionControl from 'ol/control/MousePosition';

import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';

import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import WMTSSource, { optionsFromCapabilities } from 'ol/source/WMTS';
import WMSTileSource from 'ol/source/TileWMS';
import XYZSource from 'ol/source/XYZ';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON'

import TileGrid from 'ol/tilegrid/TileGrid';
import WMTSTileGrid from 'ol/tilegrid/WMTS';

import Style from 'ol/style/Style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import Circle from 'ol/style/Circle';
import { fromExtent } from 'ol/geom/Polygon';

import deepEqual from 'deep-equal';

import CollectionSource from './CollectionSource';

import { getISODateTimeString, uniqueBy, filtersToCQL } from '../../core/util';


export function createMap(center, zoom, renderer, minZoom, maxZoom, projection) {
  return new Map({
    controls: [
      new AttributionControl(),
      new ZoomControl(),
      new MousePositionControl({
        className: 'ol-mouse-position-eoxc',
        coordinateFormat([x, y]) {
          while (x > 180) {
            x -= 360; // eslint-disable-line no-param-reassign
          }
          while (x < -180) {
            x += 360; // eslint-disable-line no-param-reassign
          }
          return `${x.toFixed(2)}, ${y.toFixed(2)}`;
        },
        // coordinate label crs now set hardcoded
        projection: getProj('EPSG:4326'),
        undefinedHTML: '',
      }),
    ],
    renderer: renderer || 'canvas',
    view: new View({
      projection,
      center,
      zoom,
      enableRotation: false,
      minZoom,
      maxZoom,
    }),
    logo: false,
  });
}

/**
 * Creates an OpenLayers layer from a given LayerModel.
 *
 * @param {core/models.LayerModel} layerModel The layerModel to create a layer for.
 * @returns {ol.Layer} The OpenLayers layer object
 */
export function createRasterLayer(layerModel, mapModel, map, useDetailsDisplay = false) {
  const displayParams = useDetailsDisplay
    ? layerModel.get('detailsDisplay') || layerModel.get('display')
    : layerModel.get('display');

  let layer;

  const projection = getProj(displayParams.projection || 'EPSG:4326');
  const projectionExtent = projection.getExtent();
  const size = extentGetWidth(projectionExtent) / (displayParams.tileSize || 256);
  const resolutions = new Array(18);
  const matrixIds = new Array(18);
  const customAdditionBasedOnProj = projection.getCode() === 'EPSG:4326' ? 1 : 0;
  for (let z = 0; z < 18; ++z) {
    // generate resolutions and matrixIds arrays for this WMTS
    // eslint-disable-next-line no-restricted-properties
    resolutions[z] = size / Math.pow(2, (z + customAdditionBasedOnProj));
    let id = z;

    if (displayParams.matrixIdPrefix) {
      id = displayParams.matrixIdPrefix + id;
    }
    if (displayParams.matrixIdPostfix) {
      id += displayParams.matrixIdPostfix;
    }
    matrixIds[z] = id;
  }

  let tileSize = displayParams.tileSize;
  if (typeof displayParams.tileSize === 'number') {
    tileSize = [displayParams.tileSize, displayParams.tileSize];
  }

  const layerId = displayParams.id ? displayParams.id : displayParams.ids.join(',');

  if (displayParams.capabilitiesUrl) {
    layer = new TileLayer({
      visible: displayParams.visible,
    });

    fetch(displayParams.capabilitiesUrl).then(response => response.text())
      .then((text) => {
        const parser = new WMTSCapabilities();
        const result = parser.read(text);
        const options = optionsFromCapabilities(result, {
          layer: displayParams.id,
          matrixSet: displayParams.matrixSet,
        });
        layer.setSource(new WMTSSource(options));
      });
  } else {
    switch (displayParams.protocol) {
      case 'WMTS':
        layer = new TileLayer({
          visible: displayParams.visible,
          source: new WMTSSource({
            urls: (displayParams.url) ? [displayParams.url] : displayParams.urls,
            layer: displayParams.id,
            matrixSet: displayParams.matrixSet,
            format: displayParams.format,
            projection,
            tileGrid: new WMTSTileGrid({
              origin: extentGetTopLeft(projectionExtent),
              resolutions,
              matrixIds,
            }),
            style: displayParams.style,
            attributions: displayParams.attribution,
            wrapX: true,
            dimensions: {
              time: '',
            },
            requestEncoding: displayParams.requestEncoding,
          }),
        });
        break;
      case 'WMS':
        layer = new TileLayer({
          visible: displayParams.visible,
          source: new WMSTileSource({
            crossOrigin: 'anonymous',
            params: Object.assign({
              LAYERS: layerId,
              VERSION: displayParams.version || '1.1.0',
              FORMAT: displayParams.format, // TODO: use format here?
              STYLES: displayParams.style,
            }, displayParams.extraParameters),
            tileGrid: new TileGrid({
              resolutions,
              tileSize: tileSize || [256, 256],
              extent: projectionExtent
            }),
            urls: (displayParams.url) ? [displayParams.url] : displayParams.urls,
            wrapX: true,
            attributions: displayParams.attribution,
          }),
        });
        break;
      case 'XYZ':
        const midInterval = new Date((mapModel.get('time')[0].getTime() + mapModel.get('time')[1].getTime()) / 2);
        const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
        const updatedUrl = [displayParams.url.replace('YYYYMM', midInterval.getFullYear() + months[midInterval.getMonth()])];
        layer = new TileLayer({
          visible: displayParams.visible,
          source: new XYZSource({
            crossOrigin: 'anonymous',
            projection,
            tileSize: tileSize || [256, 256],
            urls: updatedUrl,
            attributions: displayParams.attribution,
            minZoom: displayParams.minZoom,
            maxZoom: displayParams.maxZoom,
          }),
        });
        // EEA MOCKUP HACK THAT XYZ LAYER IS DRAWN ONLY ON TOP OF DRAWN VECTOR FEATURES
        // IT IS CURRENTLY VERY SLOW WITH INCREASING NUMBER OF FEATURES
        if (map.XYZOnlyOverProducts) {
          layer.on('precompose', (event) => {
            const ctx = event.context;
            const vecCtx = event.vectorContext;
            ctx.save();
            const lgroups = map.getLayers().array_;
            const ids = [];
            const uniqueSearchModels = [];
            const vectFeatures = [];
            const emptyStyle = createStyle();
            vecCtx.setStyle(emptyStyle);

            _.each(lgroups, (lgroup) => {
              const blayers = lgroup.values_;
              if (blayers) {
                const clayers = blayers.layers;
                if (clayers) {
                  const dlayers = clayers.array_;
                  if (dlayers) {
                    _.each(dlayers, (ll) => {
                      const ss = ll.values_.source;
                      if (ss) {
                        if (typeof ss.getFeatures === 'function') {
                          const ff = ss.getFeatures();
                          _.each(ff, (f) => {
                            // take only polygons with unique id
                            // usually there is at least a set of double, sometimes more (fill, highlight, frame, download)
                            if (!ids.includes(f.ol_uid)) {
                              ids.push(f.ol_uid);
                              vectFeatures.push(f);
                              if (!_.any(uniqueSearchModels, model =>
                                model.cid === f.searchModel.cid
                              )) {
                                uniqueSearchModels.push(f.searchModel);
                              }
                            }
                          });
                        }
                      }
                    });
                  }
                }
              }
            });
            const anySearchModelIsSearching = _.some(uniqueSearchModels, (model) => {
              return model.get('isSearching');
            });
            if (vectFeatures.length > 0 && !anySearchModelIsSearching) {
              let idsFromCache = [];
              if (layer.cacheVectFeatures) {
                idsFromCache = _.uniq(layer.cacheVectFeatures.map(feature => feature.getId()).sort(),true);
              }
              const idsFromMap =  _.uniq(vectFeatures.map(feature => feature.getId()).sort(), true);
              const GeoJSONFormat = new GeoJSON();
              if (!layer.cacheVectFeatures || !_.isEqual(idsFromCache, idsFromMap)) {
                // perform union
                let unionedPolygons = null;
                _.each(vectFeatures, (feature) => {
                  const geoJSONFeature = GeoJSONFormat.writeFeatureObject(feature, {
                    featureProjection: projection,
                  });
                  if (unionedPolygons === null) {
                    // first item
                    unionedPolygons = geoJSONFeature;
                  } else {
                    // union polygons
                    unionedPolygons = turfUnion(unionedPolygons, geoJSONFeature);
                  }
                });
                // primitive caching of features and unionedPolygons
                layer.cacheVectFeatures = vectFeatures;
                layer.unionedPolygons = unionedPolygons;
              }
              // draw geometry to canvas
              const backToOlFormat = GeoJSONFormat.readFeature(layer.unionedPolygons, {
                featureProjection: projection,
              });
              vecCtx.drawGeometry(backToOlFormat.getGeometry());
            } else {
              // draw a tiny polygon somewhere to not show the layer at all
              const polygonGeom = fromExtent([0, 0, 1, 1]);
              vecCtx.drawGeometry(polygonGeom);
            }
            ctx.clip();
          });
          layer.on('postcompose', (evt) => {
            evt.context.restore();
          });
        }
        break;
      default:
        throw new Error('Unsupported view protocol');
    }
  }
  layer.id = layerModel.get('id');
  layer.layerModel = layerModel;
  if (displayParams.noAntialiasing) {
    layer.on('precompose', (event) => {
      event.context.imageSmoothingEnabled = false;
    });
  }
  return layer;
}

export function parseDuration(duration) {
  // using code from EOX-A/d3.TimeSlider
  if (!isNaN(parseFloat(duration))) {
    return parseFloat(duration);
  }
  const regex = RegExp(/^P(?:([0-9]+)Y|)?(?:([0-9]+)M|)?(?:([0-9]+)D|)?T?(?:([0-9]+)H|)?(?:([0-9]+)M|)?(?:([0-9]+)S|)?$/, 'g');
  const matches = regex.exec(duration);
  if (matches) {
    const years = (parseInt(matches[1], 10) || 0); // years
    const months = (parseInt(matches[2], 10) || 0) + (years * 12); // months with days fixed to 30
    const days = (parseInt(matches[3], 10) || 0) + (months * 30); // days
    const hours = (parseInt(matches[4], 10) || 0) + (days * 24); // hours
    const minutes = (parseInt(matches[5], 10) || 0) + (hours * 60); // minutes
    return (parseInt(matches[6], 10) || 0) + (minutes * 60); // returns seconds in the end
  }
  // should not happen
  return duration;
}

export function validateTimeInterval(mapModel, time) {
  // checks if interval does not exceed maximum interval
  // if yes, returns modified interval of [end - maxInterval, end]
  const maxIntervalSeconds = mapModel.get('maxMapInterval');
  let result = time[1] > time[0] ? [time[0], time[1]] : [time[1], time[0]];
  if ((result[1] - result[0]) > maxIntervalSeconds * 1000) {
    result = [new Date(time[1] - (maxIntervalSeconds * 1000)), time[1]];
    // communicating with time filter tool
    mapModel.trigger('exceed:maxMapInterval', result);
  } else {
    mapModel.trigger('exceed:maxMapInterval', null);
  }
  return result;
}

function getLayerParams(mapModel, displayParams, filtersModel) {
  const params = {};
  let time = mapModel.get('time');
  if (Array.isArray(time)) {
    time = time[0] < time[1] ? time : [time[1], time[0]];
  } else if (time instanceof Date) {
    time = [time, time];
  }

  if (mapModel.get('maxMapInterval')) {
    time = validateTimeInterval(mapModel, time);
  }
  if (displayParams.adjustTime) {
    const offset = Array.isArray(displayParams.adjustTime)
      ? displayParams.adjustTime
      : [-displayParams.adjustTime, displayParams.adjustTime];
    time = [
      new Date(time[0].getTime() + (offset[0] * 1000)),
      new Date(time[1].getTime() + (offset[1] * 1000)),
    ];
  }

  let isoTime = null;
  if (time !== null) {
    let beginISO = getISODateTimeString(time[0], displayParams.useMilliseconds);
    let endISO = getISODateTimeString(time[1], displayParams.useMilliseconds);

    if (displayParams.discardZulu) {
      beginISO = beginISO.slice(0, -1);
      endISO = endISO.slice(0, -1);
    }

    isoTime = `${beginISO}/${endISO}`;
  }

  if (isoTime !== null) {
    params.time = isoTime;
  } else {
    delete params.time;
  }

  // CQL filters
  const cqlParameterName = displayParams.cqlParameterName;
  if (cqlParameterName && filtersModel) {
    let cql = filtersToCQL(filtersModel, displayParams.cqlMapping);
    const origCql = cql;

    const layerIds = displayParams.ids;
    if (layerIds && layerIds.length > 1) {
      for (let i = 1; i < layerIds.length; ++i) {
        cql = `${cql};${origCql}`;
      }
    }

    if (origCql && origCql.length) {
      params[cqlParameterName] = cql;
    } else {
      delete params[cqlParameterName];
    }
  }

  // extra parameters
  const extraParameters = displayParams.extraParameters;
  if (extraParameters) {
    Object.keys(extraParameters).forEach((key) => {
      if (typeof extraParameters[key] === 'string') {
        params[key] = extraParameters[key];
      } else if (extraParameters[key].template) {
        params[key] = _.template(extraParameters[key].template, {
          interpolate: /\{\{(.+?)\}\}/g
        })(extraParameters[key]);
      }
    });
  }

  return params;
}

/**
 *
 */
export function updateLayerParams(
  layer, mapModel, layerModel, filtersModel, useDetailsDisplay = false
) {
  const displayParams = useDetailsDisplay
    ? layerModel.get('detailsDisplay') || layerModel.get('display')
    : layerModel.get('display');

  layer.setVisible(displayParams.visible);
  layer.setOpacity(displayParams.opacity);
  const source = layer.getSource();
  let previousParams;
  if (source.getParams) {
    previousParams = source.getParams();
  } else if (source.getDimensions) {
    previousParams = source.getDimensions();
  } else {
    previousParams = {};
  }


  const params = Object.assign(
    {}, previousParams, getLayerParams(mapModel, displayParams, filtersModel)
  );

  if (!deepEqual(params, previousParams)) {
    if (source instanceof WMSTileSource) {
      params.STYLES = displayParams.style;
      source.params_ = {}; // eslint-disable-line no-underscore-dangle
      source.updateParams(params);
    } else if (source instanceof WMTSSource) {
      // TODO: only use time as dimension and ignore any other params
      source.updateDimensions({ time: params.time });
    }
    // Workaround to make sure tiles are reloaded when parameters change
    source.setTileLoadFunction(source.getTileLoadFunction());
  }
}

function createStyle({ fillColor, strokeColor, strokeWidth = 1, circleRadius = 0 } = { }) {
  const definition = {
    fill: new Fill({
      color: fillColor || 'rgba(0, 0, 0, 0)',
    }),
    stroke: new Stroke({
      color: strokeColor || 'rgba(0, 0, 0, 0)',
      width: strokeWidth,
    }),
  };

  if (circleRadius) {
    definition.image = new Circle({
      radius: circleRadius,
      fill: new Fill({
        color: fillColor || 'rgba(0, 0, 0, 0)',
      }),
    });
  }
  return new Style(definition);
}

export function createVectorLayer(styleDefinition = {}, source = null) {
  return new VectorLayer({
    source: source || new VectorSource(),
    style: createStyle(styleDefinition),
    wrapX: true,
  });
}

export function createCollectionVectorLayer(collection, searchModel, fillColor, strokeColor,
  strokeWidth = 1, circleRadius = 0) {
  const layer = createVectorLayer(
    fillColor, strokeColor, strokeWidth, circleRadius,
    new CollectionSource({
      collection,
      searchModel,
      format: new GeoJSON(),
    })
  );
  return layer;
}

export function sortLayers(collection, layers) {
  const ids = collection.pluck('id').reverse();
  return layers.sort((a, b) => {
    const ia = ids.indexOf(a.id);
    const ib = ids.indexOf(b.id);
    if (ia < ib) {
      return -1;
    } else if (ia > ib) {
      return 1;
    }
    return 0;
  });
}


function featureFromExtent(extentArray) {
  const [minx, miny, maxx, maxy] = extentArray;
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [minx, miny],
        [maxx, miny],
        [maxx, maxy],
        [minx, maxy],
        [minx, miny],
      ]],
    },
  };
}

function linesFromExtent(extentArray) {
  const [minx, miny, maxx, maxy] = extentArray;
  return {
    type: 'Feature',
    geometry: {
      type: 'MultiLineString',
      coordinates: [[
        [minx, miny],
        [maxx, miny],
      ], [
        [minx, maxy],
        [maxx, maxy],
      ]],
    },
  };
}

function moveCoordinates(coords, dx, dy) {
  return [coords[0] + dx, coords[1] + dy];
}

export function moveBy(feature, dx, dy) {
  // special case for extents
  if (Array.isArray(feature) && feature.length === 4) {
    return [
      feature[0] + dx,
      feature[1] + dy,
      feature[2] + dx,
      feature[3] + dy,
    ];
  }

  const geom = feature.geometry;
  let newCoordinates = null;
  if (geom.type === 'Point') {
    newCoordinates = moveCoordinates(geom.coordinates, dx, dy);
  } else if (geom.type === 'LineString' || geom.type === 'MultiPoint') {
    newCoordinates = geom.coordinates.map(coord => moveCoordinates(coord, dx, dy));
  } else if (geom.type === 'Polygon' || geom.type === 'MultiLineString') {
    newCoordinates = geom.coordinates.map(
      line => line.map(
        coord => moveCoordinates(coord, dx, dy)
      )
    );
  } else if (geom.type === 'MultiPolygon') {
    newCoordinates = geom.coordinates.map(
      polygon => polygon.map(
        line => line.map(
          coord => moveCoordinates(coord, dx, dy)
        )
      )
    );
  }
  return {
    type: 'Feature',
    geometry: {
      type: geom.type,
      coordinates: newCoordinates,
    },
  };
}

/*
 * Normalize a given geometry, extent, or feature to a feature. The feature will
 * be wrapped so that the minx value is between -180/180. Y values will be cut to
 * -90/90.
 * It returns two features: the normalized one and one optimized for display.
 */
export function toNormalizedFeature(geometry) {
  if (Array.isArray(geometry) && geometry.length === 4) {
    let [minx, miny, maxx, maxy] = geometry;
    if (maxx - minx >= 360) {
      minx = -180;
      maxx = 180;
    } else if (minx < -180) {
      const dx = Math.floor((minx - 180) / -360) * 360;
      minx += dx;
      maxx += dx;
    } else if (minx > 180) {
      const dx = Math.ceil((minx + 180) / 360) * 360;
      minx += dx;
      maxx += dx;
    }
    if (maxx < minx) {
      maxx += 360;
    }
    miny = Math.max(miny, -90);
    maxy = Math.min(maxy, 90);
    const newExtent = featureFromExtent([minx, miny, maxx, maxy]);
    let optimized = newExtent;
    if (minx === -180 && maxx === 180) {
      optimized = linesFromExtent([minx, miny, maxx, maxy]);
    }
    return [newExtent, optimized];
  }

  let feature = geometry;
  if (geometry.type !== 'Feature') {
    feature = {
      type: 'Feature',
      geometry,
    };
  }
  const bbox = turfBBox(feature);
  let dx = 0;
  if (bbox[0] < -180) {
    dx = Math.floor((bbox[0] - 180) / -360) * 360;
    feature = moveBy(feature, dx, 0);
  } else if (bbox[0] >= 180) {
    dx = Math.ceil((bbox[0] + 180) / 360) * 360;
    feature = moveBy(feature, dx, 0);
  }
  return [feature, feature];
}

export function wrapToBounds(featureOrExtent, bounds) {
  let geom;
  let extentArray;
  const maxWidth = bounds[2] - bounds[0];

  if (Array.isArray(featureOrExtent)) {
    extentArray = featureOrExtent;
    // check that bbox is within bounds and adjust
    if (extentArray[2] - extentArray[0] >= maxWidth) {
      extentArray[0] = bounds[0];
      extentArray[2] = bounds[2];
    }
    extentArray[1] = Math.max(extentArray[1], bounds[1]);
    extentArray[3] = Math.min(extentArray[3], bounds[3]);
    if (extentArray[1] > extentArray[3]) {
      geom = null;
    } else {
      geom = extentArray;
    }
  } else {
    // check that feature is within bounds
    geom = featureOrExtent;
    extentArray = turfBBox(geom);
  }

  if (geom) {
    const dx = Math.ceil((extentArray[0] + 180) / -maxWidth) * maxWidth;
    geom = moveBy(geom, dx, 0);
  }

  if (geom && geom.type === 'Feature') {
    const boundsFeature = featureFromExtent(bounds);
    // check that geom is within bounds
    if (!turfIntersect(geom, boundsFeature)) {
      geom = null;
    }
  } else if (Array.isArray(geom)) {
    if (geom[2] > 180) {
      geom[2] -= 360;
    }
  }
  return geom;
}


const globalPolygon = featureFromExtent([-180, -90, 180, 90]);

/*
 * Create OL coutout features.
 */
// eslint-disable-next-line max-len
export function createCutOut(geometry, format, fillColor, outerColor, strokeColor, strokeWidth = 1) {
  const [origFeature, optimized] = toNormalizedFeature(geometry);
  const bbox = turfBBox(origFeature);
  let diffFeature = globalPolygon;
  for (let maxx = bbox[2]; maxx > -180; maxx -= 360) {
    const dx = maxx - bbox[2];
    let feature = origFeature;
    if (dx !== 0) {
      feature = moveBy(origFeature, dx, 0);
    }
    try {
      diffFeature = turfDifference(diffFeature, feature);
    } catch (error) {
      return [null, null];
    }
  }

  let outerFeature = null;
  let innerFeature = null;

  if (diffFeature) {
    outerFeature = format.readFeature(diffFeature);
    outerFeature.setStyle(new Style({
      stroke: new Stroke({
        color: 'transparent',
        width: 0,
      }),
      fill: new Fill({
        color: outerColor,
      }),
    }));
  }

  if (optimized) {
    innerFeature = format.readFeature(optimized);
    innerFeature.setStyle(new Style({
      stroke: new Stroke({
        color: strokeColor,
        width: strokeWidth,
      }),
      fill: new Fill({
        color: fillColor,
      }),
      image: new Circle({
        radius: 5,
        fill: new Fill({
          color: strokeColor,
        }),
      }),
    }));
  }

  return [outerFeature, innerFeature];
}

function sortByModelId(a, b) {
  // sorts array by model cid ascending
  if (typeof a.model !== 'undefined' && typeof b.model !== 'undefined') {
    const cidA = parseInt(a.model.cid.slice(1, a.model.cid.length), 10);
    const cidB = parseInt(b.model.cid.slice(1, b.model.cid.length), 10);
    return cidA - cidB;
  } else return a - b;
}
