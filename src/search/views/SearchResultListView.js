import Marionette from 'backbone.marionette';
import 'marionette.sliding-view';
import 'jquery-lazyload';

import template from './SearchResultListView.hbs';
import './SearchResultListView.css';
import SearchResultItemView from './SearchResultItemView';

const SearchResultListView = Marionette.SlidingView.extend(/** @lends search/views/layers.SearchResultListView# */{
  initialLowerBound: 0,
  initialUpperBound() {
    return 21;
  },
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

  childView: SearchResultItemView,
  childViewContainer: 'ul.result-list',

  buildChildView(child, ChildViewClass) {
    return new ChildViewClass({
      model: child,
      searchModel: this.searchModel,
      highlightModel: this.highlightModel,
    });
  },

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
    // const height = Math.ceil(this.referenceCollection.length / 3) * 157;
    this.$el.append('<div class="spacer"></div>');
    this.adjustSpacer();
  },

  _updateCollection() {
    // eslint-ignore-next-line
    Marionette.SlidingView.prototype._updateCollection.call(this);
    this.adjustSpacer();
  },

  adjustSpacer() {
    const $spacer = this.$('.spacer');
    // .outerHeight gives wrong size on FF. Use the hardcoded value until better option
    // const elemHeight = this.$el.find('li').outerHeight(true) || 157;
    const elemHeight = 157;
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
});

export default SearchResultListView;
