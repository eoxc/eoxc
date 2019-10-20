import Backbone from 'backbone';
import Marionette from 'backbone.marionette';
import 'jquery-lazyload';

import template from './SearchResultListView.hbs';
import './SearchResultListView.css';
import SearchResultItemView from './SearchResultItemView';
import { setSlice } from '../utils';

// eslint-disable-next-line max-len
const SearchResultListView = Marionette.CompositeView.extend(/** @lends search/views/layers.SearchResultListView# */{
  template,
  templateHelpers() {
    const hasMore = this.hasMore();
    return {
      layerName: this.model.get('layerModel').get('displayName'),
      layerId: this.model.cid,
      isClosed: this.isClosed,
      hasMore,
      countLoadMore: hasMore ? Math.min(this.model.get('totalResults') - this.model.get('hasLoaded'), this.model.get('loadMore')) : 0,
      hasMoreOrIsSearching: hasMore || this.model.get('isSearching'),
    };
  },
  tagName: 'ul',
  className: 'search-result-list list-unstyled list-inline',

  childView: SearchResultItemView,
  childViewContainer: 'ul.result-list',

  buildChildView(child, ChildViewClass) {
    return new ChildViewClass({
      model: child,
      searchModel: this.model,
      highlightModel: this.highlightModel,
      fallbackThumbnailUrl: this.fallbackThumbnailUrl,
    });
  },

  events: {
    'click .btn-load-more': 'onLoadMoreClicked',
    'shown.bs.collapse': 'onShown',
    'hidden.bs.collapse': 'onHidden'
  },

  childEvents: {
    'item:clicked': 'onItemClicked',
    'item:info': 'onItemInfo',
    'item:hover': 'onItemHover',
    'item:hover:end': 'onItemHoverEnd',
  },

  constructor(options) {
    Marionette.CompositeView.prototype.constructor.call(this, Object.assign({}, options, {
      collection: new Backbone.Collection(),
    }));
  },

  initialize(options) {
    this.searchModel = options.searchModel;
    this.highlightModel = options.highlightModel;
    this.downloadSelectionCollection = options.downloadSelectionCollection;
    this.fallbackThumbnailUrl = options.fallbackThumbnailUrl;
    this.isClosed = false;

    this.setSlice = setSlice;
    this.referenceCollection = options.referenceCollection;

    this.listenTo(this.model, 'change', this.render, this);
  },

  onLoadMoreClicked() {
    this.model.searchMore();
  },

  onShown() {
    this.isClosed = false;
    this.triggerMethod('collapse:change');
  },

  onHidden() {
    this.isClosed = true;
    this.triggerMethod('collapse:change');
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

  hasMore() {
    if (this.model.get('hasError')) {
      return false;
    }
    const totalResults = this.model.get('totalResults');
    const hasLoaded = this.model.get('hasLoaded');
    return (
      typeof totalResults !== 'undefined'
      && typeof hasLoaded !== 'undefined' ? totalResults > hasLoaded : false
    );
  }
});

export default SearchResultListView;
