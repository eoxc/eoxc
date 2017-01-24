import Marionette from 'backbone.marionette';
import 'jquery-lazyload';

import template from './SearchResultListView.hbs';
import ErrorViewTemplate from './SearchResultListErrorView.hbs';
import EmptyViewTemplate from './SearchResultListEmptyView.hbs';
import './SearchResultListView.css';
import SearchResultItemView from './SearchResultItemView';

const FetchingView = Marionette.ItemView.extend({
  template: () => '<i class="fa fa-circle-o-notch fa-spin"></i>',
});

const ErrorView = Marionette.ItemView.extend({
  template: ErrorViewTemplate,
});

const EmptyView = Marionette.ItemView.extend({
  template: EmptyViewTemplate,
});

const SearchResultListView = Marionette.CompositeView.extend(/** @lends search/views/layers.SearchResultListView# */{
  template,
  templateHelpers() {
    const totalResults = this.model.get('totalResults');
    const maxCount = this.model.get('maxCount');

    return {
      layerName: this.model.get('layerModel').get('displayName'),
      layerId: this.model.get('layerModel').get('id'),
      hasMore: totalResults > maxCount,
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
    'click .btn-load-more': 'onLoadMoreClicked',
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
    this.listenTo(
      this.model.get('layerModel'), 'change:display.visible', this.onLayerVisibleChange
    );
    this.previousCollapsed = false;
    this.scrollPos = 0;
  },

  onBeforeRender() {
    const $collPanel = this.$(`#collapse-${this.model.get('layerModel').get('id')}`);
    if ($collPanel.length) {
      this.previousCollapsed = !$collPanel.hasClass('in');
    }
    this.scrollPos = this.$('.panel-body').scrollTop();
  },

  onRender() {
    if (!this.model.get('layerModel').get('display.visible')) {
      this.$el.hide();
    }
    // this does not work with the usual events dict for some reason...
    // this.$('.panel-body').bind('scroll', (...args) => this.onScroll(...args));
    const $collPanel = this.$(`#collapse-${this.model.get('layerModel').get('id')}`);
    if (this.previousCollapsed) {
      $collPanel.removeClass('in');
    }
    this.$('.panel-body').scrollTop(this.scrollPos);
  },

  onBeforeDetach() {
    // this does not work with the usual events dict for some reason...
    // this.$('.panel-body').unbind('scroll');
  },

  onItemClicked(childView) {
    this.trigger('item:clicked', childView.model);
  },

  onItemInfo(childView) {
    this.trigger('item:info', childView.model, this.model);
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

  onLoadMoreClicked() {
    this.model.searchMore();
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
