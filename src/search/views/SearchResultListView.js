import Marionette from 'backbone.marionette';

const template = require('./SearchResultListView.hbs');
import SearchResultItemView from './SearchResultItemView';

const FetchingView = Marionette.ItemView.extend({
  template: () => `<i>Fetching.</i>`,
});


const EmptyView = Marionette.ItemView.extend({
  template: () => `<i>No records matched the search.</i>`,
});


const SearchResultListView = Marionette.CompositeView.extend(/** @lends search/views/layers.SearchResultListView# */{
  template,
  childView: SearchResultItemView,
  childViewContainer: 'ul',

  getEmptyView() {
    if (this.finished) {
      return EmptyView;
    }
    return FetchingView;
  },

  childEvents: {
    'item:clicked': 'onItemClicked',
    'item:hover': 'onItemHover',
    'item:hover:end': 'onItemHoverEnd',
  },

  collectionEvents: {
    reset: 'onCollectionReset',
  },

  initialize(options) {
    this.mapModel = options.mapModel;
    this.finished = false;
  },

  templateHelpers() {
    return {
      layerName: this.collection.layerModel.get('displayName'),
      layerId: this.collection.layerModel.get('id'),
    }
  },

  onRender() {
    this.$el.attr({
      role: 'tabpanel',
      id: `search-results-${this.collection.layerModel.get('id')}`,
      'class': 'tab-pane',
    });
    if (this.model.collection.indexOf(this.model) === 0) {
      this.$el.addClass('active');
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

  onCollectionReset() {
    this.finished = true;
    this.trigger('collection:reset', this.collection);
  },
});

export default SearchResultListView;
