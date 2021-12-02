import turfUnion from '@turf/union';
import { polygon as turfPolygon } from '@turf/helpers';
import turfBBox from '@turf/bbox';

function prepareBox(bbox) {
  const b = [...bbox];
  b[1] = Math.max(b[1], -90);
  b[3] = Math.min(b[3], 90);

  for (let i = 0; i <= 2; i += 2) {
    while (b[i] > 180) {
      b[i] -= 360;
    }
    while (b[i] < -180) {
      b[i] += 360;
    }
  }
  return b;
}

/**
 * Prepares the records retrieved from OpenSearch. This involves "unwrapping" of
 * dateline wrapped geometries and adjusting the bbox. MultiPolygons coordinates have switched order if necessary
 * If its polygons are contiguous, merge them to a single polygon.
 * @param {object[]} records the retrieved records
 * @param {boolean} > if polygon coordinates are received in switched order
 * @returns {object[]} the adjusted records.
 */
export function prepareRecords(records, switchMultiPolygonCoordinates) {
  return records.map((record) => {
    let adjustedGeometry = false;
    if (record.geometry && record.geometry.type === 'Polygon') {
      // normalize the geometry, so that wrapped polygons are unwrapped
      for (let ringIndex = 0; ringIndex < record.geometry.coordinates.length; ++ringIndex) {
        const ring = record.geometry.coordinates[ringIndex];
        let last = null;
        for (let i = 0; i < ring.length; ++i) {
          const current = ring[i];
          if (last) {
            if (current[0] - last[0] < -180) {
              current[0] += 360;
              adjustedGeometry = true;
            }
            if (current[0] - last[0] > 180) {
              current[0] -= 360;
              adjustedGeometry = true;
            }
          }
          last = current;
        }
      }
    } else if (switchMultiPolygonCoordinates && record.geometry && record.geometry.type === 'MultiPolygon') {
      for (let polygonIndex = 0; polygonIndex < record.geometry.coordinates.length; ++polygonIndex) {
        for (let ringIndex = 0; ringIndex < record.geometry.coordinates[polygonIndex].length; ++ringIndex) {
          const ring = record.geometry.coordinates[polygonIndex][ringIndex];
          for (let i = 0; i < ring.length; ++i) {
            // switch latitude and longitude
            ring[i].reverse();
          }
        }
      }
      if (record.geometry.coordinates.length === 2) {
        // add 360 to the second polygon if necessary to exceed srs bounds and allow polygon union to remove connection line on dateline
        adjustedGeometry = true;
        const outerRingL = record.geometry.coordinates[1][0];
        const outerRingR = record.geometry.coordinates[0][0];
        const outerRingLLatitudes = Array.from(outerRingL, x => x[1]);
        const outerRingRLatitudes = Array.from(outerRingR, x => x[1]);

        // union to a single polygon only for non-S5P wierd multipolygons
        // eslint-disable-next-line max-len
        const notPerformUnion = Math.abs(Math.min(...outerRingLLatitudes) + 85.05115) < 1e-8 || Math.abs(Math.min(...outerRingRLatitudes) + 85.05115) < 1e-8 || Math.abs(Math.max(...outerRingLLatitudes) - 85.05115) < 1e-8 ||
        Math.abs(Math.max(...outerRingRLatitudes) - 85.05115) < 1e-8;

        if (!notPerformUnion) {
          adjustedGeometry = true;
          const outerRingLLongitudes = Array.from(outerRingL, x => x[0]);
          const outerRingRLongitudes = Array.from(outerRingR, x => x[0]);

          if (Math.abs(Math.min(...outerRingLLongitudes) + 180.0) < 1e-8 && Math.abs(Math.max(...outerRingRLongitudes) - 180.0) < 1e-8) {
            for (let i = 0; i < outerRingL.length; ++i) {
              outerRingL[i][0] += 360;
            }
          } else if (Math.abs(Math.min(...outerRingRLongitudes) + 180.0) < 1e-8 && Math.abs(Math.max(...outerRingLLongitudes) - 180.0) < 1e-8) {
            for (let i = 0; i < outerRingR.length; ++i) {
              outerRingR[i][0] += 360;
            }
          }

          const polygonL = turfPolygon(record.geometry.coordinates[0]);
          const polygonR = turfPolygon(record.geometry.coordinates[1]);
          // union to a single polygon
          const unioned = turfUnion(polygonL, polygonR);

          // eslint-disable-next-line no-param-reassign
          record.geometry = unioned.geometry;
        }
      }
    }
      // (re-)calculate the bounding box when not available or when the geometry
      // was adjusted in the step before
    if (!record.bbox || adjustedGeometry) {
      // eslint-disable-next-line no-param-reassign
      record.bbox = turfBBox(record.geometry);
    }
    return record;
  });
}

/**
 * Convert a filters model, map model, and options to an OpenSearch parameters
 * object
 */
export function convertFilters(filterParams, mapParams, options, format, service) {
  const description = service.getDescription();
  const url = description.getUrl(null, format || null);

  const parameters = {};

  const time = filterParams.time || mapParams.extendedTime || mapParams.time;
  if (time) {
    if (Array.isArray(time)) {
      parameters['time:start'] = time[0];
      parameters['time:end'] = time[1];
    } else {
      parameters['time:start'] = time;
      parameters['time:end'] = time;
    }
  }

  if (mapParams) {
    const area = mapParams.area;
    if (area) {
      if (Array.isArray(area)) {
        parameters['geo:box'] = prepareBox(area);
      } else if (area.geometry) {
        const geometry = area.geometry;
        if (geometry.type === 'Point' && url.hasParameter('geo:lon') && url.hasParameter('geo:lat')) {
          parameters['geo:lon'] = geometry.coordinates[0];
          parameters['geo:lat'] = geometry.coordinates[1];
          if (url.hasParameter('geo:radius')) {
            parameters['geo:radius'] = 0;
          }
        } else {
          parameters['geo:geometry'] = geometry;
        }
      }
    } else if (mapParams && mapParams.bbox) {
      // use the maps BBox by default
      parameters['geo:box'] = prepareBox(mapParams.bbox);
    }
  }

  if (options.hasOwnProperty('itemsPerPage') && url.hasParameter('count')) {
    parameters.count = options.itemsPerPage;
  }

  if (options.hasOwnProperty('page')) {
    if (url.hasParameter('startIndex') && options.hasOwnProperty('itemsPerPage')) {
      parameters.startIndex = (options.page * options.itemsPerPage) + url.indexOffset;
    } else if (url.hasParameter('startPage')) {
      parameters.startPage = options.page + url.pageOffset;
    }
  }

  Object.keys(filterParams).forEach((key) => {
    if (url.hasParameter(key)) {
      parameters[key] = filterParams[key];
    }
  });

  // replace % sign in the value with URL encoded version (%25)
  // to allow search for direct match on parameter containing percent sign without needing to encode it manually
  for (const [key, value] of Object.entries(parameters)) {
    if (typeof value === 'string') {
      parameters[key] = value.replace(/\%/g, '%25');
    }
  }

  // if any of "privileged" filter parameters - like productID are currently set
  // leave only privileged parameters set, discard the rest
  if (options.hasOwnProperty('privilegedParams')) {
    const paramTypes = options.privilegedParams.map(item => item.type);
    const anyPrivilegedContained = paramTypes.some((item) => Object.keys(parameters).includes(item));
    if (anyPrivilegedContained) {
      const filtered = Object.keys(parameters)
        .filter(key => paramTypes.includes(key))
        .reduce((obj, key) => {
          obj[key] = parameters[key];
          return obj;
        }, {});
      return filtered;
    }
  }

  return parameters;
}
