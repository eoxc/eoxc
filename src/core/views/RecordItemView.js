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
    this.firstThumbnailFetch = true;
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
    this.$('img').attr('src', imageObjectURL);
  },

  fetchSuccessHandler(imageBlob) {
    this.setImageSrc(imageBlob);
    this.unSetupQueueListeners();
  },

  fetchFailureHandler() {
    this.unSetupQueueListeners();
    if (this.firstThumbnailFetch) {
      // first failed request was thumbnail, enqueue quicklook
      this.firstThumbnailFetch = false;
      this.enqueueQuickLook();
    } else {
      this.enqueueFallbackThumbnail();
    }
  },

  setupQueueListeners() {
    window.EventBusLimitedRequestQueue.on(`fetch:success:${this.usedUrl}`, this.fetchSuccessHandler, this);
    window.EventBusLimitedRequestQueue.on(`fetch:failure:${this.usedUrl}`, this.fetchFailureHandler, this);
  },

  unSetupQueueListeners() {
    window.EventBusLimitedRequestQueue.off(`fetch:success:${this.usedUrl}`, null, this);
    window.EventBusLimitedRequestQueue.off(`fetch:failure:${this.usedUrl}`, null, this);
  },

  enqueueImageFetch(url) {
    if (window.LimitedRequestQueue) {
      const urlObj = new URL(url);
      if (window.EventBusLimitedRequestQueue.cache[urlObj.href]) {
        // take thumbnail from cache and set to image element src
        const imageBlobUrl = window.EventBusLimitedRequestQueue.cache[urlObj.href];
        this.setImageSrc(imageBlobUrl);
      } else {
        this.usedUrl = urlObj.href;
        this.setupQueueListeners();
        if (!window.LimitedRequestQueue.has(this.usedUrl)) {
          // put item to queue
          window.LimitedRequestQueue.enqueue(urlObj, {}, {
            'lifo': true, 'itemID': this.usedUrl,
          });
        }
      }
    } else {
      // TODO in case of thumbnail failure on this step is not catched to fetch fallback or quicklook!
      fetch(url)
        .then((response) => response.blob())
        .then((imageBlob) => {
          // create a local URL for the image
          const imageObjectURL = URL.createObjectURL(imageBlob);
          this.setImageSrc(imageObjectURL);
        }).bind(this);
    }
  },

  enqueueThumbnail() {
    // attempt to get Thumbnail url and enqueue if passes validation
    const url = this.model.getThumbnailUrl(
      this.collection && this.collection.searchModel ? this.collection.searchModel.get('layerModel').get('search.thumbnailUrlTemplate')
        : undefined
    );
    if (isValidUrl(url) || (this.thumbnailUrlPattern && new RegExp(this.thumbnailUrlPattern).test(url))) {
      this.enqueueImageFetch(url);
      return true;
    }
    return false;
  },

  enqueueQuickLook() {
    // attempt to get Quicklook or fallback thumbnail url and enqueue
    const url = this.model.getQuickLookUrl(
      this.collection && this.collection.searchModel ? this.collection.searchModel.get('layerModel').get('search.quickLookUrlTemplate')
                      : null
    );
    if (this.usedUrl === url) {
      // no need to fetch something that failed already
      this.$('img').attr('alt', imageError());
    } else if (isValidUrl(url)) {
      this.enqueueImageFetch(url);
    } else {
      this.enqueueFallbackThumbnail();
    }
  },

  enqueueFallbackThumbnail() {
    if (isValidUrl(this.fallbackThumbnailUrl)) {
      // intentionally avoid cache & queue for fallbackThumbnailUrl
      this.$('img').attr('src', this.fallbackThumbnailUrl);
    }
    this.$('img').attr('alt', imageError())
  },

  onRender() {
    const didEnqueue = this.enqueueThumbnail();
    if (!didEnqueue) {
      // did not enqueue, signal that quicklook is being fetched
      this.firstThumbnailFetch = false;
      this.enqueueQuickLook();
    }
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
    if (window.LimitedRequestQueue) {
      // delete still present listeners, dequeue current url
      this.unSetupQueueListeners();
      window.LimitedRequestQueue.dequeue(this.usedUrl);
    }
  },
});

export default RecordItemView;
