import Backbone from 'backbone';
import RecordModel from '../../core/models/RecordModel';

class OpenSearchRecordModel extends RecordModel {
  getThumbnailUrl(thumbnailUrlTemplate = undefined) {
    if (thumbnailUrlTemplate) {
      return _.template(thumbnailUrlTemplate, {
        interpolate: /\{\{(.+?)\}\}/g
      })(this.toJSON());
    }

    const properties = this.get('properties');
    if (properties && properties.media) {
      const media = properties.media.find(m => m.category === 'THUMBNAIL');
      if (media) {
        return media.url;
      }
      // if thumbnailUrl not present, try quickLook as a fallback option
      const quickLook = properties.media.find(m => m.category === 'QUICKLOOK');
      if (quickLook) {
        return quickLook.url;
      }
    }
    return null;
  }

  getQuickLookUrl(quickLookUrlTemplate = undefined) {
    if (quickLookUrlTemplate) {
      return _.template(quickLookUrlTemplate, {
        interpolate: /\{\{(.+?)\}\}/g
      })(this.toJSON());
    }

    const properties = this.get('properties');
    if (properties && properties.media) {
      const quickLook = properties.media.find(m => m.category === 'QUICKLOOK');
      if (quickLook) {
        return quickLook.url;
      }
    }
    return null;
  }

  getBrowseUrl(browseUrlTemplate = undefined) {
    if (browseUrlTemplate) {
      return _.template(browseUrlTemplate, {
        interpolate: /\{\{(.+?)\}\}/g
      })(this.toJSON());
    }

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

  getTitle() {
    const properties = this.get('properties');
    if (properties && properties.title) {
      return properties.title;
    }
    return this.get('id');
  }

  getDescription(descriptionTemplate = undefined) {
    if (descriptionTemplate) {
      return _.template(descriptionTemplate, {
        interpolate: /\{\{(.+?)\}\}/g
      })(this.toJSON());
    }

    const properties = this.get('properties');
    return properties.summary || properties.content;
  }
}

const OpenSearchCollection = Backbone.Collection.extend({
  model: OpenSearchRecordModel,
});

export default OpenSearchCollection;
