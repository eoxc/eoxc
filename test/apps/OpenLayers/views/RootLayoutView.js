import Marionette from 'backbone.marionette';


export default Marionette.LayoutView.extend({
  template: () => `
    <div id="header"></div>
    <div id="map" style="width: 100%; height:100%; margin: 0; padding-top: 51px;""></div>
    <div id="timeSlider" style="position: absolute; width: 90%; left: 5%; bottom: 30px"></div>

    <div id="windows">
      <div id="layers"></div>
      <div id="tools"></div>
      <div id="layerOptions"></div>
    </div>
  `,
  regions: {
    header: '#header',
    layers: '#layers',
    tools: '#tools',
    map: '#map',
    timeSlider: '#timeSlider',
    layerOptions: '#layerOptions',
  },
});
