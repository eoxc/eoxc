import Marionette from 'backbone.marionette';

import template from './DownloadView.hbs';
import './DownloadView.css';
import SelectionListView from './SelectionListView';


const DownloadView = Marionette.CompositeView.extend({
  template,
  childView: SelectionListView,
  childViewContainer: '.selection-lists',
  buildChildView(child, ChildViewClass) {
    return new ChildViewClass({
      model: child,
      collection: child.get('downloadSelection'),
      highlightModel: this.highlightModel,
    });
  },

  initialize(options) {
    this.filtersModel = options.filtersModel;
    this.highlightModel = options.highlightModel;
  },
});

export default DownloadView;
