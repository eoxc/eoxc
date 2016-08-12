import Marionette from 'backbone.marionette';
import SearchResultListView from './SearchResultListView';
const template = require('./SearchResultView.hbs');

const SearchResultView = Marionette.CompositeView.extend(/** @lends search/views/layers.SearchResultView# */{
  template,
  templateHelpers() {
    return {
      nameIds: this.collection.map(model => {
        const layerModel = model.get('searchCollection').layerModel;
        return { id: layerModel.get('id'), name: layerModel.get('displayName') };
      }),
    };
  },

  childView: SearchResultListView,
  childViewContainer: '.tab-content',

  childEvents: {
    'collection:reset': 'onChildCollectionReset',
  },

  initialize(options) {
    this.mapModel = options.mapModel;
  },

  buildChildView(child, ChildViewClass) {
    const options = {
      model: child,
      collection: child.get('searchCollection'),
      mapModel: this.mapModel,
    };
    return new ChildViewClass(options);
  },

  onChildCollectionReset(childView, collection) {
    const $a = this.$(`a[href='#search-results-${collection.layerModel.get('id')}']`);
    $a.text(`${$a.text()} (${collection.length})`);
  },
});

export default SearchResultView;
