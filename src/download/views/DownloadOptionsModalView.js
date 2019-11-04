import turfBBox from '@turf/bbox';
import $ from 'jquery';
import _ from 'underscore';
import ModalView from '../../core/views/ModalView';

import template from './DownloadOptionsModalView.hbs';
import './DownloadOptionsModalView.css';

import FiltersModel from '../../core/models/FiltersModel';

import { downloadRecord } from '../../download';

export default ModalView.extend({
  template,
  templateHelpers() {
    return {
      records: this.records,
      downloadOptions: this.showDownloadOptions,
      bbox: this.bbox.map(v => v.toFixed(4)),
    };
  },

  onRender() {
    const preferences = this.getPreferences();
    const preferredFormat = preferences.preferredFormat;
    const preferredInterpolation = preferences.preferredInterpolation;
    const preferredProjection = preferences.preferredProjection;
    const preferredScalingMethod = preferences.preferredScalingMethod;
    const preferredResolution = preferences.preferredResolution;
    const preferredScale = preferences.preferredScale;
    const subsetByBounds = preferences.subsetByBounds;

    if (subsetByBounds) {
      this.$('.subset-by-bounds').prop('checked', true);
      this.model.set('subsetByBounds', subsetByBounds);
    }
    if (preferredFormat) {
      this.$('.select-format').val(preferredFormat);
      this.model.set('selectedDownloadFormat', preferredFormat);
    }
    if (preferredInterpolation) {
      this.$('.select-interpolation').val(preferredInterpolation);
      this.model.set('selectedInterpolation', preferredInterpolation);
    }
    if (preferredProjection) {
      this.$('.select-projection').val(preferredProjection);
      this.model.set('selectedProjection', preferredProjection);
    }
    if (preferredScalingMethod) {
      this.$(`input[name="scale-method"][value=${preferredScalingMethod}]`).prop('checked', true);
      if (preferredScalingMethod === 'resolution' && !isNaN(preferredResolution[0]) && !isNaN(preferredResolution[1])) {
        this.$('[name="resolution-x"]').val(preferredResolution[0]);
        this.$('[name="resolution-y"]').val(preferredResolution[1]);
      } else if (preferredScalingMethod === 'scale') {
        this.$('[name="scalefactor"]').val(preferredScale * 100);
      }
      this.onScaleMethodChange();
      this.onSizeOrResolutionChange();
    }
  },

  events: {
    'change .select-projection': 'onProjectionChange',
    'change .select-format': 'onFormatChange',
    'change .select-interpolation': 'onInterpolationChange',
    'change .subset-by-bounds': 'onSubsetByBoundsChange',
    'click .start-download': 'onStartDownloadClicked',
    'click .btn-draw-bbox': 'onDrawBBoxClicked',
    'change .show-bbox': 'onBBoxInputChange',
    'change [name="scale-method"]': 'onScaleMethodChange',
    [`change [name^='resolution-']`]: 'onSizeOrResolutionChange',
    'change [name="scalefactor"]': 'onSizeOrResolutionChange',
  },

  initialize(options) {
    this.mapModel = options.mapModel;
    this.filtersModel = options.filtersModel;
    const filtersArea = options.mapModel.get('area');
    if (filtersArea) {
      if (Array.isArray(filtersArea)) {
        this.bbox = filtersArea;
      } else {
        this.bbox = turfBBox(filtersArea);
      }
    } else {
      this.bbox = options.mapModel.get('bbox');
    }

    this.listenTo(this.mapModel, 'change:area', () => {
      const bbox = this.mapModel.get('area');
      if (Array.isArray(bbox)) {
        this.bbox = bbox;
        this.render();
      }
    });

    if (options.records) {
      this.records = options.records;
    } else {
      const searchCollection = options.searchCollection;
      this.records = searchCollection.reduce((acc, searchModel) => (
        acc.concat(searchModel.get('downloadSelection')
          .map(recordModel => [recordModel, searchModel]))
      ), []);
    }
    this.showDownloadOptions = this.records.reduce((acc, record) => (
      acc || record[1].get('layerModel').get('download.protocol') === 'EO-WCS'
    ), false);
    this.defaultLabelsSet();
  },

  onProjectionChange() {
    const val = this.$('.select-projection').val();
    this.model.set('selectedProjection', (val !== '' && val !== '---') ? val : null);
    this.updatePreferences('preferredProjection', (val !== '' && val !== '---') ? val : null);
  },

  onFormatChange() {
    const val = this.$('.select-format').val();
    this.model.set('selectedDownloadFormat', (val !== '' && val !== '---') ? val : null);
    this.updatePreferences('preferredFormat', (val !== '' && val !== '---') ? val : null);
  },

  onInterpolationChange() {
    const val = this.$('.select-interpolation').val();
    this.model.set('selectedInterpolation', (val !== '' && val !== '---') ? val : null);
    this.updatePreferences('preferredInterpolation', (val !== '' && val !== '---') ? val : null);
  },

  onScaleMethodChange() {
    switch (this.$('input[name="scale-method"]:checked').val()) {
      case 'full':
        this.$(`input[name^='resolution']`).prop('disabled', true);
        this.$('input[name="scalefactor"]').prop('disabled', true);
        this.model.set({
          scaleMethod: 'none',
        });
        break;
      case 'resolution': {
        this.$(`input[name^='resolution']`).prop('disabled', false);
        this.$('input[name="scalefactor"]').prop('disabled', true);

        this.model.set({
          scaleMethod: 'resolution',
          resolutionX: parseFloat(this.$('input[name="resolution-x"]').val()),
          resolutionY: parseFloat(this.$('input[name="resolution-y"]').val()),
        });
        break;
      }
      case 'scale': {
        this.$(`input[name^='resolution']`).prop('disabled', true);
        this.$('input[name="scalefactor"]').prop('disabled', false);

        this.model.set({
          scaleMethod: 'scale',
          scale: parseFloat(this.$('input[name="scalefactor"]').val()) / 100,
        });
        break;
      }
      default:
        break;
    }
    this.updatePreferences(
      'preferredScalingMethod',
      this.$('input[name="scale-method"]:checked').val()
    );
  },

  onSizeOrResolutionChange() {
    const resolution = [
      parseFloat(this.$('input[name="resolution-x"]').val()),
      parseFloat(this.$('input[name="resolution-y"]').val()),
    ];
    const scale = parseFloat(this.$('input[name="scalefactor"]').val()) / 100;

    this.model.set({
      resolutionX: resolution[0],
      resolutionY: resolution[1],
      scale,
    });
    this.updatePreferences('preferredResolution', resolution);
    this.updatePreferences('preferredScale', scale);
  },

  onDrawBBoxClicked() {
    this.mapModel.set('tool', 'bbox');
    this.close();

    this.listenToOnce(this.mapModel, 'change:tool', () => {
      this.open();
    });
  },

  onSubsetByBoundsChange() {
    const checked = this.$('.subset-by-bounds').is(':checked');
    this.model.set('subsetByBounds', checked);
    this.updatePreferences('subsetByBounds', checked);
  },

  getPreferences() {
    try {
      return JSON.parse(localStorage.getItem(
        'download-options-view-preferences'
      ) || '{}');
    } catch (error) {
      return {};
    }
  },

  updatePreferences(key, value) {
    const preferences = this.getPreferences();
    preferences[key] = value;
    localStorage.setItem(
      'download-options-view-preferences',
      JSON.stringify(preferences),
    );
  },

  defaultLabelsSet() {
    _.each(this.model.get('availableDownloadFormats'), (format) => {
      if (typeof format.name === 'undefined' && format.mimeType !== 'undefined') {
        // eslint-disable-next-line no-param-reassign
        format.name = format.mimeType;
      }
    });
    _.each(this.model.get('availableProjections'), (proj) => {
      if (typeof proj.name === 'undefined' && proj.identifier !== 'undefined') {
        // eslint-disable-next-line no-param-reassign
        proj.name = proj.identifier;
      }
    });
    _.each(this.model.get('availableInterpolations'), (interpolation) => {
      if (typeof interpolation.name === 'undefined' && interpolation.identifier !== 'undefined') {
        // eslint-disable-next-line no-param-reassign
        interpolation.name = interpolation.identifier;
      }
    });
  },

  onBBoxInputChange() {
    const bbox = this.$('.show-bbox')
      .map((index, elem) => $(elem).val())
      .get()
      .map(parseFloat);

    if (bbox.reduce((prev, current) => prev && !isNaN(current), true)) {
      this.mapModel.set('drawnArea', null);
      this.mapModel.set('area', bbox);
    }
  },

  onStartDownloadClicked() {
    this.onSizeOrResolutionChange();

    const options = {
      format: this.model.get('selectedDownloadFormat'),
      outputCRS: this.model.get('selectedProjection'),
      subsetCRS: 'EPSG:4326', // TODO make this the maps projection
      interpolation: this.model.get('selectedInterpolation'),
    };
    const filtersModel = new FiltersModel();
    if (this.model.get('subsetByBounds')) {
      const bboxSubset = this.bbox;
      // min-max coordinates can not be the same for subsetting
      // do not modify the input forms & mapModel filter, only values for subset
      if (bboxSubset[0] === bboxSubset[2]) {
        bboxSubset[2] += 0.0001;
      }
      if (bboxSubset[1] === bboxSubset[3]) {
        bboxSubset[3] += 0.0001;
      }
      filtersModel.set('area', bboxSubset);
    }

    switch (this.model.get('scaleMethod') || 'resolution') {
      case 'resolution': {
        options.sizeX = Math.round((this.bbox[2] - this.bbox[0]) / this.model.get('resolutionX'));
        options.sizeY = Math.round((this.bbox[3] - this.bbox[1]) / this.model.get('resolutionY'));
        break;
      }
      case 'scale':
        options.scale = this.model.get('scale');
        break;
      default:
        break;
    }

    this.records.forEach(([recordModel, searchModel], i) => {
      setTimeout(() =>
        downloadRecord(
          searchModel.get('layerModel'), filtersModel, recordModel, options), i * 0
      );
    });
  }
});
