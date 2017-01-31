import RecordItemView from '../../core/views/RecordItemView';
// import './SearchResultItemView.css';

const SearchResultItemView = RecordItemView.extend(/** @lends search/views/layers.SearchResultItemView# */{
  className: 'result-list-item record-item',

  events: Object.assign({}, RecordItemView.prototype.events, {
    'click a': 'onChecked',
  }),

  onChecked(event) {
    event.preventDefault();
    this.model.selectForDownload(!this.model.isSelectedForDownload());
  },
});

export default SearchResultItemView;
