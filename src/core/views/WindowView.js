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

  events: {
    'click .close': 'close',
  },

  initialize(options) {
    this.style = _.pick(options, 'left', 'right', 'top', 'bottom', 'width', 'height');
    this.view = options.view;

    this.name = options.name;
    this.icon = options.icon;
    this.closed = options.closed;
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

    this.initialDisplay = this.$el.css('display');

    if (this.closed) {
      this.close();
    }

    this.showChildView('content', this.view);
  },

  /**
   * Show the window when it was not visible before.
   *
   */
  open() {
    this.$el.css('display', this.initialDisplay);
    this.closed = false;
  },

  close() {
    this.$el.css('display', 'none');
    this.closed = true;
  },

  toggleOpen() {
    if (this.closed) {
      this.open();
    }
    else {
      this.close();
    }
  },
});


export default WindowView;
