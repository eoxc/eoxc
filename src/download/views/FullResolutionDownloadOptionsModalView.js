import turfBBox from '@turf/bbox';

import ModalView from '../../core/views/ModalView';

import template from './FullResolutionDownloadOptionsModalView.hbs';
import './DownloadOptionsModalView.css';

import { downloadFullResolution } from '../../download/eowcs';

export default ModalView.extend({
  template,
  templateHelpers() {
    return {
      records: this.records,
      bbox: this.bbox.map(v => v.toFixed(4)),
      fields: this.layerModel.get('fullResolution.fields'),
      interpolations: this.layerModel.get('fullResolution.interpolations'),
    };
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
  },

  onProjectionChange() {
    const val = this.$('.select-projection').val();
    this.model.set('projection', val !== '' ? val : null);
  },

  onFormatChange() {
    const val = this.$('.select-format').val();
    this.model.set('format', val !== '' ? val : null);
  },

  onBandsChange() {
    this.model.set('fields',
      this.$('[name="field"]:checked').map((i, input) => input.value).get()
    );
  },

  onInterpolationChange() {
    const val = this.$('input[name="interpolation"]').val();
    this.model.set('interpolation', val !== '' ? val : null);
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
  },

  onSizeOrResolutionChange() {
    this.model.set({
      resolutionX: parseFloat(this.$('input[name="resolution-x"]').val()),
      resolutionY: parseFloat(this.$('input[name="resolution-y"]').val()),
      sizeX: parseInt(this.$('input[name="size-x"]').val(), 10),
      sizeY: parseInt(this.$('input[name="size-y"]').val(), 10),
      scale: parseFloat(this.$('input[name="scalefactor"]').val()) / 100,
    });
  },

  onStartDownloadClicked() {
    // refresh values from form
    this.onSizeOrResolutionChange();

    const options = {
      bbox: this.bbox,
      outputCRS: this.projection,
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

  onFormSubmit() {
    console.log("submitting")
  }
});
