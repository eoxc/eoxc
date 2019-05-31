import Marionette from 'backbone.marionette';
import 'jquery-ui/ui/widgets/sortable';
import 'font-awesome-webpack';
import $ from 'jquery';

import LayerListItemView from './LayerListItemView';

import './LayerListView.css';

// eslint-disable-next-line max-len
const LayerListView = Marionette.CollectionView.extend(/** @lends core/views/layers.LayerListView# */{
  tagName: 'ul',
  className: 'layer-list',
  childView: LayerListItemView,

  /**
    @constructs
    @param {Object} options
    @param {core/models.LayersCollection} options.collection The layers to display
    @param {boolean} options.sortable Whether layers shall be sortable.
    @param {boolean} options.singleChoive Whether the visibility of the layers
                                          is mutually exclusive.
    @param {boolean} options.fullDisplay Whether the layers shall be displayed
                                         with options, colors, etc.
   */
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
      $(this.$el).sortable({
        containment: this.$el,
        axis: 'y',
        forceHelperSize: true,
        forcePlaceHolderSize: true,
        placeholder: 'sortable-placeholder',
        handle: '.fa-sort',
        tolerance: 'pointer',
        stop: (event, ui) => {
          this.onSortStop(event, ui);
        },
      });
    }
  },

  onSortStop() {
    // get the new order of the layers from the DOM
    this.children.call('hidePopover');
    this.children
      .map(view => [
        view.$('.input-group').attr('id').substr(11),
        view.$el.index(),
      ])
      .forEach(([id, index]) => {
        this.collection.get(id).set('ordinal', index, { silent: true });
      });
    this.collection.sort();
  },
});


export default LayerListView;
