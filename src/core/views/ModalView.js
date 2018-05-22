import Marionette from 'backbone.marionette';
import './ModalView.css';
import template from './ModalView.hbs';


const PanelView = Marionette.LayoutView.extend(/** @lends core/views.PanelView# */{
  template,

  className: 'modal fade',

  regions: {
    content: '.modal-body',
  },

  events() {
    const baseEvents = {
      'click .close': 'close',
      'shown.bs.modal': 'onModalShown',
    };

    const buttons = this.options.buttons || [];
    for (let i = 0; i < buttons.length; ++i) {
      baseEvents[`click .modal-footer button:eq(${i})`] = buttons[i][1];
    }

    return baseEvents;
  },

  initialize(options) {
    this.view = options.view;
    this.title = options.title;
    this.icon = options.icon;
    this.closed = options.closed;
    this.closeable = typeof options.closeable === 'undefined' ? true : options.closeable;
    this.buttonDescs = options.buttons || [];
  },

  templateHelpers() {
    return {
      title: this.title,
      icon: this.icon,
      closeable: this.closeable,
      hasButtons: this.buttonDescs.length > 0,
      buttons: this.buttonDescs.map(buttonDesc => buttonDesc[0]),
    };
  },

  useBackdrop() {
    return true;
  },

  onAttach() {
    this.initialDisplay = this.$el.css('display');
    this.$el.modal({ backdrop: this.useBackdrop() });
    this.$el.modal('show');
  },

  onModalShown() {
    this.showChildView('content', this.view);
  },

  /**
    Show the Panel when it was not visible before.
   */
  open() {
    this.$el.modal('show');
    this.closed = false;
  },

  /**
    Close the Panel when open before.
   */
  close() {
    this.$el.modal('hide');
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
