import { discover, config } from 'opensearch-browser';
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

function getService(url) {
  if (!self.services[url]) {
    // add a new promise
    self.services[url] = discover(url, { useXHR: true, PromiseClass: BluebirdPromise });
    // self.services[url] = discover(url, { useXHR: true });
  }
  return self.services[url];
}

function searchAll(url, method, filterParams, mapParams, options, format) {
  const maxCount = options.maxCount;

  return getService(url)
    .then((service) => {
      const parameters = convertFilters(filterParams, mapParams, options, format, service);
      const paginator = service.getPaginator(parameters, format, method, {
        baseOffset: options.startIndex,
      });
      return paginator.searchFirstRecords(maxCount);
    });
}


self.onmessage = function onMessage({ data }) {
  const [operation, id, params] = data;
  let promise = null;
  switch (operation) {
    case 'searchAll': {
      const { url, method, filterParams, mapParams, options, format } = params;
      promise = searchAll(url, method, filterParams, mapParams, options, format);
      break;
    }
    case 'cancel': {
      const previousPromise = self.promises[id];
      if (previousPromise) {
        delete self.promises[id];
        previousPromise.cancel();
      }
      break;
    }
    default:
      break;
  }

  if (promise) {
    self.promises[id] = promise;
    promise
      .then((result) => {
        delete self.promises[id];
        this.postMessage(['success', id, result]);
      })
      .catch((error) => {
        delete self.promises[id];
        this.postMessage(['error', id, error.toString()]);
        throw error;
      });
  }
};

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
      const { url, method, filterParams, mapParams, options, format } = params;
      self.search = searchAll(url, method, filterParams, mapParams, options, format);
      self.search
        .then((emitter) => {
          self.emitter = emitter;
          emitter
            .on('page', page => self.postMessage(['progress', page]))
            .on('success', result => self.postMessage(['success', result]))
            .on('error', error => self.postMessage(['error', error.toString()]));
        });
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
