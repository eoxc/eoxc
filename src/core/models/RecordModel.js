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

  triggerShowInfo() {
    if (this.collection && this.collection.searchModel) {
      this.collection.searchModel.triggerShowInfo(this);
    }
  }

  selectForDownload(select = true) {
    if (this.collection && this.collection.searchModel) {
      const downloadSelection = this.collection.searchModel.get('downloadSelection');
      if (select) {
        downloadSelection.add(this);
      } else {
        downloadSelection.remove(this.get('id'));
      }
    }
  }

  isSelectedForDownload() {
    if (this.collection && this.collection.searchModel) {
      const downloadSelection = this.collection.searchModel.get('downloadSelection');
      return downloadSelection.findIndex(
        other => other.get('id') === this.get('id')
      ) !== -1;
    }
    return undefined;
  }
}

export default RecordModel;
