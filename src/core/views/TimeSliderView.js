import 'd3/d3';
import Marionette from 'backbone.marionette';
import TimeSlider from 'D3.TimeSlider/src/d3.timeslider.coffee';
import WMSSource from 'D3.TimeSlider/src/sources/wms.coffee';
import WPSSource from 'D3.TimeSlider/src/sources/eoxserver-wps.coffee';

import { searchAllRecords, getCount } from '../../search';
import FiltersModel from '../models/FiltersModel';

// require('D3.TimeSlider/build/d3.timeslider.plugins');
require('D3.TimeSlider/src/d3.timeslider.less');
require('./TimeSliderView.css');


function intersects(a, b) {
  // adapted from http://gamedev.stackexchange.com/a/913/50029
  return !(a[0] > b[2]
    || a[2] < b[0]
    || a[3] < b[1]
    || a[1] > b[3]
  );
}

const TimeSliderView = Marionette.ItemView.extend(/** @lends core/views.TimeSliderView# */{
  template: () => '',

  events: {
    selectionChanged: 'onSelectionChanged',
    recordClicked: 'onRecordClicked',
    recordMouseover: 'onRecordMouseover',
    recordMouseout: 'onRecordMouseout',
    binClicked: 'onRecordsClicked',
    binMouseover: 'onRecordsMouseover',
    binMouseout: 'onRecordsMouseout',
    clusterClicked: 'onRecordsClicked',
    clusterMouseover: 'onRecordsMouseover',
    clusterMouseout: 'onRecordsMouseout',
    bucketClicked: 'onBucketClicked',
    // not required at the moment
    bucketMouseover: 'onBucketMouseover',
    bucketMouseout: 'onBucketMouseout',
    loadStart: 'onLoadStart',
    loadEnd: 'onLoadEnd',
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
    this.highlightModel = options.highlightModel;

    this.highlightFillColor = options.highlightFillColor;
    this.highlightStrokeColor = options.highlightStrokeColor;
    this.filterFillColor = options.filterFillColor;
    this.filterStrokeColor = options.filterStrokeColor;
    this.filterOutsideColor = options.filterOutsideColor;

    this.domain = options.domain;
    this.display = options.display;
    this.constrainTimeDomain = options.constrainTimeDomain;
    this.timeSliderControls = options.timeSliderControls;
    this.displayInterval = options.displayInterval;
    this.selectableInterval = options.selectableInterval;
    this.maxTooltips = options.maxTooltips;

    this.previousSearches = {};
  },

  onRender() {

  },

  onAttach() {
    const tooltipFormatter = record => (
      (record && record[2] && record[2].id) ? record[2].id : `${record[0].toISOString() - record[1].toISOString()}`
    );
    const options = {
      domain: this.domain,
      display: this.display,
      debounce: 300,
      ticksize: 8,
      datasets: [],
      constrain: this.constrainTimeDomain,
      controls: this.timeSliderControls,
      displayLimit: this.displayInterval,
      selectionLimit: this.selectableInterval,
      recordFilter: this.createRecordFilter(this.mapModel.get('bbox')),
      tooltipFormatter,
      binTooltipFormatter: (bin) => {
        let records = bin;
        let more = 0;
        if (this.maxTooltips && bin.length > this.maxTooltips) {
          records = bin.slice(0, this.maxTooltips);
          more = bin.length - this.maxTooltips;
        }
        const tooltip = records.map(tooltipFormatter).join('<br/>');
        if (more) {
          return `${tooltip}<br/> + ${more} more`;
        }
        return tooltip;
      },
    };
    const time = this.mapModel.get('time');
    if (time !== null) {
      options.brush = {
        start: time[0],
        end: time[1],
      };
    }

    this.timeSlider = new TimeSlider(this.el, options);

    // replace the markup for the timeslider controls

    this.$('.control#pan-left .arrow-left').replaceWith('<i class="fa fa-caret-left" />');
    this.$('.control#pan-right .arrow-right').replaceWith('<i class="fa fa-caret-right" />');
    this.$('.control#zoom-out').html('<i class="fa fa-minus" />');
    this.$('.control#zoom-in').html('<i class="fa fa-plus" />');
    this.$('.control#reload .reload-arrow').replaceWith('<i class="fa fa-refresh fa-fw" />');

    const visibleLayers = this.layersCollection.filter(
      layerModel => layerModel.get('display.visible') && layerModel.get('search.protocol')
    );

    if (visibleLayers.length > 0) {
      visibleLayers.forEach(layerModel => this.addLayer(layerModel));
    } else {
      this.$el.css('display', 'none');
    }

    this.listenTo(this.mapModel, 'change:time', this.onModelSelectionChanged);
    this.listenTo(this.filtersModel, 'change:time', () => {
      const filterTime = this.filtersModel.get('time');
      if (filterTime) {
        this.timeSlider.setHighlightInterval(
          filterTime[0], filterTime[1],
          this.filterFillColor, this.filterStrokeColor, this.filterOutsideColor,
          true
        );
      } else {
        this.timeSlider.setHighlightInterval(null);
      }
    });
    this.listenTo(this.filtersModel, 'show:time', (timeFilter) => {
      this.timeSlider.center(...timeFilter);
    });
    this.listenTo(this.layersCollection, 'add', this.onLayerAdded);
    this.listenTo(this.layersCollection, 'remove', this.onLayerRemoved);
    this.listenTo(this.layersCollection, 'change', this.onLayerChanged);
    this.listenTo(this.mapModel, 'change:bbox', (mapModel) => {
      this.timeSlider.setRecordFilter(this.createRecordFilter(mapModel.get('bbox')));
    });
    this.listenTo(this.highlightModel, 'change:highlightFeature', this.onHighlightFeatureChange);
  },

  addLayer(layerModel) {
    this.$el.fadeIn();
    let source;
    let bucketSource;
    switch (layerModel.get('search').protocol) {
      case 'EOxServer-WPS':
        source = new WPSSource({
          url: layerModel.get('search').url || layerModel.get('search').urls[0],
          eoid: layerModel.get('search').id,
        });
        break;
      case 'EO-WCS':
      case 'OpenSearch':
        source = (start, end, params, callback) => {
          const filtersModel = new FiltersModel({ time: [start, end] });
          searchAllRecords(layerModel, filtersModel, null, { mimeType: 'application/atom+xml' }).then((result) => {
            callback(result.records.map((record) => {
              let time = null;
              const properties = record.properties;
              if (record.time) {
                time = record.time;
              } else if (properties) {
                // TODO: other property names than begin_time/end_time
                if (properties.begin_time && properties.end_time) {
                  time = [new Date(properties.begin_time), new Date(properties.end_time)];
                } else if (properties.time) {
                  if (Array.isArray(properties.time)) {
                    time = properties.time;
                  } else {
                    time = [properties.time];
                  }
                }
              }

              if (time === null) {
                return null;
              }

              return [...time, record];
            }).filter(item => item !== null));
          });
        };

        bucketSource = (start, end, params, callback) => {
          const filtersModel = new FiltersModel({ time: [start, end] });
          getCount(layerModel, filtersModel, null, { mimeType: 'application/atom+xml' })
            .then(count => callback(count));
        };
        break;
      case 'WMS':
        source = new WMSSource({
          url: layerModel.get('search').url || layerModel.get('search').urls[0],
          layer: layerModel.get('search').id,
        });
        break;
      default:
        // eslint-disable-next-line
        console.warn(`Unexpected search protocol ${layerModel.get('search').protocol}`);
        break;
    }

    this.timeSlider.addDataset({
      id: layerModel.get('id'),
      color: layerModel.get('displayColor'),
      highlightFillColor: this.highlightFillColor,
      highlightStrokeColor: this.highlightStrokeColor,
      source,
      bucket: layerModel.get('search.lightweightBuckets'),
      bucketSource,
      histogramThreshold: layerModel.get('search.histogramThreshold'),
      histogramBinCount: layerModel.get('search.histogramBinCount'),
      cacheRecords: true,
      cacheIdField: 'id',
      cluster: true,
    });
  },

  removeLayer(layerModel) {
    this.timeSlider.removeDataset(layerModel.get('id'));
    const visibleLayers = this.layersCollection.filter(m => m.get('display.visible'));
    if (visibleLayers.length === 0) {
      this.$el.fadeOut();
    }
  },

  createRecordFilter(bbox) {
    return (record) => {
      const params = record[2];
      if (params && params.bbox) {
        if (bbox[0] < bbox[2]) {
          return intersects(bbox, params.bbox);
        }
        return intersects([-180, bbox[1], bbox[2], bbox[2]], params.bbox)
          || intersects([bbox[0], bbox[1], 180, bbox[2]], params.bbox);
      }
      return true;
    };
  },

  // two way binding of time selection

  onSelectionChanged(event) {
    const selection = event.originalEvent.detail;
    this.mapModel.set('time', [selection.start, selection.end]);
  },

  onRecordClicked(event) {
    const record = event.originalEvent.detail;
    if (record.params) {
      this.mapModel.show(record.params);
    }
    this.mapModel.set('time', [record.start, record.end]);
  },

  onRecordMouseover(event) {
    const record = event.originalEvent.detail;
    const feature = Object.assign({}, record.params, { layerId: record.dataset });
    this.highlightModel.highlight(feature);
  },

  onRecordMouseout(event) {
    const record = event.originalEvent.detail;
    this.highlightModel.unHighlight(record.params);
  },

  onRecordsClicked(event) {
    const detail = event.originalEvent.detail;
    const records = detail.bin || detail.records;
    const combinedBbox = records.filter(record => record[2] && record[2].bbox)
      .map(record => record[2].bbox)
      .reduce((lastBbox, thisBbox) => {
        if (!lastBbox) {
          return thisBbox;
        }
        return [
          Math.min(lastBbox[0], thisBbox[0]),
          Math.min(lastBbox[1], thisBbox[1]),
          Math.max(lastBbox[2], thisBbox[2]),
          Math.max(lastBbox[3], thisBbox[3]),
        ];
      }, null);
    if (combinedBbox) {
      this.mapModel.show({ bbox: combinedBbox });
    }
    this.mapModel.set('time', [detail.start, detail.end]);
  },

  onRecordsMouseover(event) {
    const detail = event.originalEvent.detail;
    const bin = (detail.bin || detail.records).map(record =>
      Object.assign({}, record[2], { layerId: detail.dataset })
    );
    this.currentBin = bin;
    this.highlightModel.highlight(bin);
  },

  onRecordsMouseout() {
    this.highlightModel.unHighlight(this.currentBin);
  },

  onBucketMouseover(event) {
    const detail = event.originalEvent.detail;
    this.highlightModel.highlight({
      id: `detail.dataset-${detail.start.toISOString()}-${detail.end.toISOString()}`,
      layerId: detail.dataset,
      properties: {
        time: [
          new Date(detail.start.getTime() + 1),
          new Date(detail.end.getTime() - 1)
        ],
      },
    });
  },

  onBucketMouseout(event) {
    const detail = event.originalEvent.detail;
    this.highlightModel.unHighlight({
      id: `detail.dataset-${detail.start.toISOString()}-${detail.end.toISOString()}`,
      layerId: detail.dataset,
    });
  },

  onBucketClicked(event) {
    const detail = event.originalEvent.detail;
    this.mapModel.set('time', [detail.start, detail.end]);
  },

  onModelSelectionChanged(mapModel) {
    // eslint-disable-next-line
    let [low, high] = mapModel.get('time');
    if (this.timeSlider.options.selectionLimit) {
      const maxTime = (this.timeSlider.options.selectionLimit * 1000);
      const dt = high.getTime() - low.getTime();
      if (dt > maxTime) {
        high = new Date(low.getTime() + maxTime);
      }
    }
    this.timeSlider.select(low, high);
  },

  onLoadStart() {
    this.$('.control#reload i').addClass('fa-spin');
  },

  onLoadEnd() {
    this.$('.control#reload i').removeClass('fa-spin');
  },

  // collection events

  onLayerAdded(layerModel) {
    this.addLayer(layerModel);
  },

  onLayerRemoved(layerModel) {
    this.removeLayer(layerModel);
  },

  onLayerChanged(layerModel) {
    if (layerModel.hasChanged('display') && layerModel.get('search.protocol')) {
      if (layerModel.get('display.visible') && !this.timeSlider.hasDataset(layerModel.get('id'))) {
        this.addLayer(layerModel);
      } else {
        this.removeLayer(layerModel);
      }
    }
  },

  onHighlightFeatureChange(highlightModel, feature) {
    let features = [];
    if (Array.isArray(feature)) {
      features = feature;
    } else if (feature) {
      features = [feature];
    }

    const layerFeatures = {};
    features.forEach((f) => {
      if (f && f.layerId && f.properties.time) {
        if (!layerFeatures[f.layerId]) {
          layerFeatures[f.layerId] = [];
        }
        layerFeatures[f.layerId].push(f.properties.time);
      }
    });

    this.layersCollection.forEach(layerModel => (
      this.timeSlider.setRecordHighlights(layerModel.get('id'), layerFeatures[layerModel.get('id')] || [])
    ));
  },
});


export default TimeSliderView;
