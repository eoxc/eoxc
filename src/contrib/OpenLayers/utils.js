import ol from 'openlayers';
import turfDifference from '@turf/difference';
import turfBBox from '@turf/bbox';
import turfIntersect from '@turf/intersect';

import CollectionSource from './CollectionSource';

const Map = ol.Map;
const AttributionControl = ol.control.Attribution;
const ZoomControl = ol.control.Zoom;

const WMTSSource = ol.source.WMTS;
const WMSTileSource = ol.source.TileWMS;
const VectorLayer = ol.layer.Vector;
const VectorSource = ol.source.Vector;

const getProjection = ol.proj.get;
const getExtentWidth = ol.extent.getWidth;
const getExtentTopLeft = ol.extent.getTopLeft;

const WMTSTileGrid = ol.tilegrid.WMTS;
const TileLayer = ol.layer.Tile;

const Style = ol.style.Style;
const Fill = ol.style.Fill;
const Stroke = ol.style.Stroke;
const Circle = ol.style.Circle;
const GeoJSON = ol.format.GeoJSON;

const Attribution = ol.Attribution;

export function createMap(center, zoom, renderer, minZoom, maxZoom) {
  return new Map({
    controls: [
      new AttributionControl(),
      new ZoomControl(),
      // new ol.control.MousePosition({
      //   coordinateFormat: ol.coordinate.createStringXY(4),
      //   projection: 'EPSG:4326',
      //   undefinedHTML: '&nbsp;',
      // }),
    ],
    renderer: renderer || 'canvas',
    view: new ol.View({
      projection: ol.proj.get('EPSG:4326'),
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

  const projection = getProjection('EPSG:4326');
  const projectionExtent = projection.getExtent();
  const size = getExtentWidth(projectionExtent) / 256;
  const resolutions = new Array(18);
  const matrixIds = new Array(18);

  for (let z = 0; z < 18; ++z) {
    // generate resolutions and matrixIds arrays for this WMTS
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

function featureFromExtent(extent) {
  const [minx, miny, maxx, maxy] = extent;
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

function linesFromExtent(extent) {
  const [minx, miny, maxx, maxy] = extent;
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
  let extent;
  const maxWidth = bounds[2] - bounds[0];

  if (Array.isArray(featureOrExtent)) {
    extent = featureOrExtent;
    // check that bbox is within bounds and adjust
    if (extent[2] - extent[0] >= maxWidth) {
      extent[0] = bounds[0];
      extent[2] = bounds[2];
    }
    extent[1] = Math.max(extent[1], bounds[1]);
    extent[3] = Math.min(extent[3], bounds[3]);
    if (extent[1] > extent[3]) {
      geom = null;
    } else {
      geom = extent;
    }
  } else {
    // check that feature is within bounds
    geom = featureOrExtent;
    extent = turfBBox(geom);
  }

  if (geom) {
    const dx = Math.ceil((extent[0] + 180) / -maxWidth) * maxWidth;
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
