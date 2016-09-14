import { discover } from 'opensearch-browser';

function convertFilters(filtersModel, options, service) {
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

export default function search(layerModel, filtersModel, options = {}) {
  const url = layerModel.get('search.url');


  // see if we already have a service Promise cached
  if (!services[url]) {
    // add a new promise
    services[url] = discover(url);
  }
  return services[url]
    .then(service => {
      const parameters = convertFilters(filtersModel, options, service);
      return service.search(parameters, options.mimeType, 'POST');
    });
}
