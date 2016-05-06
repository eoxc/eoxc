window.d3 = require('d3/d3');

require('libcoverage.js/libcoverage.wcs.js');
require('libcoverage.js/libcoverage.eowcs.js');

import Marionette from 'backbone.marionette';

require('D3.TimeSlider/build/d3.timeslider');

require('D3.TimeSlider/build/d3.timeslider.plugins');
require('D3.TimeSlider/build/d3.timeslider.min.css');

/**
 * @memberof core/views
 */

class TimeSliderView extends Marionette.ItemView {
  initialize(options) {
    this.filtersModel = options.filtersModel;
    this.layersCollection = options.layersCollection;

    this.domain = options.domain;
    this.brush = options.brush;
  }

  onRender() {

  }

  onAttach() {
    this.timeSlider = new window.TimeSlider(this.el, {
      domain: this.domain,
      brush: this.brush,
      debounce: 300,
      ticksize: 8,

      datasets: [],
    });

    this.layersCollection.each((layerModel) => this.addLayer(layerModel));

    this.listenTo(this.filtersModel, 'change:time', this.onModelSelectionChanged);
    this.listenTo(this.layersCollection, 'add', this.onLayerAdded);
    this.listenTo(this.layersCollection, 'remove', this.onLayerRemoved);
    this.listenTo(this.layersCollection, 'change', this.onLayerChanged);
  }

  addLayer(layerModel) {
    this.timeSlider.addDataset({
      id: layerModel.get('id'),
      color: layerModel.get('displayColor'),
      data: new window.TimeSlider.Plugin.EOWCS({
        url: layerModel.get('display').url || layerModel.get('display').urls[0],
        eoid: layerModel.get('display').id,
        dataset: layerModel.get('id'),
      }),
    });
  }

  // two way binding of time selection

  onSelectionChanged(event) {
    const selection = event.originalEvent.detail;
    this.filtersModel.set('time', [selection.start, selection.end]);
  }

  onModelSelectionChanged(filtersModel) {
    const selection = filtersModel.get('time');
    this.timeSlider.select(selection[0], selection[1]);
  }

  // collection events

  onLayerAdded(layerModel) {
    this.addLayer(layerModel);
  }

  onLayerRemoved(layerModel) {

  }

  onLayerChanged(layerModel) {

  }

}

TimeSliderView.prototype.template = () => '';

TimeSliderView.prototype.events = {
  selectionChanged: 'onSelectionChanged',
  //'coverageselected': 'onCoverageSelected'
};


export default TimeSliderView;
