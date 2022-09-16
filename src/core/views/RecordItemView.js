import Marionette from 'backbone.marionette';

import template from './RecordItemView.hbs';
import './RecordItemView.css';
import imageError from './RecordItemViewImageError.hbs';
import { isValidUrl } from '../util';

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
    this.collection = this.model.collection || options.collection;
    this.thumbnailUrlPattern = options.thumbnailUrlPattern;
    this.fallbackThumbnailUrl = options.fallbackThumbnailUrl;
    this.usedUrl = null;
  },

  templateHelpers() {
    const time = this.model.get('properties').time;
    const start = Array.isArray(time) ? time[0] : time;
    return {
      date: start.toISOString().substring(0, 10),
      time: start.toISOString().substring(11, 19),
    };
  },

  setImageSrc(imageObjectURL) {
    const $img = this.$('img');
    $img.attr('src', imageObjectURL);
  },

  boundHandler(imageBlob) {
    this.setImageSrc(imageBlob);
    this.unSetupQueueListener();
  },

  setupQueueListener() {
    const id = this.getID();
    window.BackboneEventBus.on(`fetch:${id}`, this.boundHandler, this);
  },

  unSetupQueueListener() {
    const id = this.getID();
    window.BackboneEventBus.off(`fetch:${id}`, null, this);
  },

  getID() {
    return `${this.usedUrl}`;
  },

  enqueueThumbnailImageFetch() {
    let url = this.model.getThumbnailUrl(
      this.collection && this.collection.searchModel ? this.collection.searchModel.get('layerModel').get('search.thumbnailUrlTemplate')
        : undefined
    );
    if (this.thumbnailUrlPattern && !(new RegExp(this.thumbnailUrlPattern)).test(url)) {
      url = '';
    }
    if (isValidUrl(url)) {
      if (window.requestQueue) {
        const urlObj = new URL(url);
        if (window.BackboneEventBus.cache[urlObj.href]) {
          const imageBlobUrl = window.BackboneEventBus.cache[urlObj.href];
          this.setImageSrc(imageBlobUrl);
        } else {
          this.usedUrl = urlObj.href;
          this.setupQueueListener();
          const id = this.getID();
          if (!window.requestQueue.has(id)) {
            window.requestQueue.enqueue(urlObj, {}, {
              'lifo': true, 'itemID': this.getID(),
            });
          }
        }
      } else {
        fetch(url)
          .then((response) => response.blob())
          .then((imageBlob) => {
            // Then create a local URL for that image
            const imageObjectURL = URL.createObjectURL(imageBlob);
            this.setImageSrc(imageObjectURL);
          }).bind(this);
      }

    }
  },

  onRender() {
    this.enqueueThumbnailImageFetch();
    // const $img = this.$('img');
    // $img
    //   .one('load', () => this.$('img').fadeIn('slow'))
    //   .one('error', () => {
    //     const quickLookUrl = this.model.getQuickLookUrl(
    //       this.collection && this.collection.searchModel ? this.collection.searchModel.get('layerModel').get('search.quickLookUrlTemplate')
    //                       : undefined
    //     );
    //     if (quickLookUrl) {
    //       $img
    //       .attr('src', quickLookUrl)
    //       .one('load', () => this.$('img').fadeIn('slow'))
    //       .one('error', () => {
    //       });
    //     } else if (this.fallbackThumbnailUrl) {
    //       $img
    //         .one('error', () => $img.attr('alt', imageError()))
    //         .attr('src', this.fallbackThumbnailUrl)
    //         .addClass('error');
    //     } else {
    //       $img.attr('alt', imageError());
    //     }
    //   });
  },

  onAttach() {
    this.listenTo(this.highlightModel, 'change:highlightFeature', (model, feature) => {
      let isHighlighted = false;
      if (feature) {
        const id = this.model.get('id');
        if (Array.isArray(feature)) {
          isHighlighted = !!feature.find(f => f && f.id === id);
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

  onDestroy() {
    if (window.requestQueue) {
      this.unSetupQueueListener(this.usedUrl);
      window.requestQueue.dequeue(this.usedUrl);
    }
  },

  onDestroy() {
    if (window.requestQueue) {
      this.unSetupQueueListener();
    }
    const id = this.getID();
    window.requestQueue.dequeue(id);
  },
});

export default RecordItemView;
