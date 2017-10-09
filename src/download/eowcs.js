import $ from 'jquery';

import { filtersToCQL } from '../core/util';
import FiltersModel from '../core/models/FiltersModel';

function getCoverageXML(coverageid, options = {}) {
  let subsetX = options.subsetX;
  let subsetY = options.subsetY;

  if (!coverageid) {
    throw new Error('Parameters "coverageid" is mandatory.');
  }
  const subsetCRS = options.subsetCRS || 'http://www.opengis.net/def/crs/EPSG/0/4326';
  const params = [
    `<wcs:GetCoverage service="WCS" version="2.0.0" xmlns:wcs="http://www.opengis.net/wcs/2.0" xmlns:wcscrs="http://www.opengis.net/wcs/crs/1.0" xmlns:wcsmask="http://www.opengis.net/wcs/mask/1.0">
     <wcs:CoverageId>${coverageid}</wcs:CoverageId>`,
  ];
  const extension = [];

  if (options.format) {
    params.push(`<wcs:format>${options.format}</wcs:format>`);
  }
  if (options.bbox && !options.subsetX && !options.subsetY) {
    subsetX = [options.bbox[0], options.bbox[2]];
    subsetY = [options.bbox[1], options.bbox[3]];
  }
  if (subsetX) {
    params.push(`<wcs:DimensionTrim><wcs:Dimension crs="${subsetCRS}">x</wcs:Dimension>
                   <wcs:TrimLow>${subsetX[0]}</wcs:TrimLow>
                   <wcs:TrimHigh>${subsetX[1]}</wcs:TrimHigh>
                 </wcs:DimensionTrim>`);
  }
  if (subsetY) {
    params.push(`<wcs:DimensionTrim><wcs:Dimension crs="${subsetCRS}">y</wcs:Dimension>
                   <wcs:TrimLow>${subsetY[0]}</wcs:TrimLow>
                   <wcs:TrimHigh>${subsetY[1]}</wcs:TrimHigh>
                 </wcs:DimensionTrim>`);
  }

  if (options.outputCRS) {
    params.push(`<wcscrs:outputCrs>${options.outputCRS}</wcscrs:outputCrs>`);
    params.push(`<wcs:OutputCrs>${options.outputCRS}</wcs:OutputCrs>`);
  }

  // raises an exception in MapServer
  // extension.push("<wcscrs:subsettingCrs>" + subsetCRS + "</wcscrs:subsettingCrs>");

  if (options.mask) {
    extension.push(`<wcsmask:polygonMask>${options.mask}</wcsmask:polygonMask>`);
  }
  if (options.multipart) {
    params.push('<wcs:mediaType>multipart/related</wcs:mediaType>');
  }

  if (extension.length > 0) {
    params.push('<wcs:Extension>');
    for (let i = 0; i < extension.length; ++i) {
      params.push(extension[i]);
    }
    params.push('</wcs:Extension>');
  }
  params.push('</wcs:GetCoverage>');
  return params.join('');
}

function getCoverageKVP(coverageid, options = {}) {
  const params = [
    ['service', 'WCS'],
    ['version', '2.0.1'],
    ['request', 'GetCoverage'],
    ['coverageid', coverageid],
  ];

  const subsetCRS = options.subsetCRS || 'http://www.opengis.net/def/crs/EPSG/0/4326';

  if (options.format) {
    params.push(['format', options.format]);
  }

  let axisNames;
  if (!options.axisNames) {
    axisNames = {};
  } else if (Array.isArray(options.axisNames)) {
    axisNames = {
      x: options.axisNames[0],
      y: options.axisNames[1],
    };
  } else {
    axisNames = options.axisNames;
  }

  let subsetX = options.subsetX;
  let subsetY = options.subsetY;
  if (options.bbox && !options.subsetX && !options.subsetY) {
    subsetX = [options.bbox[0], options.bbox[2]];
    subsetY = [options.bbox[1], options.bbox[3]];
  }
  if (subsetX) {
    params.push(['subset', `${axisNames.x || 'x'}(${subsetX[0]},${subsetX[1]})`]);
  }
  if (subsetY) {
    params.push(['subset', `${axisNames.y || 'y'}(${subsetY[0]},${subsetY[1]})`]);
  }

  if (options.outputCRS) {
    params.push(['outputCRS', options.outputCRS]);
  }
  if (subsetCRS && (subsetX || subsetY)) {
    params.push(['subsettingCRS', subsetCRS]);
  }
  if (options.multipart) {
    params.push(['mediatype', 'multipart/related']);
  }

  return params
    .map(param => param.join('='))
    .join('&');
}


export function download(layerModel, filtersModel, recordModel, options) {
  const requestOptions = {
    bbox: filtersModel.get('area'),
    outputCRS: options.outputCRS,
    subsetCRS: options.subsetCRS,
    format: options.format,
  };

  if (layerModel.get('download.method') === 'GET') {
    const kvp = getCoverageKVP(recordModel.get('id'), requestOptions);
    const url = `${layerModel.get('download.url')}?${kvp}`;

    const a = document.createElement('a');
    if (typeof a.download !== 'undefined') {
      a.setAttribute('href', url);
      a.setAttribute('download', 'true');
      a.click();
      return null;
    }
    return $(`<iframe src="${url}"></iframe>`);
  }
  const xml = getCoverageXML(recordModel.get('id'), requestOptions);

  return $(`
    <form method="post" action="${layerModel.get('download.url')}" target="iframe-download-post" enctype="text/plain">
      <input type="hidden" name='<?xml version' value='"1.0"?>${xml}'></input>
    </form>
  `);
}

export function getDownloadUrl(layerModel, filtersModel, recordModel, options = {}) {
  const kvp = getCoverageKVP(
    recordModel.get('id'), {
      bbox: filtersModel.get('area'),
      outputCRS: options.outputCRS,
      format: options.format,
    }
  );
  return `${layerModel.get('download.url')}?${kvp}`;
}

export function downloadFullResolution(layerModel, mapModel, filtersModel, options) {
  const requestOptions = {
    bbox: mapModel.get('bbox'),
    outputCRS: options.outputCRS,
    subsetCRS: options.subsetCRS,
    format: options.format,
    axisNames: layerModel.get('fullResolution.axisNames'),
  };
  const id = layerModel.get('fullResolution.id');
  let kvp = getCoverageKVP(id, requestOptions);

  const cqlMapping = layerModel.get('fullResolution.cqlMapping');
  const cqlParameterName = layerModel.get('fullResolution.cqlParameterName');

  if (cqlParameterName) {
    const filtersModelCopy = new FiltersModel(filtersModel.attributes);
    const time = mapModel.get('time');
    if (time) {
      filtersModelCopy.set('time', {
        min: time[0],
        max: time[1],
      });
    }
    const cql = filtersToCQL(filtersModelCopy, cqlMapping);
    if (cql.length) {
      kvp = `${kvp}&${cqlParameterName}=${cql}`;
    }
  }
  const fullResolutionUrl = layerModel.get('fullResolution.url');

  let char = '?';
  if (fullResolutionUrl.includes('?')) {
    char = (fullResolutionUrl.endsWith('?') || fullResolutionUrl.endsWith('&')) ? '' : '&';
  }

  const url = `${fullResolutionUrl}${char}${kvp}`;

  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('target', '_blank');
  a.click();
}
