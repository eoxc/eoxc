import Marionette from 'backbone.marionette';

const template = require('./SearchResultListView.hbs');
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

const SearchResultListView = Marionette.CompositeView.extend(/** @lends search/views/layers.SearchResultListView# */{
  template,
  templateHelpers() {
    const pages = [];

    const totalResults = this.model.get('totalResults');
    const currentPage = this.model.get('currentPage');

    // this is messed up on some OpenSearch servers
    // const pageSize = this.model.get('itemsPerPage') || this.model.get('defaultPageSize');
    const pageSize = this.model.get('defaultPageSize');

    if (typeof totalResults === 'undefined') {
      // don't know page size
    } else {
      const totalPages = Math.ceil(totalResults / pageSize);
      for (let i = -3; i <= 3; ++i) {
        if ((currentPage + i) >= 0 && (currentPage + i) < totalPages) {
          pages.push({
            showNumber: currentPage + i + 1,
            number: currentPage + i,
            current: i === 0,
          });
        }
      }
    }
    return {
      layerName: this.model.get('layerModel').get('displayName'),
      layerId: this.model.get('layerModel').get('id'),
      showPagination: (!this.model.get('isSearching') && !this.model.get('hasError')),
      showLeftArrow: true,
      showRightArrow: true,
      pages,
    };
  },

  childView: SearchResultItemView,
  childViewContainer: 'ul.result-list',

  getEmptyView() {
    if (this.model.get('isSearching')) {
      return FetchingView;
    } else if (this.model.get('hasError')) {
      return ErrorView;
    }
    return EmptyView;
  },

  events: {
    'click [data-page]': 'onPageClicked',
  },

  childEvents: {
    'item:clicked': 'onItemClicked',
    'item:hover': 'onItemHover',
    'item:hover:end': 'onItemHoverEnd',
  },

  collectionEvents: {
    reset: 'onCollectionReset', // TODO
  },

  modelEvents: {
    change: 'render',
    'search:complete': 'onSearchComplete',
  },

  initialize(options) {
    this.mapModel = options.mapModel;
    this.finished = false;
    this.listenTo(this.model.get('layerModel'), 'change:display.visible', this.onLayerVisibleChange);
  },

  onRender() {
    if (!this.model.get('layerModel').get('display.visible')) {
      this.$el.hide();
    }
  },

  onItemClicked(childView) {
    this.trigger('item:clicked', childView.model);
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

  onSearchComplete() {
    // TODO
  },

  onPageClicked(event) {
    this.model.searchPage(event.currentTarget.dataset.page);
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
