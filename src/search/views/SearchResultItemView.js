import Marionette from 'backbone.marionette';

const template = require('./SearchResultItemView.hbs');


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

  onClicked() {
    // TODO: show
    //alert(`clicked ${this.model.get('id')}`);
  },

  onChecked() {
    this.model.set('selectedForDownload', this.$('input[type="checkbox"]').is(':checked'));
  },

  onHover() {

  },
});

export default SearchResultItemView;
