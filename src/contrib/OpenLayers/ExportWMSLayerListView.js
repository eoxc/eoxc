import Marionette from 'backbone.marionette';
import template from './ExportWMSLayerListView.hbs';
import i18next from '../../i18next';
import ExportWMSLayerItemView from './ExportWMSLayerItemView';

const ExportWMSLayerListView = Marionette.CompositeView.extend({
  childViewContainer: '.export-wms-list',
  childView: ExportWMSLayerItemView,
  template,
  templateHelpers() {
    const buttonTitle = i18next.t('Export current view as WMS URL');
    return { buttonTitle };
  },
  initialize(options) {
    this.useDetailsDisplay = options.useDetailsDisplay;
    this.mapModel = options.mapModel;
    this.usedView = options.usedView;
  },
  childViewOptions() {
    return {
      useDetailsDisplay: this.useDetailsDisplay,
      mapModel: this.mapModel,
      usedView: this.usedView,
    };
  },
});

export default ExportWMSLayerListView;
