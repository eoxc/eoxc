import Marionette from 'backbone.marionette';
import TimeSlider from 'D3.TimeSlider/src/d3.timeslider.coffee';
import WMSSource from 'D3.TimeSlider/src/sources/wms.coffee';
import WPSSource from 'D3.TimeSlider/src/sources/eoxserver-wps.coffee';
import 'D3.TimeSlider/src/d3.timeslider.less';

import { searchAllRecords, getCount } from '../../search';
import FiltersModel from '../models/FiltersModel';

import './TimeSliderView.css';


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
    this.timeSliderAlternativeBrush = options.timeSliderAlternativeBrush;
    this.enableDynamicHistogram = options.enableDynamicHistogram;
    this.searchRequests = [];
    this.maxMapInterval = this.mapModel.get('maxMapInterval');
    if (this.maxMapInterval) {
      // initial setup if shared time
      this.mapModel.set('extendedTime', this.mapModel.get('time'));
    }
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
      alternativeBrush: this.timeSliderAlternativeBrush,
      displayLimit: this.displayInterval,
      selectionLimit: this.selectableInterval,
      recordFilter: this.createRecordFilter(this.mapModel.get('bbox')),
      brushTooltip: true,
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

    if (this.enableDynamicHistogram) {
      this.listenTo(this.mapModel, 'change:area', this.addVisibleLayers);
      this.listenTo(this.mapModel, 'change:bbox', () => {
        if (this.mapModel.get('area') === null) {
          // only trigger refresh of timeslider when no area is selected through filter
          this.addVisibleLayers();
        }
      });
    } else {
      this.addVisibleLayers();
    }

    this.listenTo(this.mapModel, 'change:time', this.onModelSelectionChanged);
    this.listenTo(this.mapModel, 'change:extendedTime', () => {
      const extendedTime = this.mapModel.get('extendedTime');
      if (extendedTime && !this.maxMapInterval) {
        this.timeSlider.setHighlightInterval(
          extendedTime[0], extendedTime[1],
          this.filterFillColor, this.filterStrokeColor, this.filterOutsideColor,
          true
        );
      } else {
        // do not highlight timeslider area when maxMapInterval is set
        this.timeSlider.setHighlightInterval(null);
      }
    });
    this.listenTo(this.mapModel, 'show:time', (timeFilter) => {
      this.timeSlider.center(...timeFilter);
    });
    this.listenTo(this.layersCollection, 'add', this.onLayerAdded);
    this.listenTo(this.layersCollection, 'remove', this.onLayerRemoved);
    this.listenTo(this.layersCollection, 'sort', this.onLayersSorted);
    this.listenTo(this.layersCollection, 'change:display.visible', this.onLayerVisibleChanged);

    this.listenTo(this.mapModel, 'change:bbox', (mapModel) => {
      this.timeSlider.setRecordFilter(this.createRecordFilter(mapModel.get('bbox')));
    });
    this.listenTo(this.highlightModel, 'change:highlightFeature', this.onHighlightFeatureChange);
  },

  addVisibleLayers() {
    // cancel ongoing timeslider requests
    this.searchRequests.forEach((req) => {
      if (typeof req.emit === 'function') {
        // PagedSearchProgressEmitter
        req.emit('cancel');
      } else if (typeof req.cancel === 'function') {
        // Bluebird Promise
        req.cancel();
      }
    });
    const visibleLayers = this.layersCollection.filter(
      layerModel => layerModel.get('display.visible')
    );
    visibleLayers.forEach((layerModel) => {
      this.removeLayer(layerModel);
      this.addLayer(layerModel);
    });
    this.checkVisible(false);
  },

  addLayer(layerModel) {
    let source;
    let bucketSource;
    const mapModel = this.enableDynamicHistogram === true ? this.mapModel : null;
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
          // set "fixed" parameters here
          const filtersModel = new FiltersModel((layerModel.get('search.parameters') || []).reduce(
            (acc, param) => (
              param.fixed
                ? Object.assign(acc, { [param.type]: param.fixed })
                : acc
              ), { time: [start, end] }
          ));
          // this should be taken from searchModel.get('defaultPageSize') to be correct, but currently set to null by default and would need some rewrites
          const itemsPerPage = layerModel.get('search').pageSize;
          const emitter = searchAllRecords(layerModel, filtersModel, mapModel, { mimeType: 'application/atom+xml', itemsPerPage });
          emitter.on('progress', (result) => {
            callback(result.records.map((record) => {
              let time = null;
              const properties = record.properties;
              if (record.time) {
                time = record.time;
                if (time instanceof Date) {
                  time = [time, time];
                }
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
          emitter.on('error', () => callback([]));
          this.searchRequests.push(emitter);
        };

        bucketSource = (start, end, params, callback) => {
          const filtersModel = new FiltersModel((layerModel.get('search.parameters') || []).reduce(
            (acc, param) => (
              param.fixed
                ? Object.assign(acc, { [param.type]: param.fixed })
                : acc
              ), { time: [start, end] }
          ));
          const result = getCount(layerModel, filtersModel, mapModel, { mimeType: 'application/atom+xml' });
          result.then(count => callback(count));
          this.searchRequests.push(result);
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
      noBorder: layerModel.get('noTimeSliderBorder'),
      bucket: layerModel.get('search.lightweightBuckets'),
      bucketSource,
      histogramThreshold: layerModel.get('search.histogramThreshold'),
      histogramBinCount: layerModel.get('search.histogramBinCount'),
      cacheRecords: true,
      cacheIdField: 'id',
      cluster: true,
    });
    this.onLayersSorted(this.layersCollection);
  },

  removeLayer(layerModel) {
    this.timeSlider.removeDataset(layerModel.get('id'));
  },

  checkVisible(fade = true) {
    const visibleLayers = this.layersCollection
      .filter(m => m.get('display.visible'));
    if (visibleLayers.length) {
      if (fade) {
        this.$el.fadeIn();
      } else {
        this.$el.show();
      }
    } else if (fade) {
      this.$el.fadeOut();
    } else {
      this.$el.hide();
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
    const selectionArray = [selection.start, selection.end];
    if (this.maxMapInterval) {
      this.mapModel.set('extendedTime', selectionArray);
    }
    this.mapModel.set('time', selectionArray);
  },

  onRecordClicked(event) {
    const record = event.originalEvent.detail;
    if (record.params) {
      this.mapModel.show(record.params);
    }
    if (this.maxMapInterval) {
      this.mapModel.set('extendedTime', [record.start, record.end]);
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
    // alternative behavior for shared bbox crossing antimeridian -> make bbox go over 180 if necessary
    // naively calculate the bounding box on WGS84
    const validBboxList = records.filter(record => record[2] && record[2].bbox)
      .map(record => record[2].bbox);
    const bboxNaiveCombined = validBboxList
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
    // naively calculate the bounding box on a "modified" WGS84, where 360° has been added to all negative longitudes
    const bboxModifiedCombined = validBboxList
      .map(bbox => [bbox[0] < 0 ? bbox[0] + 360 : bbox[0], bbox[1], bbox[2] < 0 ? bbox[2] + 360 : bbox[2], bbox[3]])
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

    if (bboxNaiveCombined) {
      // take smaller one of both bboxes
      if (bboxModifiedCombined[2] - bboxModifiedCombined[0] < bboxNaiveCombined[2] - bboxNaiveCombined[0]) {
        this.mapModel.show({ bbox: bboxModifiedCombined });
      } else {
        this.mapModel.show({ bbox: bboxNaiveCombined });
      }
    }
    if (this.maxMapInterval) {
      this.mapModel.set('extendedTime', [detail.start, detail.end]);
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
    if (this.maxMapInterval) {
      this.mapModel.set('extendedTime', [detail.start, detail.end]);
    }
    this.mapModel.set('time', [detail.start, detail.end]);
  },

  onModelSelectionChanged(mapModel) {
    // eslint-disable-next-line
    let [low, high] = this.maxMapInterval ? mapModel.get('extendedTime') : mapModel.get('time');
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
    this.checkVisible();
  },

  onLayerRemoved(layerModel) {
    this.removeLayer(layerModel);
    this.checkVisible();
  },

  onLayersSorted(layersCollection) {
    const ids = layersCollection.pluck('id');
    this.timeSlider.reorderDatasets(ids);
  },

  onLayerVisibleChanged(layerModel) {
    if (layerModel.hasChanged('display')) {
      if (layerModel.get('display.visible') && !this.timeSlider.hasDataset(layerModel.get('id'))) {
        this.addLayer(layerModel);
      } else {
        this.removeLayer(layerModel);
      }
    }
    this.checkVisible();
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

        let time = f.properties.time;
        if (time instanceof Date) {
          time = [time, time];
        }
        layerFeatures[f.layerId].push(time);
      }
    });

    this.layersCollection.forEach(layerModel => (
      this.timeSlider.setRecordHighlights(layerModel.get('id'), layerFeatures[layerModel.get('id')] || [])
    ));
  },
});


export default TimeSliderView;
