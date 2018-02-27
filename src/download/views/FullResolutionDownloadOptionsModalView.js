import turfBBox from '@turf/bbox';

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
    }
    if (preferredInterpolation) {
      this.$('select[name="interpolation"]').val(preferredInterpolation);
    }
    if (preferredProjection) {
      this.$('.select-projection').val(preferredProjection);
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
    }

    if (preferredFields) {
      this.$('[name="field"]').prop('checked', false);
      preferredFields.forEach((field) => {
        this.$(`[name="field"][value="${field}"]`).prop('checked', true);
      });
    }

    // this.$('[name=]')
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
  },

  onBandsChange() {
    const fields = this.$('[name="field"]:checked').map((i, input) => input.value).get();
    this.model.set('fields', fields);
    this.updatePreferences('preferredFields', fields);
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


  updatePreferences(key, value) {
    const preferences = this.getPreferences();
    preferences[key] = value;
    localStorage.setItem(
      `full-resolution-download-options-view-preferences-${this.layerModel.get('layerId')}`,
      JSON.stringify(preferences),
    );
  },

  getPreferences() {
    try {
      return JSON.parse(localStorage.getItem(
        `full-resolution-download-options-view-preferences-${this.layerModel.get('layerId')}`
      ) || '{}');
    } catch (error) {
      return {};
    }
  }
});
