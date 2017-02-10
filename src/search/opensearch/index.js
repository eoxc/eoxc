import { discover, config as configureOpenSearch } from 'opensearch-browser';
import BluebirdPromise from 'bluebird';

// eslint-disable-next-line
import OpenSearchWorker from 'worker-loader?inline!./OpenSearchWorker';
import { convertFilters, prepareRecords } from './common';

BluebirdPromise.config({
  cancellation: true,
});

configureOpenSearch({
  useXHR: true,
});

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
    .then((service) => {
      const parameters = convertFilters(
        filtersModel ? filtersModel.attributes : {},
        mapModel ? mapModel.attributes : {},
        options, format, service
      );
      return service.search(parameters, format, method || 'GET', false, true);
    })
    .then((result) => {
      // eslint-disable-next-line no-param-reassign
      result.records = prepareRecords(result.records);
      return result;
    });
}

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

  return new BluebirdPromise((resolve, reject, onCancel) => {
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
    if (onCancel && typeof onCancel === 'function') {
      onCancel(() => {
        worker.postMessage(['cancel', currentId]);
      });
    }
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
