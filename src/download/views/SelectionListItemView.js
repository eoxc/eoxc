import RecordItemView from '../../core/views/RecordItemView';
import template from './SelectionListItemView.hbs';
import './SelectionListItemView.css';

const SelectionListItemView = RecordItemView.extend(/** @lends download/views/layers.SelectionListItemView */{
  template,
  className: 'selection-list-item record-item',
  events: Object.assign({}, RecordItemView.prototype.events, {
    'click .record-unselect': 'onRecordUnselectClicked',
  }),

  onRecordUnselectClicked() {
    this.model.selectForDownload(false, this.collection);
  },
});

export default SelectionListItemView;
