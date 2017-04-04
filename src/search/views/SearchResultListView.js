import Backbone from 'backbone';
import Marionette from 'backbone.marionette';
import 'jquery-lazyload';

import template from './SearchResultListView.hbs';
import './SearchResultListView.css';
import SearchResultItemView from './SearchResultItemView';

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
    this.finished = false;
    this.previousCollapsed = false;
    this.prevUpper = 0;
    this.availableSpace = options.availableSpace;

    this.isClosed = false;

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

  /*
                    /----------\        -
    headerHeight    |  title   |        |
                    |          |        |- scrollTop
                    |          |        |
                  /----------------\    - -
                  | |          |   |    | |
                  | |          | = |    | |- offset
                  | |          | = |    | |
                  | \----------/ = |    | -
                  | /----------\ = |    |
                  | |  title   | = |    |- sliceHeight
                  | \----------/ = |    |
                  | /----------\   |    |
                  | |  title   |   |    |
                  | |          |   |    |
                  \----------------/    -
                    |          |
                    |          |
                    \----------/


                    /----------\        -
    headerHeight    |  title   |        |
                    |          |        |- scrollTop
                    |          |        |
                  /----------------\    - -
                  | |          |   |    | |
                  | |          | = |    | |- offset + titleHeight
                  | |          | = |    | |
                  | \----------/ = |    | |
                  | /----------\ = |    | |
                  | |  title   | = |    | |
                  | |          |   |    | -
                  | |          |   |    |
                  | |          |   |    |
                  | |          |   |    |
                  | \----------/ = |    |
                  | /----------\   |    |
                  | |  title   |   |    |
                  | |          |   |    |
                  \----------------/    -
                    |          |
                    |          |
                    \----------/
  */

  setSlice(offset, sliceHeight) {

    console.log(this.model.get('layerModel').get('id'), this.referenceCollection.length);
    console.log(offset, sliceHeight);

    const size = this.calculateSize();
    const headerHeight = 37;
    const itemHeight = 143;
    const numItems = this.referenceCollection.length;
    let first = 0;
    let last = 0;
    if (offset + size < 0 // this view is completely above the current window
        || offset > sliceHeight) { // this view is completely below the current window
      first = last = numItems;
    } else {
      const firstOffset = offset + headerHeight;
      if (firstOffset < -itemHeight) {
        const firstRow = Math.floor(Math.abs(firstOffset) / itemHeight);
        first = firstRow * 3;
      }
      const lastRow = Math.ceil(Math.abs(-firstOffset + sliceHeight) / itemHeight);
      last = lastRow * 3;
    }
    this.collection.set(this.referenceCollection.slice(first, last));
    this.$('.spacer-top').css('height', Math.ceil(first / 3) * itemHeight);
    this.$('.spacer-bottom').css('height', Math.ceil((numItems - last) / 3) * itemHeight);
  },

  _calculateItemsSize(numItems) {
    const itemHeight = 143;
    return Math.ceil(numItems / 3) * itemHeight;
  },

  calculateSize() {
    const headerHeight = 37;
    const footerHeight = 0;
    if (this.isClosed) {
      return headerHeight;
    }
    // TODO: footer size
    return this._calculateItemsSize(this.referenceCollection.length)
      + headerHeight + footerHeight;
  },

  hasMore() {
    const totalResults = this.model.get('totalResults');
    const hasLoaded = this.model.get('hasLoaded');
    return (
      typeof totalResults !== 'undefined'
      && typeof hasLoaded !== 'undefined' ? totalResults > hasLoaded : false
    );
  }

});

export default SearchResultListView;
