import searchEOWCS from './eowcs';
import searchOpenSearch from './opensearch';

export default function search(layerModel, filtersModel, mapModel, options) {
  switch (layerModel.get('search.protocol')) {
    case 'EO-WCS':
      return searchEOWCS(
        layerModel, filtersModel, mapModel, options
      );
    case 'OpenSearch':
      return searchOpenSearch(
        layerModel, filtersModel, mapModel, options
      );
    default:
      throw new Error(`Unsupported search protocol '${layerModel.get('search.protocol')}'.`);
  }
}
