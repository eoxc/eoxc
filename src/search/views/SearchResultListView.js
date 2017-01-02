import Marionette from 'backbone.marionette';

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

const SearchResultListView = Marionette.CompositeView.extend(/** @lends search/views/layers.SearchResultListView# */{
  template,
  templateHelpers() {
    const pages = [];

    const totalResults = this.model.get('totalResults');
    const currentPage = this.model.get('currentPage');

    // this is messed up on some OpenSearch servers
    // const pageSize = this.model.get('itemsPerPage') || this.model.get('defaultPageSize');
    const pageSize = this.model.get('defaultPageSize');

    let prevPage = null;
    let nextPage = null;
    let firstPage = null;
    let lastPage = null;

    if (typeof totalResults === 'undefined') {
      // don't know page size
    } else {
      const totalPages = Math.ceil(totalResults / pageSize);

      if (currentPage > 0) {
        firstPage = { number: 0 };
      }
      if (currentPage < totalPages) {
        lastPage = { number: totalPages - 1 };
      }

      for (let i = -3; i <= 3; ++i) {
        if ((currentPage + i) >= 0 && (currentPage + i) < totalPages) {
          const page = {
            showNumber: currentPage + i + 1,
            number: currentPage + i,
            current: i === 0,
          };
          if (i === -1) {
            prevPage = page;
          } else if (i === 1) {
            nextPage = page;
          }
          pages.push(page);
        }
      }
    }
    return {
      layerName: this.model.get('layerModel').get('displayName'),
      layerId: this.model.get('layerModel').get('id'),
      showPagination: (!this.model.get('isSearching')
                      && !this.model.get('hasError'))
                      && pages.length > 1,
      firstPage,
      lastPage,
      prevPage,
      nextPage,
      pages,
    };
  },

  childView: SearchResultItemView,
  childViewContainer: 'ul.result-list',

  buildChildView(child, ChildViewClass) {
    return new ChildViewClass({
      model: child,
      highlightModel: this.highlightModel,
      downloadSelectionCollection: this.downloadSelectionCollection,
    });
  },

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
    'scroll .panel-body': 'onScroll',
    'scroll .panel-collapse': 'onScroll',
    'scroll .result-list': 'onScroll',
  },

  childEvents: {
    'item:clicked': 'onItemClicked',
    'item:info': 'onItemInfo',
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
    this.highlightModel = options.highlightModel;
    this.downloadSelectionCollection = options.downloadSelectionCollection;
    this.finished = false;
    this.listenTo(this.model.get('layerModel'), 'change:display.visible', this.onLayerVisibleChange);
    this.previousCollapsed = false;
  },

  onBeforeRender(){
    const $collPanel = this.$('#collapse-'+this.model.get('layerModel').get('id'));
    if($collPanel.length){
      this.previousCollapsed = !$collPanel.hasClass('in');
    }
  },

  onRender() {
    if (!this.model.get('layerModel').get('display.visible')) {
      this.$el.hide();
    }
    // this does not work with the usual events dict for some reason...
    this.$('.panel-body').bind('scroll', (...args) => this.onScroll(...args));

    if(this.previousCollapsed){
      this.$('#collapse-'+this.model.get('layerModel').get('id')).removeClass('in');
    }
  },


  onBeforeDetach() {
    // this does not work with the usual events dict for some reason...
    this.$('.panel-body').unbind('scroll');
  },

  onItemClicked(childView) {
    this.trigger('item:clicked', childView.model);
  },

  onItemInfo(childView) {
    this.trigger('item:info', childView.model, this.model.get('layerModel'));
  },

  onItemHover(childView) {
    this.highlightModel.highlight(childView.model.attributes);
  },

  onItemHoverEnd(childView) {
    this.highlightModel.unHighlight(childView.model.attributes);
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

  onScroll(event) {
    console.log(event);
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
