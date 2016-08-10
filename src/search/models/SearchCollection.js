import Backbone from 'backbone';

import searchEOWCS from '../eowcs';
import searchOpenSearch from '../opensearch';

/**
 *
 *
 * @memberof search/models
 */

class SearchCollection extends Backbone.Collection {
  initialize(models, options) {
    this.layerModel = options.layerModel;
    this.filtersModel = options.filtersModel;
  }

  sync(method) {
    if (method !== 'read') {
      throw new Error('SearchCollection only supports reading.');
    }
    let request = null;
    switch (this.layerModel.get('search.protocol')) {
      case 'EO-WCS':
        request = searchEOWCS(this.layerModel, this.filtersModel);
        break;
      case 'OpenSearch':
        request = searchOpenSearch(this.layerModel, this.filtersModel);
        break;
      case '':
        break;
      default:
        throw new Error(`Unsupported search protocol '${this.protocol}'.`);
    }
    return request.then((records) => {
      this.reset(records);
    });
  }
}

export default SearchCollection;
