import { discover, config as configureOpenSearch } from 'opensearch-browser';
import { PagedSearchProgressEmitter } from 'opensearch-browser/paginator';
import BluebirdPromise from 'bluebird';

// eslint-disable-next-line
import OpenSearchWorker from 'worker-loader!./OpenSearchWorker';
import { convertFilters, prepareRecords } from './common';

BluebirdPromise.config({
  cancellation: true,
});

configureOpenSearch({
  useXHR: true,
});

// cached services
const services = {};
const serializedServices = {};

function getService(url) {
  if (!services[url]) {
    // add a new promise
    services[url] = discover(url, { useXHR: true, PromiseClass: BluebirdPromise })
      .then((service) => {
        serializedServices[url] = service.serialize();
        return service;
      });
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

// const worker = new OpenSearchWorker();

export function searchAllRecords(layerModel, filtersModel, mapModel, options = {}) {
  const url = layerModel.get('search.url');
  const method = layerModel.get('search.method');
  const format = options.mimeType || layerModel.get('search.format') || null;

  const filterParams = filtersModel.toJSON();
  const mapParams = mapModel ? mapModel.toJSON() : null;

  const emitter = new PagedSearchProgressEmitter();

  const description = serializedServices[url];

  let worker = new OpenSearchWorker();
  worker.postMessage(['searchAll', {
    url, method, filterParams, mapParams, options, format, description
  }]);

  worker.onmessage = ({ data }) => {
    emitter.emit(...data);
  };

  const terminate = () => {
    if (worker) {
      worker.postMessage(['terminate']);
      worker = null;
    }
  };

  // TODO: does this cancel the requests? sure hope so
  emitter.on('cancel', () => terminate());
  emitter.on('success', () => terminate());
  emitter.on('error', () => terminate());

  return emitter;
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

export function getSearchRequest(layerModel, filtersModel, mapModel, options) {
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
      return service.createSearchRequest(parameters, format, method || 'GET', false, true);
    });
}
