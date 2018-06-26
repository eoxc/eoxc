import RecordItemView from '../../core/views/RecordItemView';

// eslint-disable-next-line max-len
const SearchResultItemView = RecordItemView.extend(/** @lends search/views/layers.SearchResultItemView# */{
  className: 'result-list-item record-item',

  events: Object.assign({}, RecordItemView.prototype.events, {
    'click a': 'onChecked',
  }),

  initialize(options) {
    const searchModel = options.searchModel;
    const layerModel = searchModel.get('layerModel');
    RecordItemView.prototype.initialize.call(this, Object.assign({}, options, {
      thumbnailUrlPattern: layerModel.get('search.thumbnailUrlPattern'),
    }));
    const downloadSelectionCollection = searchModel.get('downloadSelection');
    this.listenTo(downloadSelectionCollection, 'reset update', this.onSelectedForDownloadChange);
  },

  onRender() {
    RecordItemView.prototype.onRender.call(this);
    this.onSelectedForDownloadChange();
  },

  onChecked(event) {
    event.preventDefault();
    this.model.selectForDownload(!this.model.isSelectedForDownload());
  },

  onSelectedForDownloadChange() {
    this.$el.toggleClass('selected-for-download', this.model.isSelectedForDownload());
  },
});

export default SearchResultItemView;
