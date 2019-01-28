import Marionette from 'backbone.marionette';
import _ from 'underscore';
import $ from 'jquery';

import { isRecordDownloadable } from '../../download';

import SearchResultListView from './SearchResultListView';

import './SearchResultView.css';
import template from './SearchResultView.hbs';

import noLayerSelectedTemplate from './NoLayerSelected.hbs';
import noLayersAvailableTemplate from './NoLayersAvailable.hbs';
import nLayersSelectedTemplate from './NLayersSelected.hbs';

// eslint-disable-next-line max-len
const SearchResultView = Marionette.CompositeView.extend(/** @lends search/views/layers.SearchResultView# */{
  template,
  templateHelpers() {
    return {
      layers: this.collection.map(model =>
        Object.assign(model.toJSON(), model.get('layerModel').toJSON())
      ),
    };
  },
  className: 'search-result-view',

  childView: SearchResultListView,
  childViewContainer: '.result-contents',

  buildChildView(child, ChildViewClass) {
    return new ChildViewClass({
      model: child,
      referenceCollection: child.get('results'),
      highlightModel: this.highlightModel,
      fallbackThumbnailUrl: this.fallbackThumbnailUrl,
    });
  },

  events: {
    'change input[data-layer]': 'onLayerSelectionChange',
    'click .select-all': 'onSelectAllClick',
  },

  childEvents: {
    'collapse:change': 'updateViews',
    'before:render': 'onChildBeforeRender',
    render: 'onChildRender',
  },

  onChildBeforeRender() {
    // save the scrolling position for later to get around bug in FF and other
    // browsers. Prevent additional updates to scrolling position.
    if (typeof this.savedScrollTop === 'undefined') {
      this.savedScrollTop = this.$('.result-contents')[0].scrollTop;
    }
  },

  onChildRender() {
    if (typeof this.savedScrollTop !== 'undefined') {
      setTimeout(() => {
        this.$('.result-contents').scrollTop(this.savedScrollTop);
        this.savedScrollTop = undefined;
      });
    }
  },

  initialize(options) {
    this.filtersModel = options.filtersModel;
    this.highlightModel = options.highlightModel;
    this.fallbackThumbnailUrl = options.fallbackThumbnailUrl;

    this.listenTo(this.collection, 'change', this.onSearchModelsChange);

    this.collection.each((searchModel) => {
      this.listenTo(searchModel.get('layerModel'), 'change:display.visible', (layerModel) => {
        const $checkbox = this.$(`[data-layer="${layerModel.get('id')}"]`);
        if (layerModel.get('display.visible')) {
          $checkbox.closest('label').show();
          $checkbox.prop('checked', true);
        } else {
          $checkbox.closest('label').hide();
        }
        this.render();
        this.onSearchModelsChange();
      });

      this.listenTo(searchModel.get('results'), 'reset add', this.onResultsChange);
    });
  },

  filter(model) {
    return model.get('automaticSearch') && model.get('layerModel').get('display.visible');
  },

  onAttach() {
    this.onLayerSelectionChange();
  },

  onShown() {
    this.updateViews();
  },

  onBeforeRender() {
    this.$('.result-contents').off('scroll resize');
  },

  onRender() {
    this.$('.result-contents').on('scroll resize', _.throttle((...args) => {
      this.updateViews(...args);
    }, 1000 / 60));
  },

  onResultsChange() {
    const downloadableCount = this.collection
      .filter(searchModel => searchModel.get('layerModel').get('display.visible'))
      .map(searchModel =>
        searchModel.get('results')
          .filter(recordModel => isRecordDownloadable(searchModel.get('layerModel'), recordModel))
          .length
      )
      .reduce((count, modelCount) => (
        count + modelCount
      ), 0);

    this.$('.select-all').prop('disabled', downloadableCount === 0);
  },

  updateViews() {
    const elem = this.$('.result-contents')[0];
    const scrollTop = elem.scrollTop;
    const height = elem.clientHeight;
    let sizeAccum = 0;
    for (let i = 0; i < this.children.length; ++i) {
      const view = this.children.findByIndex(i);
      view.setSlice(sizeAccum - scrollTop, height);
      sizeAccum += view.$el.outerHeight(true);
    }
    elem.scrollTop = scrollTop;
  },

  setSelectedSearchModels(searchModels) {
    // adjust events
    const previousSearchModels = this.selectedSearchModels;
    previousSearchModels.forEach((previousSearchModel) => {
      if (!searchModels.indexOf(previousSearchModel) !== -1) {
        // this.stopListening(previousSearchModel.get('results'));
        previousSearchModel.stopSearching();
      }
    });
    searchModels.forEach((searchModel) => {
      if (!previousSearchModels.indexOf(searchModel) !== -1) {
        // this.listenTo(searchModel.get('results'), 'reset add', this.onResultsChange);
        searchModel.continueSearching();
      }
    });
  },

  onLayerSelectionChange(event) {
    if (event) {
      const $changed = $(event.target);
      const searchModel = this.collection.find(
        model => model.get('layerModel').get('id') === $changed.data('layer')
      );
      searchModel.set('automaticSearch', $changed.is(':checked'));
      this.render();
    }

    this.onSearchModelsChange();
  },

  onSearchModelsChange(searchModel) {
    if (searchModel) {
      // update the layers status
      const layerModel = searchModel.get('layerModel');
      const $status = this.$(`[data-layer="${layerModel.get('id')}"]`)
        .parent()
        .find('.search-status');

      if (searchModel.get('isSearching')) {
        $status.html('<i class="fa fa-circle-o-notch fa-spin fa-fw"></i>');
      } else if (searchModel.get('hasError')) {
        $status.html('<i class="fa fa-exclamation"></i>');
      } else if (searchModel.get('isCancelled')) {
        $status.html('');
      } else {
        $status.html(`${searchModel.get('hasLoaded')}/${searchModel.get('totalResults')}`);
      }
    }

    // update the global status
    const $globalStatus = this.$('.global-search-status');
    const isSearching = this.collection.any(model => model.get('isSearching'));
    const hasError = this.collection.any(model => model.get('hasError') && model.get('layerModel').get('display.visible'));

    const selectedSearchModels = this.collection.filter(model => model.get('automaticSearch'));

    if (hasError) {
      $globalStatus.html('<i class="fa fa-exclamation"></i>');
    } else if (isSearching) {
      $globalStatus.html('<i class="fa fa-circle-o-notch fa-spin fa-fw"></i>');
    } else if (selectedSearchModels.length) {
      const sumTotalResults = selectedSearchModels.reduce(
        (current, model) => (current + model.get('totalResults')), 0
      );
      const sumHasLoaded = selectedSearchModels.reduce(
        (current, model) => (current + model.get('hasLoaded')), 0
      );

      if (!isNaN(sumTotalResults)) {
        $globalStatus.html(`${sumHasLoaded}/${sumTotalResults}`);
      } else {
        $globalStatus.html('');
      }
    } else {
      $globalStatus.html('');
    }

    // update the tab header
    if (hasError) {
      this.triggerMethod('update:status', '<i class="fa fa-exclamation"></i>');
    } else if (isSearching) {
      this.triggerMethod('update:status', '<i class="fa fa-circle-o-notch fa-spin fa-fw"></i>');
    } else {
      this.triggerMethod('update:status', '');
    }

    // update dropdown title
    const visibleLayers = this.collection.filter(model => model.get('layerModel').get('display.visible'));
    if (visibleLayers.length) {
      if (selectedSearchModels.length) {
        this.$('.selected-layer-names').html(nLayersSelectedTemplate({
          count: selectedSearchModels.length
        }));
      } else {
        this.$('.selected-layer-names').html(noLayerSelectedTemplate({}));
      }
      this.$('.dropdown button').prop('disabled', false);
    } else {
      this.$('.selected-layer-names').html(noLayersAvailableTemplate({}));
      this.$('.dropdown button').prop('disabled', true);
    }

    this.updateViews();
  },

  onSelectAllClick() {
    const selectedSearchModels = this.collection.filter(model => model.get('automaticSearch'));
    selectedSearchModels.forEach((searchModel) => {
      searchModel.get('results')
        .filter(recordModel => isRecordDownloadable(searchModel.get('layerModel'), recordModel))
        .forEach(recordModel => recordModel.selectForDownload());
    });
  }
});

export default SearchResultView;
