import Marionette from 'backbone.marionette';
import SearchResultListView from './SearchResultListView';


const SearchResultView = Marionette.CollectionView.extend(/** @lends search/views/layers.SearchResultView# */{
  childView: SearchResultListView,

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
});

export default SearchResultView;
