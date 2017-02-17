import turfBBox from '@turf/bbox';

import ModalView from '../../core/views/ModalView';

import template from './DownloadOptionsModalView.hbs';
import './DownloadOptionsModalView.css';

import FiltersModel from '../../core/models/FiltersModel';

import { downloadRecord, getDownloadUrl } from '../../download';


import $ from 'jquery';

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
    'change .subset-by-bounds': 'onSubsetByBoundsChange',
    'click .start-download': 'onStartDownloadClicked',
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
  },

  onProjectionChange() {
    const val = this.$('.select-projection').val();
    this.model.set('selectedProjection', val !== '' ? val : null);
  },

  onFormatChange() {
    const val = this.$('.select-format').val();
    this.model.set('selectedDownloadFormat', val !== '' ? val : null);
  },

  onSubsetByBoundsChange() {
    this.model.set('subsetByBounds', this.$('.subset-by-bounds').is(':checked'));
  },

  onStartDownloadClicked() {
    const options = {
      format: this.model.get('selectedDownloadFormat'),
      outputCRS: this.model.get('selectedProjection'),
      subsetCRS: 'EPSG:4326', // TODO make this the maps projection
    };
    const filtersModel = new FiltersModel();
    if (this.model.get('subsetByBounds')) {
      filtersModel.set('area', this.bbox);
    }

    const [recordModel, searchModel] = this.records[0];
    // $.ajax({
    //   type: "GET",
    //   async: true,
    //   url: getDownloadUrl(searchModel.get('layerModel'), null, recordModel),
    // }).done(() => {
    //   alert(arguments)
    // })
    this.records.forEach(([recordModel, searchModel]) => downloadRecord(
        searchModel.get('layerModel'), filtersModel, recordModel, options, this.$('#download-elements')
      )
    );
  }
});
