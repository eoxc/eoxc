import Backbone from 'backbone';
import RecordModel from '../../core/models/RecordModel';

class OpenSearchRecordModel extends RecordModel {
  getThumbnailUrl() {
    const properties = this.get('properties');
    if (properties && properties.media) {
      const media = properties.media.find(m => m.category === 'THUMBNAIL');
      if (media) {
        return media.url;
      }
    }
    return null;
  }

  getBrowseUrl() {
    const properties = this.get('properties');
    if (properties && properties.media) {
      const media = properties.media.find(m => m.category === 'QUICKLOOK');
      if (media) {
        return media.url;
      }
    }
    if (properties && properties.links) {
      const link = properties.links.find(l => l.rel === 'icon');
      if (link) {
        return link.url;
      }
    }
    return null;
  }
}

const OpenSearchCollection = Backbone.Collection.extend({
  model: OpenSearchRecordModel,
});

export default OpenSearchCollection;
