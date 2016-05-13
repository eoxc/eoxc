import Marionette from 'backbone.marionette';
require('jquery-ui/draggable');
require('font-awesome-webpack');
import _ from 'underscore';

const template = require('./WindowView.hbs');
require('./WindowView.css');

/**
  @class core/views.WindowView
*/

const WindowView = Marionette.LayoutView.extend(/** @lends core/views.WindowView.prototype */{
  template,

  className: 'panel panel-default not-selectable windowed',

  regions: {
    content: '.window-content',
  },

  events: {
    'click .close': 'close',
  },

  /**
    @param {Object} options
    @param {string} options.title The title of the view
    @param {string} [options.icon] The icon classname of the view. e.g.: "fa-globe"
    @param {string} [options.left] Position from the left (CSS property)
    @param {string} [options.right] Position from the right (CSS property)
    @param {string} [options.top] Position from the top (CSS property)
    @param {string} [options.bottom] Position from the bottom (CSS property)
    @param {string} [options.width] Width of the view (CSS property)
    @param {string} [options.height] Height of the view (CSS property)
    @param {boolean} [options.closed=false] Whether or not the view starts in a closed state
    @param {boolean} [options.closeable=true] Whether or not the view can be closed
  */
  initialize(options) {
    this.style = _.pick(options, 'left', 'right', 'top', 'bottom', 'width', 'height');
    this.view = options.view;

    this.title = options.title;
    this.icon = options.icon;
    this.closed = options.closed;
    this.closeable = typeof options.closeable === 'undefined' ? true : options.closeable;
  },

  templateHelpers() {
    return {
      title: this.title,
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
    Show the window when it was not visible before.
    @instance
   */
  open() {
    this.$el.css('display', this.initialDisplay);
    this.closed = false;
  },

  /**
    Close the window when open before.
    @instance
   */
  close() {
    this.$el.css('display', 'none');
    this.closed = true;
  },

  /**
    Toggle the visibility of the window.
    @instance
   */
  toggleOpen() {
    if (this.closed) {
      this.open();
    } else {
      this.close();
    }
  },
});


export default WindowView;
