import turfDifference from '@turf/difference';
import turfBBox from '@turf/bbox';
import turfIntersect from '@turf/intersect';

import Map from 'ol/map';
import View from 'ol/view';
import proj from 'ol/proj';
import extent from 'ol/extent';
import Attribution from 'ol/attribution';
import coordinate from 'ol/coordinate';

import AttributionControl from 'ol/control/attribution';
import ZoomControl from 'ol/control/zoom';
import MousePositionControl from 'ol/control/mouseposition';

import TileLayer from 'ol/layer/tile';
import VectorLayer from 'ol/layer/vector';

import WMTSSource from 'ol/source/wmts';
import WMSTileSource from 'ol/source/tilewms';
import VectorSource from 'ol/source/vector';

import WMTSTileGrid from 'ol/tilegrid/wmts';

import Style from 'ol/style/style';
import Fill from 'ol/style/fill';
import Stroke from 'ol/style/stroke';
import Circle from 'ol/style/circle';

import GeoJSON from 'ol/format/geojson';

import CollectionSource from './CollectionSource';


export function createMap(center, zoom, renderer, minZoom, maxZoom) {
  return new Map({
    controls: [
      new AttributionControl(),
      new ZoomControl(),
      new MousePositionControl({
        className: 'ol-mouse-position-eoxc',
        coordinateFormat: coordinate.createStringXY(2),
        projection: 'EPSG:4326',
        undefinedHTML: '',
      }),
    ],
    renderer: renderer || 'canvas',
    view: new View({
      projection: proj.get('EPSG:4326'),
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
export function createRasterLayer(layerModel) {
  const params = layerModel.get('display');
  let layer;

  const projection = proj.get('EPSG:4326');
  const projectionExtent = projection.getExtent();
  const size = extent.getWidth(projectionExtent) / 256;
  const resolutions = new Array(18);
  const matrixIds = new Array(18);

  for (let z = 0; z < 18; ++z) {
    // generate resolutions and matrixIds arrays for this WMTS
    // eslint-disable-next-line no-restricted-properties
    resolutions[z] = size / Math.pow(2, (z + 1));
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
            origin: extent.getTopLeft(projectionExtent),
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
          urls: (params.url) ? [params.url] : params.urls,
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
