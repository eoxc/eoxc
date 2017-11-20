import turfBBox from '@turf/bbox';

import ModalView from '../../core/views/ModalView';

import template from './FullResolutionDownloadOptionsModalView.hbs';
import './DownloadOptionsModalView.css';

import FiltersModel from '../../core/models/FiltersModel';

import { downloadFullResolution } from '../../download';

export default ModalView.extend({
  template,
  templateHelpers() {
    return {
      records: this.records,
      downloadOptions: this.showDownloadOptions,
      bbox: this.bbox.map(v => v.toFixed(4)),
    };
  },

  events: {
    'change .select-projection': 'onProjectionChange',
    'change .select-format': 'onFormatChange',
    'click .start-download': 'onStartDownloadClicked',
    'change [name="scale-method"]': 'onScaleMethodChange',
  },

  initialize(options) {
    const filtersArea = options.filtersModel.get('area');
    if (filtersArea) {
      if (Array.isArray(filtersArea)) {
        this.bbox = filtersArea;
      } else {
        this.bbox = turfBBox(filtersArea);
      }
    } else {
      this.bbox = options.mapModel.get('bbox');
    }
    this.showDownloadOptions = true;
  },

  onProjectionChange() {
    const val = this.$('.select-projection').val();
    this.model.set('selectedProjection', val !== '' ? val : null);
  },

  onFormatChange() {
    const val = this.$('.select-format').val();
    this.model.set('selectedDownloadFormat', val !== '' ? val : null);
  },

  onScaleMethodChange() {
    switch (this.$('input[name="scale-method"]:checked').val()) {
      case 'resolution': {
        this.$(`input[name^='size']`).prop('disabled', true);
        this.$(`input[name^='resolution']`).prop('disabled', false);
        break;
      }
      case 'size': {
        this.$(`input[name^='size']`).prop('disabled', false);
        this.$(`input[name^='resolution']`).prop('disabled', true);
        break;
      }
      default:
        break;
    }
  },

  onStartDownloadClicked() {
    downloadFullResolution();
    // const options = {
    //   format: this.model.get('selectedDownloadFormat'),
    //   outputCRS: this.model.get('selectedProjection'),
    //   subsetCRS: 'EPSG:4326', // TODO make this the maps projection
    // };
    // const filtersModel = new FiltersModel();
    // if (this.model.get('subsetByBounds')) {
    //   filtersModel.set('area', this.bbox);
    // }
    //
    // // const [recordModel, searchModel] = this.records[0];
    // // $.ajax({
    // //   type: "GET",
    // //   async: true,
    // //   url: getDownloadUrl(searchModel.get('layerModel'), null, recordModel),
    // // }).done(() => {
    // //   alert(arguments)
    // // })
    // // this.records.forEach(([recordModel, searchModel]) => downloadRecord(
    // //     searchModel.get('layerModel'), filtersModel, recordModel, options, this.$('#download-elements')
    // //   )
    // // );
    //
    // this.records.forEach(([recordModel, searchModel], i) => {
    //   setTimeout(() =>
    //     downloadRecord(
    //       searchModel.get('layerModel'), filtersModel, recordModel, options, this.$('#download-elements')
    //     ), i * 0
    //   );
    // });
  }
});
