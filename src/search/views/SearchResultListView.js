import Marionette from 'backbone.marionette';
import 'marionette.sliding-view';
import 'jquery-lazyload';

import template from './SearchResultListView.hbs';
import './SearchResultListView.css';
import SearchResultItemView from './SearchResultItemView';

const FetchingView = Marionette.ItemView.extend({
  template: () => '<i class="fa fa-circle-o-notch fa-spin"></i>',
});

const ErrorView = Marionette.ItemView.extend({
  template: () => '<i>An error occurred during the search.</i>',
});

const EmptyView = Marionette.ItemView.extend({
  template: () => '<i>No records matched the search.</i>',
});

// const SearchResultListView = Marionette.CompositeView.extend(/** @lends search/views/layers.SearchResultListView# */{
const SearchResultListView = Marionette.SlidingView.extend(/** @lends search/views/layers.SearchResultListView# */{
  initialLowerBound: 0,
  initialUpperBound: 21,
  getLowerBound() {
    return 0;
  },
  getUpperBound() {
    const height = this.$el.height();
    const elemHeight = this.$el.find('li').outerHeight(true);
    const upper = Math.ceil((this.$el.scrollTop() + height) * 3 / elemHeight) + 3;
    if (upper > this.prevUpper) {
      this.prevUpper = upper;
    }
    return this.prevUpper;
  },

  pruneCollection(lowerBound, upperBound) {
    return this.referenceCollection.slice(lowerBound, upperBound);
  },

  template,
  tagName: 'ul',
  className: 'search-result-list list-unstyled list-inline',
  // templateHelpers() {
  //   const totalResults = this.model.get('totalResults');
  //   const maxCount = this.model.get('maxCount');
  //
  //   return {
  //     layerName: this.model.get('layerModel').get('displayName'),
  //     layerId: this.model.get('layerModel').get('id'),
  //     hasMore: totalResults > maxCount,
  //   };
  // },

  childView: SearchResultItemView,
  childViewContainer: 'ul.result-list',

  buildChildView(child, ChildViewClass) {
    return new ChildViewClass({
      model: child,
      searchModel: this.searchModel,
      highlightModel: this.highlightModel,
      downloadSelectionCollection: this.downloadSelectionCollection,
    });
  },

  // getEmptyView() {
  //   if (this.model.get('isSearching')) {
  //     return FetchingView;
  //   } else if (this.model.get('hasError')) {
  //     return ErrorView;
  //   }
  //   return EmptyView;
  // },

  events: {
    'click .btn-load-more': 'onLoadMoreClicked',
    scroll: 'onUpdateEvent',
  },

  childEvents: {
    'item:clicked': 'onItemClicked',
    'item:info': 'onItemInfo',
    'item:hover': 'onItemHover',
    'item:hover:end': 'onItemHoverEnd',
  },

  initialize(options) {
    this.searchModel = options.searchModel;
    this.highlightModel = options.highlightModel;
    this.downloadSelectionCollection = options.downloadSelectionCollection;
    this.finished = false;
    this.previousCollapsed = false;
    this.prevUpper = 0;
  },

  onRender() {
    // create spacer
    this.$el.append('<div class="spacer" style="background-color: red;"></div>');
  },

  _updateCollection() {
    // eslint-ignore-next-line
    Marionette.SlidingView.prototype._updateCollection.call(this);
    this.adjustSpacer();
  },

  adjustSpacer() {
    const $spacer = this.$('.spacer');
    const elemHeight = this.$el.find('li').outerHeight(true);
    const totalHeight = Math.ceil(this.referenceCollection.size() / 3) * elemHeight;
    const displayedHeight = Math.ceil(this.collection.size() / 3) * elemHeight;
    $spacer.height(totalHeight - displayedHeight);
    this.$el.append($spacer);
  },

  onItemClicked(childView) {
    this.trigger('item:clicked', childView.model);
  },

  onItemInfo(childView) {
    this.trigger('item:info', {
      record: childView.model, searchModel: this.searchModel,
    });
  },

  onItemHover(childView) {
    this.highlightModel.highlight(childView.model.attributes);
  },

  onItemHoverEnd(childView) {
    this.highlightModel.unHighlight(childView.model.attributes);
  },

  onLayerVisibleChange() {
    if (this.model.get('layerModel').get('display.visible')) {
      this.$el.show('fast');
    } else {
      this.$el.hide('fast');
    }
  },
});

export default SearchResultListView;
