import Backbone from 'backbone';
import RecordModel from '../../core/models/RecordModel';

class EOWCSRecordModel extends RecordModel {
  getThumbnailUrl() {
    // TODO
    return null;
  }

  getBrowseUrl() {
    // TODO
    return null;
  }
}

const EOWCSCollection = Backbone.Collection.extend({
  model: EOWCSRecordModel,
});

export default EOWCSCollection;
