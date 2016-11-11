import { discover } from 'opensearch-browser';

function convertFilters(filtersModel, mapModel, options, service) {
  const description = service.getDescription();
  const url = description.getUrl(null, options.mimeType || null);

  const parameters = {};

  const time = filtersModel.get('time');
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
      parameters['geo:box'] = area;
    } else if (area.geometry) {
      const geometry = area.geometry;
      if (geometry.type === 'Point') {
        parameters['geo:lon'] = geometry.coordinates[0];
        parameters['geo:lat'] = geometry.coordinates[1];
      } else {
        parameters['geo:geometry'] = geometry;
      }
    }
  } else if (mapModel) {
    // use the maps BBox by default
    parameters['geo:box'] = mapModel.get('bbox');
  }

  if (options.hasOwnProperty('itemsPerPage') && url.hasParameter('count')) {
    parameters.count = options.itemsPerPage;
  }

  if (options.hasOwnProperty('page')) {
    if (url.hasParameter('startPage')) {
      // TODO: 0 or 1 based page numbers?
      parameters.startPage = options.page;
    } else if (url.hasParameter('startIndex') && options.hasOwnProperty('itemsPerPage')) {
      // TODO: 0 or 1 based indices?
      parameters.startIndex = options.page * options.itemsPerPage;
    }
  }

  return parameters;
}

// cached services
const services = {};

function getService(url) {
  if (!services[url]) {
    // add a new promise
    services[url] = discover(url);
  }
  return services[url];
}

export function search(layerModel, filtersModel, mapModel, options = {}) {
  const url = layerModel.get('search.url');
  const method = layerModel.get('search.method');
  const format = layerModel.get('search.format');

  return getService(url)
    .then(service => {
      const parameters = convertFilters(filtersModel, mapModel, options, service);
      return service.search(parameters, options.mimeType || format, method || 'GET');
    });
}

export function searchAllRecords(layerModel, filtersModel, mapModel, options = {}) {
  const url = layerModel.get('search.url');
  const method = layerModel.get('search.method');
  const format = layerModel.get('search.format');

  return getService(url)
    .then(service => {
      const parameters = convertFilters(filtersModel, mapModel, options, service);
      const description = service.getDescription();
      const urlObj = description.getUrl(null, options.mimeType || null);
      if (urlObj.hasParameter('count')) {
        parameters.count = 0;
      }

      return service.search(parameters, options.mimeType || format, method || 'GET')
        .then(result => {
          const numPages = Math.ceil(result.totalResults / 50);
          const promises = [];
          for (let i = 0; i < numPages; ++i) {
            const newOptions = Object.assign({}, options, {
              itemsPerPage: 50,
              page: i,
            });
            const innerParameters = convertFilters(filtersModel, mapModel, newOptions, service);
            promises.push(
              service.search(innerParameters, options.mimeType || format, method || 'GET')
            );
          }
          return Promise.all(promises)
            .then(results => ({
              totalResults: result.totalResults,
              startIndex: 0,
              itemsPerPage: result.totalResults,
              records: [].concat.apply([], results.map(r => r.records)),
            }));
        });
    });

}

export function getParameters(layerModel) {
  const url = layerModel.get('search.url');
  const method = layerModel.get('search.method');
  const format = layerModel.get('search.format');

  return getService(url)
    // .then(service => {
    //   console.log(service.getDescription().getUrls());
    // });
    .then(service => service
      .getDescription()
      .getUrl(null, format, method)
      .parameters
    );
}
