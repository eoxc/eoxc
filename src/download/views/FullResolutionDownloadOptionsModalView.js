import turfBBox from '@turf/bbox';
import i18next from 'i18next';
import $ from 'jquery';
import _ from 'underscore';
import ModalView from '../../core/views/ModalView';

import template from './FullResolutionDownloadOptionsModalView.hbs';
import './DownloadOptionsModalView.css';

import { downloadFullResolution } from '../../download/eowcs';

export default ModalView.extend({
  template,
  templateHelpers() {
    return {
      bbox: this.bbox.map(v => v.toFixed(4)),
      fields: this.layerModel.get('fullResolution.fields'),
      interpolations: this.layerModel.get('fullResolution.interpolations'),
      availableProjections: this.model.get('availableProjections'),
      availableDownloadFormats: this.model.get('availableDownloadFormats'),
    };
  },

  onRender() {
    const preferences = this.getPreferences();
    const preferredFormat = preferences.preferredFormat;
    const preferredInterpolation = preferences.preferredInterpolation;
    const preferredProjection = preferences.preferredProjection;
    const preferredScalingMethod = preferences.preferredScalingMethod;
    const preferredSize = preferences.preferredSize;
    const preferredResolution = preferences.preferredResolution;
    const preferredScale = preferences.preferredScale;
    const preferredFields = preferences.preferredFields;

    if (preferredFormat) {
      this.$('.select-format').val(preferredFormat);
      this.model.set('format', preferredFormat);
    }
    if (preferredInterpolation) {
      this.$('select[name="interpolation"]').val(preferredInterpolation);
      this.model.set('interpolation', preferredInterpolation);
    }
    if (preferredProjection) {
      this.$('.select-projection').val(preferredProjection);
      this.model.set('projection', preferredProjection);
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

    if (preferredFields) {
      this.$('[name="field"]').prop('checked', false);
      preferredFields.forEach((field) => {
        this.$(`[name="field"][value="${field}"]`).prop('checked', true);
      });
      this.model.set('fields', preferredFields);
      this.onBandsChange();
    }

    this.checkSize();
    this.checkValidity();
    this.checkBands();
    this.checkBbox();
  },

  events: {
    'change .select-projection': 'onProjectionChange',
    'change .select-format': 'onFormatChange',
    'change [name="field"]': 'onBandsChange',
    'change [name="interpolation"]': 'onInterpolationChange',
    'change [name="scale-method"]': 'onScaleMethodChange',
    [`change [name^='size-']`]: 'onSizeOrResolutionChange',
    [`change [name^='resolution-']`]: 'onSizeOrResolutionChange',
    'change [name="scalefactor"]': 'onSizeOrResolutionChange',
    'submit form': 'onFormSubmit',
    'click .start-download': 'onStartDownloadClicked',
    'click .btn-draw-bbox': 'onDrawBBoxClicked',
    'change .show-bbox': 'onBBoxInputChange',
  },

  initialize(options) {
    this.layerModel = options.layerModel;
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
    this.resolution = this.layerModel.get('fullResolution.maxSizeResolution');
    this.defaultLabelsSet();
  },

  onProjectionChange() {
    const val = this.$('.select-projection').val();
    this.model.set('projection', val !== '' ? val : null);
    this.updatePreferences('preferredProjection', val !== '' ? val : null);
  },

  onFormatChange() {
    const val = this.$('.select-format').val();
    this.model.set('format', val !== '' ? val : null);
    this.updatePreferences('preferredFormat', val !== '' ? val : null);
    this.checkBands();
  },

  onBandsChange() {
    const fields = this.$('[name="field"]:checked').map((i, input) => input.value).get();
    this.model.set('fields', fields);
    this.updatePreferences('preferredFields', fields);

    this.checkSize();
    this.checkValidity();
    this.checkBands();
  },

  onInterpolationChange() {
    const val = this.$('select[name="interpolation"]').val();
    this.model.set('interpolation', val !== '' ? val : null);
    this.updatePreferences('preferredInterpolation', val !== '' ? val : null);
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

    this.checkSize();
    this.checkValidity();
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

    this.$('input[name="size-x"]').val(this.model.get('sizeX'));
    this.$('input[name="size-y"]').val(this.model.get('sizeY'));

    this.updatePreferences('preferredResolution', resolution);
    this.updatePreferences('preferredSize', size);
    this.updatePreferences('preferredScale', scale);

    this.checkSize();
    this.checkValidity();
  },

  onStartDownloadClicked() {
    // refresh values from form
    this.onSizeOrResolutionChange();

    const options = {
      bbox: this.bbox,
      outputCRS: this.model.get('projection'),
      fields: this.model.get('fields'),
      format: this.model.get('format'),
      interpolation: this.model.get('interpolation'),
    };

    switch (this.model.get('scaleMethod') || 'resolution') {
      case 'resolution': {
        options.sizeX = Math.round((this.bbox[2] - this.bbox[0]) / this.model.get('resolutionX'));
        options.sizeY = Math.round((this.bbox[3] - this.bbox[1]) / this.model.get('resolutionY'));
        break;
      }
      case 'size':
        options.sizeX = this.model.get('sizeX');
        options.sizeY = this.model.get('sizeY');
        break;
      case 'scale':
        options.scale = this.model.get('scale');
        break;
      default:
        break;
    }
    downloadFullResolution(this.layerModel, this.mapModel, this.filtersModel, options);
  },

  onDrawBBoxClicked() {
    this.mapModel.set('tool', 'bbox');
    this.close();

    this.listenToOnce(this.mapModel, 'change:tool', () => {
      this.open();
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
    this.checkBbox();
  },


  updatePreferences(key, value) {
    const preferences = this.getPreferences();
    preferences[key] = value;
    localStorage.setItem(
      `full-resolution-download-options-view-preferences-${this.layerModel.get('id')}`,
      JSON.stringify(preferences),
    );
  },

  checkSize() {
    // show warning when:
    // "sizeX * sizeY * #bands * bits/band (assume 8) / 1024 / 1024 >= maxSizeWarning"
    let sizeX = 0;
    let sizeY = 0;
    let estimated_size = 0;
    switch (this.model.get('scaleMethod') || 'resolution') {
      case 'resolution': {
        sizeX = Math.round((this.bbox[2] - this.bbox[0]) / this.model.get('resolutionX'));
        sizeY = Math.round((this.bbox[3] - this.bbox[1]) / this.model.get('resolutionY'));
        break;
      }
      case 'size':
        sizeX = this.model.get('sizeX');
        sizeY = this.model.get('sizeY');
        break;
      case 'scale':
        sizeX = Math.round((this.bbox[2] - this.bbox[0]) / this.resolution * this.model.get('scale'));
        sizeY = Math.round((this.bbox[3] - this.bbox[1]) / this.resolution * this.model.get('scale'));
        break;
      default:
        sizeX = Math.round((this.bbox[2] - this.bbox[0]) / this.resolution);
        sizeY = Math.round((this.bbox[3] - this.bbox[1]) / this.resolution);
        break;
    }

    const $sizeWarning = this.$('.size-warning');

    const fields = this.model.get('fields') || [];
    estimated_size = (sizeX * sizeY * fields.length) / 131072;
    if (estimated_size >= this.layerModel.get('fullResolution.maxSizeWarning')) {
      $sizeWarning.html(i18next.t('download_size_warning', { estimated_size: parseFloat(estimated_size).toFixed(0) }));
      $sizeWarning.fadeIn();
    } else if ($sizeWarning.is(':visible')) {
      $sizeWarning.hide();
    } else {
      $sizeWarning.hide();
    }
  },

  checkValidity() {
    let isInvalid = false;
    switch (this.model.get('scaleMethod') || 'none') {
      case 'none':
        this.$('.input-resolution').removeClass('has-error');
        this.$('.input-size').removeClass('has-error');
        this.$('.input-scale').removeClass('has-error');
        break;
      case 'resolution':
        if (isNaN(this.model.get('resolutionX')) || isNaN(this.model.get('resolutionY')) || this.model.get('resolutionX') <= 0 || this.model.get('resolutionY') <= 0) {
          this.$('.input-resolution').addClass('has-error');
          isInvalid = true;
        } else {
          this.$('.input-resolution').removeClass('has-error');
        }
        this.$('.input-size').removeClass('has-error');
        this.$('.input-scale').removeClass('has-error');
        break;
      case 'size':
        if (isNaN(this.model.get('sizeX')) || isNaN(this.model.get('sizeY')) || this.model.get('sizeX') <= 0 || this.model.get('sizeY') <= 0 || Math.floor(this.model.get('sizeX')) != this.model.get('sizeX') || Math.floor(this.model.get('sizeY')) != this.model.get('sizeY')) {
          this.$('.input-size').addClass('has-error');
          isInvalid = true;
        } else {
          this.$('.input-size').removeClass('has-error');
        }
        this.$('.input-resolution').removeClass('has-error');
        this.$('.input-scale').removeClass('has-error');
        break;
      case 'scale':
        if (isNaN(this.model.get('scale')) || this.model.get('scale') <= 0) {
          this.$('.input-scale').addClass('has-error');
          isInvalid = true;
        } else {
          this.$('.input-scale').removeClass('has-error');
        }
        this.$('.input-resolution').removeClass('has-error');
        this.$('.input-size').removeClass('has-error');
        break;
      default:
        break;
    }

    const fields = (
      this.model.get('fields')
      || this.getPreferences().preferredFields
      || this.layerModel.get('fullResolution.fields').map(f => f.identifier)
    );
    if (!fields || !fields.length) {
      this.$('.input-fields').addClass('has-error');
      isInvalid = true;
    } else {
      this.$('.input-fields').removeClass('has-error');
    }

    this.$('.start-download').prop('disabled', isInvalid);
  },

  checkBands() {
    const formatType = this.model.get('format');
    const format = this.model.get('availableDownloadFormats').find(frmt => frmt.mimeType === formatType);

    const $bandsWarning = this.$('.bands-warning');
    if (format && !isNaN(format.maxBands)) {
      const fields = this.model.get('fields');
      if (fields.length > parseInt(format.maxBands, 10)) {
        $bandsWarning.text(
          i18next.t('download_bands_warning', {
            maxBands: format.maxBands,
            requestedBands: fields.length,
          })
        );
        $bandsWarning.fadeIn();
      } else {
        setTimeout(() => $bandsWarning.stop(true, true).hide());
      }
    } else {
      setTimeout(() => $bandsWarning.stop(true, true).hide());
    }
  },

  checkBbox() {
    // TODO: make max_bbox_axis configurable
    const $bboxWarning = this.$('.bbox-warning');
    const maxBboxSize = this.layerModel.get('fullResolution.maxBboxEdgeSize');
    if (this.bbox[3] - this.bbox[1] >= maxBboxSize) {
      $bboxWarning.html(i18next.t('max_bbox_warning', {
        max_bbox_size: maxBboxSize,
        max_bbox_axis: 'lat',
        max_bbox_exceed: (this.bbox[3] - this.bbox[1] - maxBboxSize).toFixed(4),
      }));
      $bboxWarning.fadeIn();
    } else if (this.bbox[2] - this.bbox[0] >= maxBboxSize) {
      $bboxWarning.html(i18next.t('max_bbox_warning', {
        max_bbox_size: maxBboxSize,
        max_bbox_axis: 'lon',
        max_bbox_exceed: (this.bbox[2] - this.bbox[0] - maxBboxSize).toFixed(4),
      }));
      $bboxWarning.fadeIn();
    } else if ($bboxWarning.is(':visible')) {
      $bboxWarning.hide();
    } else {
      $bboxWarning.hide();
    }
  },

  getPreferences() {
    try {
      return JSON.parse(localStorage.getItem(
        `full-resolution-download-options-view-preferences-${this.layerModel.get('id')}`
      ) || '{}');
    } catch (error) {
      return {};
    }
  },

  defaultLabelsSet() {
    _.each(this.model.get('availableDownloadFormats'), (format) => {
      if (!format.get('name') && format.get('mimeType')) {
        format.set('name', format.get('mimeType'));
      }
    });
    _.each(this.model.get('availableProjections'), (proj) => {
      if (!proj.get('name') && proj.get('identifier')) {
        proj.set('name', proj.get('identifier'));
      }
    });
    _.each(this.layerModel.get('fullResolution.fields'), (field) => {
      if (typeof (field.name) === 'undefined' && typeof (field.identifier) !== 'undefined') {
        // eslint-disable-next-line no-param-reassign
        field.name = field.identifier;
      }
    });
    _.each(this.layerModel.get('fullResolution.interpolations'), (interpolation) => {
      if (typeof (interpolation.name) === 'undefined' && typeof (interpolation.identifier) !== 'undefined') {
        // eslint-disable-next-line no-param-reassign
        interpolation.name = interpolation.identifier;
      }
    });
  },
});
