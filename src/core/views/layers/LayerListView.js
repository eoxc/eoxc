import Marionette from 'backbone.marionette';
// import $ from 'jquery';
require('jquery-ui/sortable');

import LayerListItemView from './LayerListItemView';

require('./LayerListView.css');


const LayerListView = Marionette.CollectionView.extend({
  tagName: 'ul',
  className: 'layer-list',
  childView: LayerListItemView,

  events: {
  },

  initialize(options) {
    this.sortable = options.sortable;
    this.singleChoice = options.singleChoice;
    this.fullDisplay = options.fullDisplay;
  },

  childViewOptions() {
    return {
      singleChoice: this.singleChoice,
      fullDisplay: this.fullDisplay,
    };
  },

  onAttach() {
    if (this.sortable) {
      this.$el.sortable({
        revert: true,
        // delay: 90,
        containment: this.$el,
        axis: 'y',
        forceHelperSize: true,
        forcePlaceHolderSize: true,
        placeholder: 'sortable-placeholder',
        handle: '.fa-sort',
        start: () => {
          this.$('.ui-slider').detach();
          this.$('.fa-adjust').toggleClass('active');
          // this.$('.fa-adjust').popover('hide');
        },
        stop: (event, ui) => {
          this.onSortStop(event, ui);
        },
      });
    }
  },

  onSortStop() {
    // get the new order of the layers from the DOM
    this.children.map((view) => [
      view.$('.input-group').attr('id').substr(11),
      view.$el.index(),
    ])
    .forEach((item) => {
      this.collection.get(item[0]).set('ordinal', item[1], { silent: true });
    });
    this.collection.sort();
  },
});


export default LayerListView;
