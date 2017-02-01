import RecordItemView from '../../core/views/RecordItemView';
// import './SearchResultItemView.css';

const SearchResultItemView = RecordItemView.extend(/** @lends search/views/layers.SearchResultItemView# */{
  className: 'result-list-item record-item',

  events: Object.assign({}, RecordItemView.prototype.events, {
    'click a': 'onChecked',
  }),

  initialize(options) {
    RecordItemView.prototype.initialize.call(this, options);
    const searchModel = this.model.collection.searchModel;
    const downloadSelectionCollection = searchModel.get('downloadSelection');
    this.listenTo(downloadSelectionCollection, 'update', this.onSelectedForDownloadChange);
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
