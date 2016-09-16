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
    this.downloadSelectionCollection = options.downloadSelectionCollection;
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

  onChecked() {
    // this.model.set('selectedForDownload', this.$('input[type="checkbox"]').is(':checked'));
    // this.model.set('selectedForDownload', !this.model.get('selectedForDownload'));
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
