import Marionette from 'backbone.marionette';
require('jquery-ui/draggable');
require('font-awesome-webpack');
import _ from 'underscore';

const template = require('./WindowView.hbs');
require('./WindowView.css');


const WindowView = Marionette.LayoutView.extend({
  template,

  className: 'panel panel-default not-selectable windowed',

  regions: {
    content: '.window-content',
  },

  initialize(options) {
    this.style = _.pick(options, 'left', 'right', 'top', 'bottom', 'width', 'height');
    this.view = options.view;

    this.name = options.name;
    this.icon = options.icon;
    this.closeable = typeof options.closeable === 'undefined' ? true : options.closeable;
  },

  templateHelpers() {
    return {
      name: this.name,
      icon: this.icon,
      closeable: this.closeable,
    };
  },

  onAttach() {
    this.$el.css(this.style);
    this.$el.draggable({
      handle: '.panel-heading',
      // containment: '',
      scroll: false,
      start: () => {
        this.$('.ui-slider').detach();
        this.$('.fa-adjust').toggleClass('active');
        // TODO: whats that?
        // this.$('.fa-adjust').popover('hide');
      },
    });

    this.showChildView('content', this.view);
  },

});


export default WindowView;
