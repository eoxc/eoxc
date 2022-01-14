import Marionette from 'backbone.marionette';

import template from './ProcessingPanelView.hbs';

import { transformExtent } from 'ol/proj';
import turfBBox from '@turf/bbox';
import { getProjectionOl } from '../../contrib/OpenLayers/utils';

require('./DownloadOptionsModalView.css');
require('../../search/views/RecordDetailsView.css');

// eslint-disable-next-line max-len
const RecordDetailsView = Marionette.LayoutView.extend(/** @lends search/views/layers.RecordDetailsView# */{
  template,

  className: 'record-details-view',

  regions: {
    map: '.record-details-map',
  },

  templateHelpers() {
    return {
      processingModel: this.processingModel,
      bbox: this.bbox.map(v => v.toFixed(4)),
      headerText: this.headerText,
      coverageID: this.model.get('id'),
      selectedProcess: null,
      processes: this.processingModel.processes,
    };
  },
  events: {
    'change .select-process': 'onProcessChange',
    'click .btn-draw-bbox': 'onDrawBBoxClicked',
    'click .btn-draw-line': 'onDrawLineClicked',
    'change .select-inputs':'oninputSelect',
    'change .select-output':'onOutputSelect',
    'change .show-bbox': 'onBBoxInputChange',
    'change .subset-by-bounds':'onDefaultBBoxChecked',
    [`change [name^='input-parameter-']`]: 'onInputInsert',

  },
  initialize(options) {
    this.processingModel = options.processingModel;
    this.mapView = options.mapView;
    this.mapModel = options.mapModel;
    this.descriptionTemplate = options.descriptionTemplate;
    this.headerText = options.headerText;
    this.mapProjection = getProjectionOl(this.mapModel.get('projection'));

    this.bbox = transformExtent(this.model.get('bbox'), 'EPSG:4326', this.mapProjection);


    this.listenTo(this.mapModel, 'change:area', () => {
      const area = this.mapModel.get('area');
      if(area && area.geometry && area.geometry.type === 'LineString'){
        this.line = {
          point1:area.geometry.coordinates[0],
          point2: area.geometry.coordinates[1]
        }
        this.updateLinesInputs()

      }else{
        if (Array.isArray(area)) {
          this.bbox = transformExtent(area, 'EPSG:4326', this.mapProjection);

        } else if (area && typeof area === 'object') {
          this.bbox = transformExtent(turfBBox(area), 'EPSG:4326', this.mapProjection);

        }
        this.updateBboxInputs()
      }

    });

  },

  preferencesSetup(values, process, parentClass, preferences, selectedProcess){

    values.inputs.map(value =>{
      // set up input selection values
      const inputsSelection = this.$(parentClass).find('.select-inputs');
      inputsSelection.map((n, el) =>{
        if(value.id === el.name && preferences[process] && preferences[process][value.id])
        el.value = preferences[process][value.id];
        if(process === selectedProcess){
          this.requestOptions[el.name]=el.value;
        }
      });

      // set up input inserted values
      const inputsInsert = this.$(parentClass).find('input[name^="input-parameter-"]');
      inputsInsert.map((n, el) => {
        if(value.id === el.className && preferences[process] && preferences[process][value.id])
        el.value = preferences[process][value.id];
        if(process === selectedProcess){
        this.requestOptions[el.className]=el.value;
        }
      });
    });

    // set up output values.
    values.outputs.map(value => {
      const outputSelect = this.$(parentClass).find('.select-output')
      outputSelect.map((n, el) => {
        if(value.id === el.name && preferences[process] && preferences[process][value.id])
        el.value = preferences[process][value.id];
        if(process === selectedProcess){
        this.requestOptions.outputs[el.name]=el.value;
        }
      });

    })
  },

  onRender(){

    this.onProcessChange();
  },

  onAttach() {
    this.showChildView('map', this.mapView);
    this.mapModel.show(this.model.attributes);

  },

  onProcessChange() {
    const val = this.$('.select-process').val();
    const currentClassName = ".process-" + val;
    const preferences = this.getPreferences();

    this.mapModel.set('tool', null);
    this.mapModel.set('area', null);

    this.requestOptions ={
      outputs:{},
    }


    this.processingModel.processes.map(process => {

      var classTag = process.additionalInputs && process.additionalInputs.identifier ? process.additionalInputs.identifier : process.id;
      let className = ".process-" + classTag;
      this.$(className).hide();
      this.preferencesSetup(process, classTag, className, preferences, val)
      if (currentClassName === className) {
        if(process.hasBBOX) {
          this.updateBboxInputs()
        }
        if (process.additionalInputs ){
          Object.keys(process.additionalInputs).map(key => this.requestOptions[key] = process.additionalInputs[key])
        }
        if (process.CoverageIdUsage){
          this.requestOptions.coverage = this.model.get('id');
        }
        this.model.set('selectedProcess', process.id);

      }
    });

    this.model.set('requestOptions', this.requestOptions)
    if(this.model.get('selectedProcess')) {
      this.onDefaultBBoxChecked();
      this.$(currentClassName).show();

    }

  },

  onDrawBBoxClicked() {
    this.mapModel.set('tool', 'bbox');
  },

  onDrawLineClicked() {
    this.mapModel.set('tool', 'line');
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

  onDefaultBBoxChecked(){
    const tag = this.requestOptions.identifier ? this.requestOptions.identifier : this.model.get('selectedProcess')
    const parent = this.$('.process-' + tag);
    const checked = parent.find('.subset-by-bounds').is(':checked');

    if (checked) {
      parent.find('.btn-draw-bbox').prop('disabled', true);
      parent.find('.box-0').prop('disabled', true);
      parent.find('.box-1').prop('disabled', true);
      parent.find('.box-2').prop('disabled', true);
      parent.find('.box-3').prop('disabled', true);
      this.mapModel.set('tool', null);
      this.mapModel.set('area', null);
      this.bbox = transformExtent(this.model.get('bbox'), 'EPSG:4326', this.mapProjection);
      this.updateBboxInputs();
    }else {
      parent.find('.btn-draw-bbox').prop('disabled', false);
      parent.find('.box-0').prop('disabled', false);
      parent.find('.box-1').prop('disabled', false);
      parent.find('.box-2').prop('disabled', false);
      parent.find('.box-3').prop('disabled', false);
    }

  },

  oninputSelect(){
    const tag = this.requestOptions.identifier ? this.requestOptions.identifier : this.model.get('selectedProcess')
    const parent = this.$('.process-' + tag);
    const selection = parent.find('.select-inputs')
    selection.map((n, el) => {
      this.requestOptions[el.name]=el.value;
      this.updatePreferences(tag, el.name, el.value);

    });

    this.model.set('requestOptions', this.requestOptions)


  },
  onOutputSelect(){
    const tag = this.requestOptions.identifier ? this.requestOptions.identifier : this.model.get('selectedProcess')
    const parent = this.$('.process-' + tag);
    const selection = parent.find('.select-output')
    selection.map((n, el) => {
      this.requestOptions.outputs[el.name]=el.value;
      this.updatePreferences(tag, el.name, el.value);

    });
    this.model.set('requestOptions', this.requestOptions)
  },

  onInputInsert(){
    const tag = this.requestOptions.identifier ? this.requestOptions.identifier : this.model.get('selectedProcess')
    const parent = this.$('.process-' + tag);
    const inputs = parent.find('input[name^="input-parameter-"]')
    inputs.map((_,el) => {
      this.requestOptions[el.className] = el.value;
      this.updatePreferences(tag, el.className, el.value);
    });
    this.model.set('requestOptions', this.requestOptions)

  },


  updateBboxInputs(){
    this.bbox.map((border,index)=> {
      let className = '.box-' + index
      this.$(className) && this.$(className).val(border)
    })
    this.requestOptions.bbox = this.bbox;
    this.model.set('requestOptions', this.requestOptions);

  },

  updateLinesInputs(){

    Object.keys(this.line).map(key => {
      let className1 = '.'+ key +'-X';
      let className2 = '.'+ key +'-Y';
      this.$(className1) && this.$(className1).val(this.line[key][0]);
      this.$(className2) && this.$(className2).val(this.line[key][1]);

    })
    this.requestOptions.line = [this.line.point1[0], this.line.point1[1], this.line.point2[0], this.line.point2[1]];
    this.model.set('requestOptions', this.requestOptions);


  },

  getPreferences() {
    try {
      return JSON.parse(localStorage.getItem(
        'wps-options-view-preferences'
      ) || '{}');
    } catch (error) {
      return {};
    }
  },

  updatePreferences(parent, key, value) {
    const preferences = this.getPreferences();
    preferences[parent] = preferences[parent] ? preferences[parent] : {};
    preferences[parent][key] = value
    localStorage.setItem(
      'wps-options-view-preferences',
      JSON.stringify(preferences),
    );
  },

});

export default RecordDetailsView;
