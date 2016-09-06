import $ from 'jquery';

const template = require('./DownloadPostXML.hbs');


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
  if (options.subsetX) {
    params.push(`<wcs:DimensionTrim><wcs:Dimension crs="${subsetCRS}">x</wcs:Dimension>
                   <wcs:TrimLow>${subsetX[0]}</wcs:TrimLow>
                   <wcs:TrimHigh>${subsetX[1]}</wcs:TrimHigh>
                 </wcs:DimensionTrim>`);
  }
  if (options.subsetY) {
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


export default function download(layerModel, filtersModel, recordModel, options) {
  if (options.method === 'GET') {
    // TODO: implement
    return null;
  }
  const xml = getCoverageXML(
    recordModel.get('id'), {
      bbox: filtersModel.get('area'), // TODO
      outputCRS: options.outputCRS,
      format: options.format,
    }
  );

  return $(template({
    url: layerModel.get('download.url'),
    xml,
  }));
}
