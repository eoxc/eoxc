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

function searchAll(url, method, filterParams, mapParams, options, format, description) {
  const maxCount = options.maxCount;

  return getService(url, description)
    .then((service) => {
      const parameters = convertFilters(filterParams, mapParams, options, format, service);
      const paginator = service.getPaginator(parameters, format, method, {
        baseOffset: options.startIndex,
      });
      return paginator.searchFirstRecords(maxCount);
    });
}

function cancel() {
  if (self.search) {
    self.search.cancel();
    self.search = null;
  }
  // if (self.emitter && typeof self.emitter.cancel === 'function') {
  //   self.emitter.cancel();
  //   self.emitter = null;
  // }
  if (self.emitter) {
    self.emitter.emit('cancel');
    self.emitter = null;
  }
}

self.onmessage = function onMessage({ data }) {
  const [operation, params] = data;
  switch (operation) {
    case 'searchAll': {
      const { url, method, filterParams, mapParams, options, format, description } = params;
      self.search = searchAll(url, method, filterParams, mapParams, options, format, description);
      self.search
        .then((emitter) => {
          self.emitter = emitter;
          emitter
            .on('page', page => self.postMessage(['progress', page]))
            .on('success', result => self.postMessage(['success', result]))
            .on('error', error => self.postMessage(['error', error.toString()]));
        })
        .catch(error => self.postMessage(['error', error.toString()]));
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
