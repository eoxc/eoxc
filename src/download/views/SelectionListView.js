import Marionette from 'backbone.marionette';
import Backbone from 'backbone';

import template from './SelectionListView.hbs';
import './SelectionListView.css';
import emptyTemplate from './SelectionListViewEmpty.hbs';
import SelectionListItemView from './SelectionListItemView';
import { setSlice } from '../../search/utils';

const EmptyView = Marionette.ItemView.extend({
  template: emptyTemplate,
});

const SelectionListView = Marionette.CompositeView.extend({
  template,
  templateHelpers() {
    const layerModel = this.model.get('layerModel');
    return {
      layerName: layerModel.get('displayName'),
      layerId: layerModel.get('id'),
      enableFullResolutionDownload: layerModel.get('fullResolution.protocol'),
      enableProcessing: layerModel.get('processing.url'),
    };
  },
  childView: SelectionListItemView,
  childViewContainer: '.selection-items',
  buildChildView(child, ChildViewClass) {
    return new ChildViewClass({
      model: child,
      highlightModel: this.highlightModel,
      fallbackThumbnailUrl: this.fallbackThumbnailUrl,
      collection: this.collection,
    });
  },
  emptyView: EmptyView,

  constructor(options) {
    const collection = new Backbone.Collection();
    collection.searchModel = options.searchModel ? options.searchModel : options.model;
    Marionette.CompositeView.prototype.constructor.call(this, Object.assign({}, options, {
      collection
    }));
  },
  events: {
    'click .btn-download-full-res': 'onDownloadFullResolutionClick',
    'click .btn-processing': 'onProcessingClick',
  },

  modelEvents: {
    'change:automaticSearch': 'onAutomaticSearchChange',
  },

  initialize(options) {
    this.highlightModel = options.highlightModel;
    this.mapModel = options.mapModel;
    this.fallbackThumbnailUrl = options.fallbackThumbnailUrl;
    this.referenceCollection = options.referenceCollection;
    this.setSlice = setSlice;
  },

  onDownloadFullResolutionClick() {
    const layerModel = this.model.get('layerModel');
    layerModel.trigger('download-full-resolution', layerModel);
  },

  onProcessingClick() {
    this.model.trigger('start-processing', this.model);
  },

  onAutomaticSearchChange() {
    this.$('.btn-download-full-res').prop('disabled', !this.model.get('automaticSearch'));
    this.$('.btn-processing').prop('disabled', !this.model.get('automaticSearch'));
  }
});

export default SelectionListView;
