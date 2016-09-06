import Backbone from 'backbone';

class EOWCSRecordModel extends Backbone.Model {
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
