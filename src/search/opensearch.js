import { discover } from 'opensearch';

function convertFilters(filtersModel) {
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
    parameters['geo:box'] = area;
  }

  return parameters;
}

function prepareRecords(records) {
  return records.map(record => {


    return record;
  });
}

// cached services
const services = {};

export default function search(layerModel, filtersModel, mimeType) {
  const url = layerModel.get('search.url');
  const parameters = convertFilters(filtersModel);

  // see if we already have a service Promise cached
  if (!services[url]) {
    // add a new promise
    services[url] = discover(url);
  }
  return services[url]
    .then(service => service.search(parameters, mimeType))
    .then(prepareRecords);
}
