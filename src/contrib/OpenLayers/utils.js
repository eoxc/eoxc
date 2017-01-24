import ol from 'openlayers';
import turfDifference from '@turf/difference';
import turfBBox from '@turf/bbox';

const Map = ol.Map;
const Attribution = ol.control.Attribution;
const Zoom = ol.control.Zoom;
const VectorLayer = ol.layer.Vector;
const VectorSource = ol.source.Vector;
const Style = ol.style.Style;
const Fill = ol.style.Fill;
const Stroke = ol.style.Stroke;
const Circle = ol.style.Circle;
const Polygon = ol.geom.Polygon;
const Feature = ol.Feature;


export function createMap(center, zoom, renderer) {
  return new Map({
    controls: [
      new Attribution,
      new Zoom,
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
    }),
    logo: false,
  });
}

export function createVectorLayer(fillColor, strokeColor, strokeWidth = 1, circleRadius = 0) {
  const definition = {
    fill: new Fill({
      color: fillColor,
    }),
    stroke: new Stroke({
      color: strokeColor,
      width: strokeWidth,
    }),
  };

  if (circleRadius) {
    definition.image = new Circle({
      radius: circleRadius,
      fill: new Fill({
        color: '#ffcc33',
      }),
    });
  }

  const style = new Style(definition);
  return new VectorLayer({
    source: new VectorSource,
    style,
    wrapX: true,
  });
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

function moveBy(feature, dx, dy) {
  const geom = feature.geometry;
  let newCoordinates = null;
  if (geom.type === 'Point') {
    newCoordinates = moveCoordinates(geom.coordinates);
  } else if (geom.type === 'LineString' || geom.type === 'MultiPoint') {
    newCoordinates = geom.coordinates.map((coord) => moveCoordinates(coord, dx, dy));
  } else if (geom.type === 'Polygon' || geom.type === 'MultiLineString') {
    newCoordinates = geom.coordinates.map(
      (line) => line.map(
        (coord) => moveCoordinates(coord, dx, dy)
      )
    );
  } else if (geom.type === 'MultiPolygon') {
    newCoordinates = geom.coordinates.map(
      (polygon) => polygon.map(
        (line) => line.map(
          (coord) => moveCoordinates(coord, dx, dy)
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

  const outerFeature = format.readFeature(diffFeature);
  outerFeature.setStyle(new Style({
    stroke: new Stroke({
      color: 'transparent',
      width: 0,
    }),
    fill: new Fill({
      color: outerColor,
    }),
  }));

  const innerFeature = format.readFeature(optimized);
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

  return [outerFeature, innerFeature];
}
