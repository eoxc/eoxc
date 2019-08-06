import 'core-js/features/array/from';
import 'core-js/features/object/assign';

import { discover, config, deserialize } from 'opensearch-browser';
import { DOMParser } from 'xmldom';
import BluebirdPromise from 'bluebird';

import { convertFilters, prepareRecords } from './common';

BluebirdPromise.config({
  cancellation: true,
});
config({
  useXHR: true,
});

self.Promise = BluebirdPromise;
self.DOMParser = DOMParser;

self.services = {};
self.promises = {};

function getService(url, description) {
  if (!self.services[url]) {
    if (description) {
      self.services[url] = BluebirdPromise.resolve(deserialize(description));
    } else {
      self.services[url] = discover(url, { useXHR: true, PromiseClass: BluebirdPromise });
    }
  }
  return self.services[url];
}

function searchAll(url, method, filterParams, mapParams, options, format, description, maxUrlLength, dropEmptyParameters, parseOptions) {
  const maxCount = options.maxCount;

  return getService(url, description)
    .then((service) => {
      const parameters = convertFilters(filterParams, mapParams, options, format, service);
      const paginator = service.getPaginator(parameters, {
        type: format,
        method,
        baseOffset: options.startIndex,
        maxUrlLength,
        dropEmptyParameters,
        parseOptions,
      });
      return paginator.searchFirstRecords(maxCount);
    });
}

function cancel() {
  if (self.search) {
    self.search.cancel();
    self.search = null;
  }
  if (self.emitter) {
    self.emitter.emit('cancel');
    self.emitter = null;
  }
}

self.onmessage = function onMessage({ data }) {
  const [operation, params] = data;
  switch (operation) {
    case 'searchAll': {
      const {
        url, method, filterParams, mapParams, options, format, description,
        maxUrlLength, dropEmptyParameters, parseOptions, switchMultiPolygonCoordinates
      } = params;
      self.search = searchAll(
        url, method, filterParams, mapParams, options, format, description,
        maxUrlLength, dropEmptyParameters, parseOptions
      );
      self.search
        .then((emitter) => {
          self.emitter = emitter;
          emitter
            .on('page', page => self.postMessage(['progress', Object.assign(page, { records: prepareRecords(page.records, switchMultiPolygonCoordinates) })]))
            .on('success', result => self.postMessage(['success', Object.assign(result, { records: prepareRecords(result.records, switchMultiPolygonCoordinates) })]))
            .on('error', error => self.postMessage(['error', error.toString()]));
        }, error => self.postMessage(['error', error.toString()]));
      break;
    }
    case 'cancel':
      cancel();
      break;
    case 'terminate':
      cancel();
      self.close();
      break;
    default:
      break;
  }
};
