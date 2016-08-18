import Marionette from 'backbone.marionette';
import SearchResultListView from './SearchResultListView';
const template = require('./SearchResultView.hbs');

const SearchResultView = Marionette.CompositeView.extend(/** @lends search/views/layers.SearchResultView# */{
  template,
  childView: SearchResultListView,

  childViewContainer: '.result-contents',

  childEvents: {
    'collection:reset': 'onChildCollectionReset',
    'item:clicked': 'onResultItemClicked',
  },

  initialize(options) {
    this.mapModel = options.mapModel;
    this.onResultItemClicked = options.onResultItemClicked;
  },

  buildChildView(child, ChildViewClass) {
    const options = {
      model: child,
      collection: child.get('results'),
      mapModel: this.mapModel,
    };
    return new ChildViewClass(options);
  },

  onChildCollectionReset(childView, collection) {
    const $a = this.$(`a[href='#search-results-${childView.model.get('layerModel').get('id')}']`);
    $a.text(`${childView.model.get('layerModel').get('displayName')} (${collection.length})`);
  },
});

export default SearchResultView;
