import Marionette from 'backbone.marionette';

import template from './RecordItemView.hbs';
import './RecordItemView.css';

import imageError from './RecordItemViewImageError.hbs';

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
    this.thumbnailUrlPattern = options.thumbnailUrlPattern;
    this.fallbackThumbnailUrl = options.fallbackThumbnailUrl;
  },

  templateHelpers() {
    const time = this.model.get('properties').time;
    const start = Array.isArray(time) ? time[0] : time;
    let thumbnailUrl = this.model.getThumbnailUrl(
      this.collection ? this.collection.searchModel.get('layerModel').get('search.thumbnailUrlTemplate')
                      : undefined
    );
    if (this.thumbnailUrlPattern && !(new RegExp(this.thumbnailUrlPattern)).test(thumbnailUrl)) {
      thumbnailUrl = '';
    }
    return {
      thumbnailUrl,
      date: start.toISOString().substring(0, 10),
      time: start.toISOString().substring(11, 19),
    };
  },

  onRender() {
    // TODO: this flickers the image
    const $img = this.$('img');
    $img
      .one('load', () => this.$('img').fadeIn('slow'))
      .one('error', () => {
        if (this.fallbackThumbnailUrl) {
          $img
            .one('error', () => $img.attr('alt', imageError()))
            .attr('src', this.fallbackThumbnailUrl)
            .addClass('error');
        } else {
          $img.attr('alt', imageError());
        }
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
    this.model.triggerShowInfo(this.collection);
  },

  onItemMouseOver() {
    const feature = this.model.toJSON();
    feature.layerId = this.collection.searchModel.get('layerModel').get('id');
    this.highlightModel.highlight(feature);
  },

  onItemMouseOut() {
    this.highlightModel.unHighlight(this.model.attributes);
  },
});

export default RecordItemView;
