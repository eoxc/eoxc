import Marionette from 'backbone.marionette';

const template = require('./ModalView.hbs');
// require('./ModalView.css');


const PanelView = Marionette.LayoutView.extend(/** @lends core/views.PanelView# */{
  template,

  className: 'modal fade',

  regions: {
    content: '.modal-body',
  },

  events: {
    'click .close': 'close',
    'shown.bs.modal': 'onModalShown',
  },

  initialize(options) {
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
    this.initialDisplay = this.$el.css('display');
    this.$el.modal('show');

  },

  onModalShown() {
    this.showChildView('content', this.view);
  },

  /**
    Show the Panel when it was not visible before.
   */
  open() {
    this.$el.css('display', this.initialDisplay);
    this.closed = false;
  },

  /**
    Close the Panel when open before.
   */
  close() {
    this.$el.css('display', 'none');
    this.closed = true;
  },

  /**
    Toggle the visibility of the Panel.
   */
  toggleOpen() {
    if (this.closed) {
      this.open();
    } else {
      this.close();
    }
  },

  getView() {
    return this.view;
  },
});


export default PanelView;
