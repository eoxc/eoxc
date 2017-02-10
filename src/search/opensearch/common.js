
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

export function prepareRecords(records) {
  return records.map((record) => {
    if (record.geometry && record.geometry.type === 'Polygon') {
      for (let ringIndex = 0; ringIndex < record.geometry.coordinates.length; ++ringIndex) {
        const ring = record.geometry.coordinates[ringIndex];
        let last = null;
        for (let i = 0; i < ring.length; ++i) {
          const current = ring[i];
          if (last) {
            if (current[0] - last[0] < -180) {
              current[0] += 360;
            }
            if (current[0] - last[0] > 180) {
              current[0] -= 360;
            }
          }
          last = current;
        }
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
  } else if (mapParams.bbox) {
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
