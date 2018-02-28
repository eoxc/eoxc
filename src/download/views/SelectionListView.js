import Marionette from 'backbone.marionette';

import template from './SelectionListView.hbs';
import emptyTemplate from './SelectionListViewEmpty.hbs';
import SelectionListItemView from './SelectionListItemView';
import { downloadFullResolution } from '../eowcs';

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
      enableProcessing: layerModel.get('processingUrl'),
    };
  },
  childView: SelectionListItemView,
  childViewContainer: '.selection-items',
  buildChildView(child, ChildViewClass) {
    return new ChildViewClass({
      model: child,
      highlightModel: this.highlightModel,
    });
  },
  emptyView: EmptyView,

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
