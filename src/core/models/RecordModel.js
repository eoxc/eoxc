import Backbone from 'backbone';

class RecordModel extends Backbone.Model {
  getThumbnailUrl() {
    // overwrite in sub-class
    return null;
  }

  getBrowseUrl() {
    // overwrite in sub-class
    return null;
  }

  triggerShowInfo(collection = this.collection) {
    if (collection && collection.searchModel) {
      collection.searchModel.triggerShowInfo(this);
    }
  }

  selectForDownload(select = true, collection = this.collection) {
    if (collection && collection.searchModel) {
      const downloadSelection = collection.searchModel.get('downloadSelection');
      if (select) {
        downloadSelection.add(this);
      } else {
        downloadSelection.remove(this.get('id'));
      }
    }
  }

  isSelectedForDownload(collection = this.collection) {
    if (collection && collection.searchModel) {
      const downloadSelection = collection.searchModel.get('downloadSelection');
      return downloadSelection.findIndex(
        other => other.get('id') === this.get('id')
      ) !== -1;
    }
    return undefined;
  }
}

export default RecordModel;
