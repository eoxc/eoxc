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
      enableFullResolutionDownload: layerModel.get('download.fullResolutionUrl') && layerModel.get('download.fullResolutionId'),
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
  },

  initialize(options) {
    this.highlightModel = options.highlightModel;
    this.mapModel = options.mapModel;
  },

  onDownloadFullResolutionClick() {
    const layerModel = this.model.get('layerModel');
    downloadFullResolution(
      layerModel, this.mapModel, this.model.get('filtersModel'), {}
    );
  }
});

export default SelectionListView;
