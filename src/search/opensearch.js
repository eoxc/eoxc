import { discover } from 'opensearch-browser';
import { setPromiseClass } from 'opensearch-browser/src/config';
const BluebirdPromise = require('bluebird');


import OpenSearchWorker from 'worker-loader!./OpenSearchWorker.js';


// TODO: not necessary in Bluebird anymore??
// BluebirdPromise.config({
//   warnings: false,
//   longStackTraces: false,
//   cancellation: true,
//   monitoring: false,
// });

setPromiseClass(BluebirdPromise);

function prepareBox(bbox) {
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

/**
 * Convert a filters model, map model, and options to an OpenSearch parameters
 * object
 */
function convertFilters(filtersModel, mapModel, options, format, service) {
  const description = service.getDescription();
  const url = description.getUrl(null, format || null);

  const parameters = {};

  const time = filtersModel.get('time') || mapModel.get('time');
  if (time) {
    if (Array.isArray(time)) {
      parameters['time:start'] = time[0];
      parameters['time:end'] = time[1];
    } else {
      parameters['time:start'] = time;
      parameters['time:end'] = time;
    }
  }

  const area = filtersModel.get('area');
  if (area) {
    if (Array.isArray(area)) {
      parameters['geo:box'] = prepareBox(area);
    } else if (area.geometry) {
      const geometry = area.geometry;
      if (geometry.type === 'Point' && url.hasParameter('geo:lon') && url.hasParameter('geo:lat')) {
        parameters['geo:lon'] = geometry.coordinates[0];
        parameters['geo:lat'] = geometry.coordinates[1];
      } else {
        parameters['geo:geometry'] = geometry;
      }
    }
  } else if (mapModel) {
    // use the maps BBox by default
    parameters['geo:box'] = prepareBox(mapModel.get('bbox'));
  }

  if (options.hasOwnProperty('itemsPerPage') && url.hasParameter('count')) {
    parameters.count = options.itemsPerPage;
  }

  if (options.hasOwnProperty('page')) {
    if (url.hasParameter('startIndex') && options.hasOwnProperty('itemsPerPage')) {
      parameters.startIndex = options.page * options.itemsPerPage + url.indexOffset;
    } else if (url.hasParameter('startPage')) {
      parameters.startPage = options.page + url.pageOffset;
    }
  }

  Object.keys(filtersModel.attributes).forEach((key) => {
    if (url.hasParameter(key)) {
      parameters[key] = filtersModel.get(key);
    }
  });

  return parameters;
}

function getMaxPageSize(urlObj) {
  const param = urlObj.getParameter('count');
  if (param) {
    return param.maxInclusive ? param.maxInclusive : param.maxExclusive - 1;
  }
  return null;
}

function prepareRecords(records) {
  return records.map(record => {
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

// cached services
const services = {};

function getService(url) {
  if (!services[url]) {
    // add a new promise
    services[url] = discover(url, { useXHR: true, PromiseClass: BluebirdPromise });
  }
  return services[url];
}

export function search(layerModel, filtersModel, mapModel, options = {}) {
  const url = layerModel.get('search.url');
  const method = layerModel.get('search.method');
  const format = options.mimeType || layerModel.get('search.format') || null;

  return getService(url)
    .then(service => {
      const parameters = convertFilters(filtersModel, mapModel, options, format, service);
      return service.search(parameters, format, method || 'GET', false, true);
    })
    .then(result => {
      result.records = prepareRecords(result.records);
      return result;
    });
}
//
// export function searchAllRecords(layerModel, filtersModel, mapModel, options = {}) {
//   const url = layerModel.get('search.url');
//   const method = layerModel.get('search.method');
//   const format = options.mimeType || layerModel.get('search.format') || null;
//   const maxCount = options.maxCount;
//
//   return getService(url)
//     .then(service => {
//       const parameters = convertFilters(filtersModel, mapModel, options, format, service);
//       const paginator = service.getPaginator(parameters, format, method, true);
//       if (maxCount) {
//         return paginator.fetchFirstRecords(maxCount)
//           .then(result => ({
//             totalResults: result.totalResults,
//             itemsPerPage: result.itemsPerPage,
//             startIndex: result.startIndex,
//             records: prepareRecords(result.records),
//           }));
//       }
//       return paginator.fetchAllRecords()
//         .then(result => ({
//           totalResults: result.totalResults,
//           itemsPerPage: result.itemsPerPage,
//           startIndex: result.startIndex,
//           records: prepareRecords(result.records),
//         }));
//     });
// }

const worker = new OpenSearchWorker();
let id = 0;

export function searchAllRecords(layerModel, filtersModel, mapModel, options = {}) {
  const url = layerModel.get('search.url');
  const method = layerModel.get('search.method');
  const format = options.mimeType || layerModel.get('search.format') || null;

  const currentId = ++id;

  const filterParams = filtersModel.toJSON();
  const mapParams = mapModel ? mapModel.toJSON() : null;

  return new Promise((resolve, reject) => {
    const cb = (event) => {
      const [status, resultId, result] = event.data;
      if (currentId === resultId) {
        worker.removeEventListener('message', cb);

        if (status === 'success') {
          resolve(result);
        } else {
          reject(result);
        }
      }
    };
    worker.addEventListener('message', cb);
    worker.postMessage([
      'searchAll', currentId, {
        url, method, filterParams, mapParams, options, format,
      },
    ]);
  });
}


export function getParameters(layerModel) {
  const url = layerModel.get('search.url');
  const method = layerModel.get('search.method');
  const format = layerModel.get('search.format');

  return getService(url)
    .then(service => service
      .getDescription()
      .getUrl(null, format, method)
      .parameters
    );
}
