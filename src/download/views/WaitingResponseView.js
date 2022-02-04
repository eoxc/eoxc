import Marionette from 'backbone.marionette';

const template = require('./WaitingResponseView.hbs');


// eslint-disable-next-line max-len
const ErrorModalView = Marionette.ItemView.extend(/** @lends core/download/views.waitingResponseView# */{
  template,
  className: 'wps-loading',

  templateHelpers() {},

  /**
    @constructs
    @param {Object} options
   */
  initialize() {

  },

});

export default ErrorModalView;
