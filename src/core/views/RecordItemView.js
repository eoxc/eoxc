import Marionette from 'backbone.marionette';

import template from './RecordItemView.hbs';
import './RecordItemView.css';

const RecordItemView = Marionette.ItemView.extend(/** @lends core/views/layers.RecordItemView# */{
  template,
  tagName: 'li',
  className: 'record-item',

  events: {
    'click .record-info': 'onItemInfoClicked',
    mouseover: 'onItemMouseOver',
    mouseout: 'onItemMouseOut',
  },

  initialize(options) {
    this.highlightModel = options.highlightModel;
    this.collection = this.model.collection;
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
    // TODO: this flickers the image
    this.$('img')
      // .css({ opacity: 0 })
      .one('load', () => this.$('img').fadeIn('slow'));
      // .one('error', () => this.$('img').css({ opacity: 1 }));
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
    this.model.triggerShowInfo(this.collection);
  },

  onItemMouseOver() {
    this.highlightModel.highlight(this.model.attributes);
  },

  onItemMouseOut() {
    this.highlightModel.unHighlight(this.model.attributes);
  },
});

export default RecordItemView;
