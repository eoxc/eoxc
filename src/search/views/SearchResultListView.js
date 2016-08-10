import Marionette from 'backbone.marionette';

const template = require('./SearchResultListView.hbs');
import SearchResultItemView from './SearchResultItemView';


const SearchResultListView = Marionette.CompositeView.extend(/** @lends search/views/layers.SearchResultListView# */{
  template,
  childView: SearchResultItemView,
  childViewContainer: 'ul',

  childEvents: {
    'item:clicked': 'onItemClicked',
    'item:hover': 'onItemHover',
    'item:hover:end': 'onItemHoverEnd',
  },

  initialize(options) {
    this.mapModel = options.mapModel;
  },

  templateHelpers() {
    return {
      layerName: this.collection.layerModel.get('displayName'),
      layerId: this.collection.layerModel.get('id'),
    }
  },


  onItemClicked(childView) {

  },

  onItemHover(childView) {
    this.mapModel.highlight(childView.model.attributes);
  },

  onItemHoverEnd(childView) {
    this.mapModel.unHighlight(childView.model.attributes);
  },
});

export default SearchResultListView;
