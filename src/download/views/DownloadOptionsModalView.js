import turfBBox from '@turf/bbox';
import $ from 'jquery';
import _ from 'underscore';
import { transformExtent } from 'ol/proj';
import ModalView from '../../core/views/ModalView';

import template from './DownloadOptionsModalView.hbs';
import './DownloadOptionsModalView.css';

import FiltersModel from '../../core/models/FiltersModel';

import { downloadRecord, downloadMultipleRecords } from '../../download';
import { getProjectionOl } from '../../contrib/OpenLayers/utils';

export default ModalView.extend({
  template,
  templateHelpers() {
    return {
      records: this.records,
      downloadOptions: this.showDownloadOptions,
      bbox: this.bbox.map(v => v.toFixed(4)),
      projection_4326: this.mapProjection.getCode() === 'EPSG:4326',
    };
  },

  onRender() {
    const preferences = this.getPreferences();
    const preferredFormat = preferences.preferredFormat;
    const preferredPackage = preferences.preferredPackage;
    const preferredInterpolation = preferences.preferredInterpolation;
    const preferredProjection = preferences.preferredProjection;
    const preferredScalingMethod = preferences.preferredScalingMethod;
    const preferredSize = preferences.preferredSize;
    const preferredResolution = preferences.preferredResolution;
    const preferredScale = preferences.preferredScale;
    const subsetByBounds = preferences.subsetByBounds;
    const useMultipleDownload = preferences.useMultipleDownload;

    if (subsetByBounds) {
      this.$('.subset-by-bounds').prop('checked', true);
      this.model.set('subsetByBounds', subsetByBounds);
    }
    if (useMultipleDownload) {
      this.$('.use-multiple-download').prop('checked', true);
      this.$('.downloadFormats').show();
      this.model.set('useMultipleDownload', useMultipleDownload);
    } else {
      this.$('.downloadFormats').hide();
    }
    if (preferredPackage) {
      this.$('.select-package').val(preferredPackage);
      this.model.set('selectedDownloadPackage', preferredPackage);
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
      } else if (preferredScalingMethod === 'size' && !isNaN(preferredSize[0]) && !isNaN(preferredSize[1])) {
        this.$('[name="size-x"]').val(preferredSize[0]);
        this.$('[name="size-y"]').val(preferredSize[1]);
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
    'change .select-package': 'onPackageChange',
    'change .select-interpolation': 'onInterpolationChange',
    'change .subset-by-bounds': 'onSubsetByBoundsChange',
    'change .use-multiple-download': 'onUseMultipleDownload',
    'click .start-download': 'onStartDownloadClicked',
    'click .btn-draw-bbox': 'onDrawBBoxClicked',
    'change .show-bbox': 'onBBoxInputChange',
    'change [name="scale-method"]': 'onScaleMethodChange',
    [`change [name^='size-']`]: 'onSizeOrResolutionChange',
    [`change [name^='resolution-']`]: 'onSizeOrResolutionChange',
    'change [name="scalefactor"]': 'onSizeOrResolutionChange',
  },

  initialize(options) {
    this.mapModel = options.mapModel;
    this.mapProjection = getProjectionOl(this.mapModel.get('projection'));
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
    this.bbox = transformExtent(this.bbox, 'EPSG:4326', this.mapProjection);

    this.listenTo(this.mapModel, 'change:area', () => {
      const bbox = this.mapModel.get('area');
      if (Array.isArray(bbox)) {
        this.bbox = transformExtent(bbox, 'EPSG:4326', this.mapProjection);
        this.render();
      } else if (bbox && typeof bbox === 'object') {
        this.bbox = transformExtent(turfBBox(bbox), 'EPSG:4326', this.mapProjection);
        this.render();
      }
      else if ( bbox && typeof bbox =='object'){
        this.bbox = turfBBox(bbox);
        this.mapModel.set('area', null);
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
  onPackageChange() {
    const val = this.$('.select-package').val();
    this.model.set('selectedDownloadPackage', (val !== '' && val !== '---') ? val : null);
    this.updatePreferences('preferredPackage', (val !== '' && val !== '---') ? val : null);
  },

  onPackageChange() {
    const val = this.$('.select-package').val();
    this.model.set('selectedDownloadPackage', (val !== '' && val !== '---') ? val : null);
    this.updatePreferences('preferredPackage', (val !== '' && val !== '---') ? val : null);
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
        this.$(`input[name^='size']`).prop('disabled', true);
        this.$('input[name="scalefactor"]').prop('disabled', true);
        this.model.set({
          scaleMethod: 'none',
        });
        break;
      case 'resolution': {
        this.$(`input[name^='resolution']`).prop('disabled', false);
        this.$(`input[name^='size']`).prop('disabled', true);
        this.$('input[name="scalefactor"]').prop('disabled', true);

        this.model.set({
          scaleMethod: 'resolution',
          resolutionX: parseFloat(this.$('input[name="resolution-x"]').val()),
          resolutionY: parseFloat(this.$('input[name="resolution-y"]').val()),
        });
        break;
      }
      case 'size': {
        this.$(`input[name^='resolution']`).prop('disabled', true);
        this.$(`input[name^='size']`).prop('disabled', false);
        this.$('input[name="scalefactor"]').prop('disabled', true);

        this.model.set({
          scaleMethod: 'size',
          sizeX: parseInt(this.$('input[name="size-x"]').val(), 10),
          sizeY: parseInt(this.$('input[name="size-y"]').val(), 10),
        });
        break;
      }
      case 'scale': {
        this.$(`input[name^='resolution']`).prop('disabled', true);
        this.$(`input[name^='size']`).prop('disabled', true);
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
    const size = [
      parseInt(this.$('input[name="size-x"]').val(), 10),
      parseInt(this.$('input[name="size-y"]').val(), 10),
    ];
    const scale = parseFloat(this.$('input[name="scalefactor"]').val()) / 100;

    this.model.set({
      resolutionX: resolution[0],
      resolutionY: resolution[1],
      sizeX: size[0],
      sizeY: size[1],
      scale,
    });
    this.updatePreferences('preferredResolution', resolution);
    this.updatePreferences('preferredSize', size);
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

  onUseMultipleDownload() {
    const checked = this.$('.use-multiple-download').is(':checked');
    this.model.set('useMultipleDownload', checked);
    this.updatePreferences('useMultipleDownload', checked);

    if (checked) {
      this.$('.downloadFormats').show();
      this.records.length > 5 && this.$('.download-confirm').hide();
      this.$('.multi-download-confirm').show();
      this.$('.spacer').show();



    } else {
      this.$('.downloadFormats').hide();
      this.$('.download-confirm').show();
      this.$('.multi-download-confirm').hide();
    }
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
    _.each(this.model.get('availableMultiDownloadFormats'), (mFormat) => {
      if (typeof mFormat.name === 'undefined' && mFormat.mimeType !== 'undefined') {
        // eslint-disable-next-line no-param-reassign
        mFormat.name = mFormat.mimeType;
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
      this.mapModel.set('area', transformExtent(bbox, this.mapProjection, 'EPSG:4326'));
    }
  },

  onStartDownloadClicked() {
    this.onSizeOrResolutionChange();
    let subsetProj = this.mapProjection.getCode();
    // get numeric code and parse it into opengis def url
    if (subsetProj) {
      subsetProj = subsetProj.slice(subsetProj.lastIndexOf(':') + 1);
      subsetProj = `http://www.opengis.net/def/crs/EPSG/0/${subsetProj}`;
    }
    const options = {
      format: this.model.get('selectedDownloadFormat'),
      package: this.model.get('selectedDownloadPackage'),
      outputCRS: this.model.get('selectedProjection'),
      subsetCRS: subsetProj,
      interpolation: this.model.get('selectedInterpolation'),
    };

    const filtersModel = new FiltersModel();
    if (this.model.get('subsetByBounds')) {
      const bboxSubset = this.bbox;
      // min-max coordinates can not be the same for subsetting
      // do not modify the input forms & mapModel filter, only values for subset
      if (bboxSubset[0] === bboxSubset[2]) {
        bboxSubset[0] -= 0.001;
        bboxSubset[2] += 0.001;
      }
      if (bboxSubset[1] === bboxSubset[3]) {
        bboxSubset[1] -= 0.001;
        bboxSubset[3] += 0.001;
      }
      filtersModel.set('area', bboxSubset);
    }

    switch (this.model.get('scaleMethod')) {
      case 'resolution': {
        // size will be computed later per-record
        options.resolutionX = this.model.get('resolutionX');
        options.resolutionY = this.model.get('resolutionY');
        break;
      }
      case 'size':
        options.sizeX = this.model.get('sizeX');
        options.sizeY = this.model.get('sizeY');
        options.sizeX = options.sizeX < 1 ? 1 : options.sizeX;
        options.sizeY = options.sizeY < 1 ? 1 : options.sizeY;
        break;
      case 'scale':
        options.scale = this.model.get('scale');
        options.scale = options.scale < 0 ? 1 : options.scale;
        break;
      default:
        break;
    }

    const GetEOCoverageSet = this.model.get('useMultipleDownload');
    if (GetEOCoverageSet) {
      const eoids = [];
      let url;
      this.records.forEach(([recordModel, searchModel], i) => {
        if (i === 0) {
          url = searchModel.get('layerModel').get('download.url');
        }
        eoids.push(recordModel.id);
      });
      downloadMultipleRecords(eoids, url, filtersModel, options);
    } else {
    // if EO-WCS, use a timeout
      const timeout = this.showDownloadOptions ? 500 : 0;
      this.records.forEach(([recordModel, searchModel], i) => {
        setTimeout(() =>
          downloadRecord(
            searchModel.get('layerModel'), filtersModel, recordModel, options), i * timeout
        );
      });
    }
  }
});
