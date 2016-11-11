// import eowcs from './eowcs';
// import opensearch from './opensearch';

// does not seem to work with above imports...
const eowcs = require('./eowcs');
const opensearch = require('./opensearch');

export function search(layerModel, filtersModel, mapModel, options) {
  switch (layerModel.get('search.protocol')) {
    case 'EO-WCS':
      return eowcs.search(
        layerModel, filtersModel, mapModel, options
      );
    case 'OpenSearch':
      return opensearch.search(
        layerModel, filtersModel, mapModel, options
      );
    default:
      throw new Error(`Unsupported search protocol '${layerModel.get('search.protocol')}'.`);
  }
}

export function searchAllRecords(layerModel, filtersModel, mapModel, options) {
  switch (layerModel.get('search.protocol')) {
    case 'EO-WCS':
      return eowcs.search(
        layerModel, filtersModel, mapModel, options
      );
    case 'OpenSearch':
      return opensearch.searchAllRecords(
        layerModel, filtersModel, mapModel, options
      );
    default:
      throw new Error(`Unsupported search protocol '${layerModel.get('search.protocol')}'.`);
  }
}

export function getParameters(layerModel) {
  switch (layerModel.get('search.protocol')) {
    case 'EO-WCS':
      return eowcs.getParameters(layerModel);
    case 'OpenSearch':
      return opensearch.getParameters(layerModel);
    default:
      throw new Error(`Unsupported search protocol '${layerModel.get('search.protocol')}'.`);
  }
}
