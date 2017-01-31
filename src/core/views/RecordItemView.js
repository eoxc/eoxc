import Marionette from 'backbone.marionette';

import template from './RecordItemView.hbs';
import './RecordItemView.css';

const RecordItemView = Marionette.ItemView.extend(/** @lends search/views/layers.RecordItemView# */{
  template,
  tagName: 'li',
  className: 'record-item',

  events: {
    'click button': 'onItemInfoClicked',
    mouseover: 'onItemMouseOver',
    mouseout: 'onItemMouseOut',
  },

  initialize(options) {
    const searchModel = this.model.collection.searchModel;
    this.downloadSelectionCollection = searchModel.get('downloadSelection');
    this.highlightModel = options.highlightModel;
    this.listenTo(this.downloadSelectionCollection, 'update', this.onSelectedForDownloadChange);
  },

  templateHelpers() {
    const time = this.model.get('properties').time;
    const start = Array.isArray(time) ? time[0] : time;
    return {
      thumbnailUrl: this.model.getThumbnailUrl(),
      date: start.toISOString().substring(0, 10),
      time: start.toISOString().substring(11, 19),
    };
  },

  onRender() {
    this.onSelectedForDownloadChange();
    // TODO: this flickers the image
    this.$('img').one('load', () => {
      this.$('img').hide().fadeIn();
    });
  },

  onAttach() {
    this.listenTo(this.highlightModel, 'change:highlightFeature', (model, feature) => {
      let isHighlighted = false;
      if (feature) {
        const id = this.model.get('id');
        if (Array.isArray(feature)) {
          isHighlighted = !!feature.find(f => f.id === id);
        } else {
          isHighlighted = (id === feature.id);
        }
      }
      this.$el.toggleClass('highlighted', isHighlighted);
    });
  },

  onItemInfoClicked() {
    this.model.triggerShowInfo();
  },

  onItemMouseOver() {
    this.highlightModel.highlight(this.model.attributes);
  },

  onItemMouseOut() {
    this.highlightModel.unHighlight(this.model.attributes);
  },

  onSelectedForDownloadChange() {
    this.$el.toggleClass('selected-for-download', this.model.isSelectedForDownload());
  },
});

export default RecordItemView;
