window.d3 = require('d3/d3');

import Marionette from 'backbone.marionette';

const TimeSlider = require('D3.TimeSlider/src/d3.timeslider.coffee');
const EOWCSSource = require('D3.TimeSlider/src/sources/eowcs.coffee');

// require('D3.TimeSlider/build/d3.timeslider.plugins');
require('D3.TimeSlider/build/d3.timeslider.css');
require('./TimeSliderView.css');


const TimeSliderView = Marionette.ItemView.extend(/** @lends core/views.TimeSliderView# */{
  template: () => '',

  events: {
    selectionChanged: 'onSelectionChanged',
    recordClicked: 'onRecordClicked',
    recordMouseover: 'onRecordMouseover',
    recordMouseout: 'onRecordMouseout',
  },

  /**
    @constructs
    @param {Object} options
    @param {core/models.FiltersModel} options.filtersModel The filters model to store the filters
    @param {core/models.LayersCollection} options.layersCollection The layers to show
                                                                   on the time slider
    @param {core/models.MapModel} options.mapModel The map-model
    @param {Date[]} options.domain The maximum domain to allow panning of th time slider
  */
  initialize(options) {
    this.filtersModel = options.filtersModel;
    this.layersCollection = options.layersCollection;

    this.mapModel = options.mapModel;

    this.domain = options.domain;
  },

  onRender() {

  },

  onAttach() {
    const options = {
      domain: this.domain,
      debounce: 300,
      ticksize: 8,
      datasets: [],
      recordFilter: this.createRecordFilter(this.mapModel.get('bbox')),
    };
    const time = this.filtersModel.get('time');
    if (time !== null) {
      options.brush = {
        start: time[0],
        end: time[1],
      };
    }

    this.timeSlider = new TimeSlider(this.el, options);

    this.layersCollection.each((layerModel) => {
      if (layerModel.get('display.visible')) {
        this.addLayer(layerModel);
      }
    });

    this.listenTo(this.filtersModel, 'change:time', this.onModelSelectionChanged);
    this.listenTo(this.layersCollection, 'add', this.onLayerAdded);
    this.listenTo(this.layersCollection, 'remove', this.onLayerRemoved);
    this.listenTo(this.layersCollection, 'change', this.onLayerChanged);
    this.listenTo(this.mapModel, 'change:bbox', (mapModel) => {
      this.timeSlider.setRecordFilter(this.createRecordFilter(mapModel.get('bbox')));
    });
  },

  addLayer(layerModel) {
    // TODO: set the source according to the models search options
    this.timeSlider.addDataset({
      id: layerModel.get('id'),
      color: layerModel.get('displayColor'),
      source: new EOWCSSource({
        url: layerModel.get('display').url || layerModel.get('display').urls[0],
        eoid: layerModel.get('display').id,
      }),
    });
  },

  createRecordFilter(bbox) {
    return (record) => {
      const params = record[2];
      if (params && params.bbox) {
        const a = bbox;
        const b = params.bbox;
        // adapted from http://gamedev.stackexchange.com/a/913/50029
        return !(a[0] > b[2]
          || a[2] < b[0]
          || a[3] < b[1]
          || a[1] > b[3]
        );
      }
      return true;
    };
  },

  // two way binding of time selection

  onSelectionChanged(event) {
    const selection = event.originalEvent.detail;
    this.filtersModel.set('time', [selection.start, selection.end]);
  },

  onRecordClicked(event) {
    const record = event.originalEvent.detail;
    if (record.params.bbox) {
      this.mapModel.set('bbox', record.params.bbox);
      this.filtersModel.set('time', [record.start, record.end]);
    }
  },

  onRecordMouseover(event) {
    const record = event.originalEvent.detail;
    if (record.params.footprint) {
      this.mapModel.set('highlightFootprint', record.params.footprint);
    }
  },

  onRecordMouseout(event) {
    const record = event.originalEvent.detail;
    if (record.params.footprint
      && record.params.footprint === this.mapModel.get('highlightFootprint')) {
      this.mapModel.set('highlightFootprint', null);
    }
  },

  onModelSelectionChanged(filtersModel) {
    const selection = filtersModel.get('time');
    this.timeSlider.select(selection[0], selection[1]);
  },

  // collection events

  onLayerAdded(layerModel) {
    this.addLayer(layerModel);
  },

  onLayerRemoved(layerModel) {
    this.timeSlider.removeDataset(layerModel.get('id'));
  },

  onLayerChanged(layerModel) {
    if (layerModel.hasChanged('display')) {
      if (layerModel.get('display.visible') && !this.timeSlider.hasDataset(layerModel.get('id'))) {
        this.addLayer(layerModel);
      } else {
        this.timeSlider.removeDataset(layerModel.get('id'));
      }
    }
  },
});


export default TimeSliderView;
