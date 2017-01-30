import Marionette from 'backbone.marionette';

const template = require('./SearchResultItemView.hbs');
require('./SearchResultItemView.css');

const SearchResultItemView = Marionette.ItemView.extend(/** @lends search/views/layers.SearchResultItemView# */{
  template,
  tagName: 'li',
  className: 'result-list-item',

  triggers: {
    // 'click a': 'item:clicked',
    'click button': 'item:info',
    mouseover: 'item:hover',
    mouseout: 'item:hover:end',
  },

  events: {
    'click a': 'onChecked',
  },

  modelEvents: {
    'change:selectedForDownload': 'onSelectedForDownloadChange',
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
      // browseUrl: this.model.getBrowseUrl(),
    };
  },

  onRender() {
    this.onSelectedForDownloadChange();
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

    const $el = window.jQuery(this.$el);
    $el.find('img').lazyload({
      event: 'scroll',
      effect: 'fadeIn',
      skip_invisible: false,
      container: $el.closest('ul'),
    });
  },

  onChecked(event) {
    event.preventDefault();
    if (!this.isSelectedForDownload()) {
      this.downloadSelectionCollection.add(this.model);
    } else {
      this.downloadSelectionCollection.remove(this.model.get('id'));
    }
  },

  onSelectedForDownloadChange() {
    this.$el.toggleClass('selected-for-download', this.isSelectedForDownload());
  },

  isSelectedForDownload() {
    return this.downloadSelectionCollection.findIndex(
      model => model.get('id') === this.model.get('id')
    ) !== -1;
  },
});

export default SearchResultItemView;
