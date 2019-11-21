import Marionette from 'backbone.marionette';


export default Marionette.LayoutView.extend({
  template: () => `
    <div class="btn-group-vertical" data-toggle="buttons" style="width: 100%">
      <label class="btn btn-default active">
        <input type="radio" name="tool" value="pan" autocomplete="off" checked>
        <i class="fas fa-arrows"></i> Pan
      </label>
      <label class="btn btn-default">
        <input type="radio" name="tool" value="bbox" autocomplete="off">BBox
      </label>
      <label class="btn btn-default">
        <input type="radio" name="tool" value="point" autocomplete="off">Point
      </label>
      <label class="btn btn-default">
        <input type="radio" name="tool" value="line" autocomplete="off">Line
      </label>
      <label class="btn btn-default">
        <input type="radio" name="tool" value="polygon" autocomplete="off">Polygon
      </label>
    </div>
    <button type="button" class="btn btn-primary search" style="width: 100%">Search</button>
  `,
  events: {
    'change input[type="radio"][name="tool"]': 'onToolSelect',
    'click .search': 'onSearchClick',
  },
  initialize(options) {
    this.mapModel = options.mapModel;
    this.communicator = options.communicator;
  },
  onToolSelect() {
    const toolName = this.$('input[type="radio"]:checked').val();
    this.mapModel.set('tool', toolName);
  },
  onSearchClick() {
    this.communicator.trigger('search');
  },
});
