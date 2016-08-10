import Marionette from 'backbone.marionette';

const template = require('./SearchResultItemView.hbs');


const SearchResultItemView = Marionette.ItemView.extend(/** @lends search/views/layers.SearchResultItemView# */{
  template,
  tagName: 'li',
  triggers: {
    click: 'item:clicked',
    mouseover: 'item:hover',
    mouseout: 'item:hover:end',
  },

  initialize(options) {
    this.mapModel = options.mapModel;
  },

  onClicked() {
    // TODO: show
    //alert(`clicked ${this.model.get('id')}`);
  },

  onHover() {

  },
});

export default SearchResultItemView;
