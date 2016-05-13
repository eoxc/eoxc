import Marionette from 'backbone.marionette';


export default Marionette.LayoutView.extend({
  template: () => `
    <div class="navbar navbar-inverse navbar-fixed-top" role="navigation">
      <div class="container">
        <div class="navbar-header">
          <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target=".navbar-collapse">
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
          </button>
          <a class="navbar-brand">EOxC - Example Application</a>
        </div>

        <div class="navbar-collapse collapse navbar-right">
          <ul class="nav navbar-nav">
            <li class="divider-vertical"></li>
            <li><a href="#" class="layers"><i class="fa fa-globe"></i> Layers</a></li>
            <li><a href="#" class="tools"><i class="fa fa-wrench"></i> Tools</a></li>
          </ul>
        </div>
      </div>
    </div>
  `,
  events: {
    'click .layers': 'onLayersClick',
    'click .tools': 'onToolsClick',
  },

  initialize(options) {
    this.communicator = options.communicator;
  },

  onLayersClick() {
    this.communicator.trigger('toggle:layers');
  },

  onToolsClick() {
    this.communicator.trigger('toggle:tools');
  },
});

