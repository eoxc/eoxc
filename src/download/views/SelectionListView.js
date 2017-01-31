import Marionette from 'backbone.marionette';

import template from './SelectionListView.hbs';
import emptyTemplate from './SelectionListViewEmpty.hbs';
import SelectionListItemView from './SelectionListItemView';

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

  initialize(options) {
    this.highlightModel = options.highlightModel;
  },
});

export default SelectionListView;
