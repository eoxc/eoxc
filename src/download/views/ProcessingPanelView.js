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
      thumbnailUrl: this.model.getThumbnailUrl(),
      browseUrl: this.model.getBrowseUrl(),
      bbox: this.bbox.map(v => v.toFixed(4)),
      title: this.model.getTitle(),
      headerText: this.headerText,
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
    [`change [name^='input-parameter-']`]: 'onInputInsert',

  },
  initialize(options) {
    this.requestOptions ={}
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
  onRender(){
    this.onProcessChange();
    this.updateBboxInputs()
  },

  onAttach() {
    this.showChildView('map', this.mapView);
    this.mapModel.show(this.model.attributes);

  },

  onProcessChange() {
    this.mapModel.set('tool', null);
    this.mapModel.set('area', null);
    this.model.set('requestOptions', null)
    const val = this.$('.select-process').val();
    const currentClassName = ".process-" + val
    this.model.set('selectedProcess', (val !== '' && val !== '---') ? val : null);
    this.processingModel.processes.map(process => {
      var className = ".process-" + process.id
      this.$(className).hide();
    });


    if(this.model.get('selectedProcess')) {
      this.$('.record-details-map').show();
      this.$(currentClassName).show();
    }else{
      this.$('.record-details-map').hide();
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
  oninputSelect(){
    var parent = this.$('.process-' + this.model.get('selectedProcess'));
    var selection = parent.find('.select-inputs')
    selection.map((n, el) => this.requestOptions[el.name]=el.value);
    this.model.set('requestOptions', this.requestOptions)


  },
  onOutputSelect(){
    var parent = this.$('.process-' + this.model.get('selectedProcess'));
    var selection = parent.find('.select-output')
    selection.map((n, el) => this.requestOptions[el.name]=el.value);
    this.model.set('requestOptions', this.requestOptions)
  },
  onInputInsert(){
    var parent = this.$('.process-' + this.model.get('selectedProcess'));
    var inputs = parent.find('input[name^="input-parameter-"]')
    inputs.map((_,el) => {
      this.requestOptions[el.className] = el.value
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
      this.$(className1) && this.$(className1).val(this.line[key][0])
      this.$(className2) && this.$(className2).val(this.line[key][1])
    })
    this.requestOptions.line = this.line;
    this.model.set('requestOptions', this.requestOptions);


  }

});

export default RecordDetailsView;
