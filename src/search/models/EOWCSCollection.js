import _ from 'underscore';
import Backbone from 'backbone';
import RecordModel from '../../core/models/RecordModel';

class EOWCSRecordModel extends RecordModel {
  getThumbnailUrl(thumbnailUrlTemplate = undefined) {
    if (thumbnailUrlTemplate) {
      return _.template(thumbnailUrlTemplate, {
        interpolate: /\{\{(.+?)\}\}/g
      })(this.toJSON());
    }
    // TODO
    return null;
  }

  getBrowseUrl(browseUrlTemplate = undefined) {
    if (browseUrlTemplate) {
      return _.template(browseUrlTemplate, {
        interpolate: /\{\{(.+?)\}\}/g
      })(this.toJSON());
    }
    // TODO
    return null;
  }

  getDescription(descriptionTemplate = undefined) {
    if (descriptionTemplate) {
      return _.template(descriptionTemplate, {
        interpolate: /\{\{(.+?)\}\}/g
      })(this.toJSON());
    }
    return null;
  }
}

const EOWCSCollection = Backbone.Collection.extend({
  model: EOWCSRecordModel,
});

export default EOWCSCollection;
