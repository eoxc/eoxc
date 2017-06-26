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
 * dateline wrapped geometries and adjusting the bbox.
 * @param {object[]} records the retrieved records
 * @returns {object[]} the adjusted records.
 */
export function prepareRecords(records) {
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

      // (re-)calculate the bounding box when not available or when the geometry
      // was adjusted in the step before
      if (!record.bbox || adjustedGeometry) {
        const outer = record.geometry.coordinates[0];
        let minx = outer[0][0];
        let miny = outer[0][1];
        let maxx = outer[0][0];
        let maxy = outer[0][1];

        for (let i = 1; i < outer.length; ++i) {
          minx = Math.min(minx, outer[i][0]);
          miny = Math.min(miny, outer[i][1]);
          maxx = Math.max(maxx, outer[i][0]);
          maxy = Math.max(maxy, outer[i][1]);
        }
        // eslint-disable-next-line no-param-reassign
        record.bbox = [minx, miny, maxx, maxy];
      }
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

  const time = filterParams.time || mapParams.time;
  if (time) {
    if (Array.isArray(time)) {
      parameters['time:start'] = time[0];
      parameters['time:end'] = time[1];
    } else {
      parameters['time:start'] = time;
      parameters['time:end'] = time;
    }
  }

  const area = filterParams.area;
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

  return parameters;
}
