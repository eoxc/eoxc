import Marionette from 'backbone.marionette';

const template = require('./SearchResultItemView.hbs');
require('./SearchResultItemView.css');

const SearchResultItemView = Marionette.ItemView.extend(/** @lends search/views/layers.SearchResultItemView# */{
  template,
  tagName: 'li',
  triggers: {
    'click a': 'item:clicked',
    mouseover: 'item:hover',
    mouseout: 'item:hover:end',
  },

  events: {
    'click input': 'onChecked',
  },

  initialize(options) {
    this.mapModel = options.mapModel;
  },

  templateHelpers() {
    return {
      thumbnailUrl: this.model.getThumbnailUrl(),
      // browseUrl: this.model.getBrowseUrl(),
    };
  },

  onChecked() {
    this.model.set('selectedForDownload', this.$('input[type="checkbox"]').is(':checked'));
  },
});

export default SearchResultItemView;
