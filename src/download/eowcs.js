import { filtersToCQL, getISODateTimeString } from '../core/util';
import FiltersModel from '../core/models/FiltersModel';

function getCoverageXML(coverageid, options = {}) {
  let subsetX = options.subsetX;
  let subsetY = options.subsetY;

  if (!coverageid) {
    throw new Error('Parameters "coverageid" is mandatory.');
  }
  const subsetCRS = options.subsetCRS || 'http://www.opengis.net/def/crs/EPSG/0/4326';
  const params = [
    `<wcs:GetCoverage service="WCS" version="2.0.1" xmlns:wcs="http://www.opengis.net/wcs/2.0" xmlns:wcscrs="http://www.opengis.net/wcs/crs/1.0" xmlns:wcsmask="http://www.opengis.net/wcs/mask/1.0" xmlns:int="http://www.opengis.net/wcs/interpolation/1.0" xmlns:scal="http://www.opengis.net/wcs/scaling/1.0">
     <wcs:CoverageId>${coverageid}</wcs:CoverageId>`,
  ];
  const extension = [];

  let axisNames;
  if (!options.axisNames) {
    axisNames = {
      x: 'x',
      y: 'y',
    };
  } else if (Array.isArray(options.axisNames)) {
    axisNames = {
      x: options.axisNames[0],
      y: options.axisNames[1],
    };
  } else {
    axisNames = options.axisNames;
  }

  if (options.format) {
    params.push(`<wcs:format>${options.format}</wcs:format>`);
  }
  if (options.bbox && !options.subsetX && !options.subsetY) {
    subsetX = [options.bbox[0], options.bbox[2]];
    subsetY = [options.bbox[1], options.bbox[3]];
  }
  if (subsetX) {
    params.push(`<wcs:DimensionTrim><wcs:Dimension>${axisNames.x}</wcs:Dimension>
                   <wcs:TrimLow>${subsetX[0]}</wcs:TrimLow>
                   <wcs:TrimHigh>${subsetX[1]}</wcs:TrimHigh>
                 </wcs:DimensionTrim>`);
  }
  if (subsetY) {
    params.push(`<wcs:DimensionTrim><wcs:Dimension>${axisNames.y}</wcs:Dimension>
                   <wcs:TrimLow>${subsetY[0]}</wcs:TrimLow>
                   <wcs:TrimHigh>${subsetY[1]}</wcs:TrimHigh>
                 </wcs:DimensionTrim>`);
  }

  if (options.outputCRS) {
    extension.push(`<wcscrs:outputCrs>${options.outputCRS}</wcscrs:outputCrs>`);
  }

  if (options.sizeX && options.sizeY) {
    extension.push(`
      <scal:ScaleToSize>
        <scal:TargetAxisSize>
          <scal:axis>${axisNames.x}</scal:axis>
          <scal:targetSize>${options.sizeX}</scal:targetSize>
        </scal:TargetAxisSize>
        <scal:TargetAxisSize>
          <scal:axis>${axisNames.y}</scal:axis>
          <scal:targetSize>${options.sizeY}</scal:targetSize>
        </scal:TargetAxisSize>
      </scal:ScaleToSize>
    `);
  }

  extension.push(`<wcscrs:subsettingCrs>${subsetCRS}</wcscrs:subsettingCrs>`);

  if (options.mask) {
    extension.push(`<wcsmask:polygonMask>${options.mask}</wcsmask:polygonMask>`);
  }

  if (options.scale) {
    extension.push(`<scal:ScaleByFactor><scal:scaleFactor>${options.scale}</scal:scaleFactor></scal:ScaleByFactor>`);
  }

  if (options.interpolation) {
    extension.push(`<int:Interpolation><int:globalInterpolation>${options.interpolation}</int:globalInterpolation></int:Interpolation>`);
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

function getEOCoverageSetXML(eoids, options = {}) {
  let subsetX = options.subsetX;
  let subsetY = options.subsetY;

  if (!eoids) {
    throw new Error('Parameters "coverageid" is mandatory.');
  }
  if (!options.package) {
    throw new Error('Parameters "packageFormat" is missing.');
  }
  const subsetCRS = options.subsetCRS || 'http://www.opengis.net/def/crs/EPSG/0/4326';
  const params = [
    `<wcseo:GetEOCoverageSet xmlns:wcseo="http://www.opengis.net/wcs/wcseo/1.1" xmlns:wcs="http://www.opengis.net/wcs/2.0" xmlns:int="http://www.opengis.net/wcs/interpolation/1.0" xmlns:scal="http://www.opengis.net/wcs/scaling/1.0" xmlns:crs="http://www.opengis.net/wcs/crs/1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/wcs/wcseo/1.1 http://schemas.opengis.net/wcs/wcseo/1.1/wcsEOAll.xsd" service="WCS" version="2.0.1">
     <wcseo:eoId>${eoids}</wcseo:eoId>`,
  ];
  const extension = [];

  let axisNames;
  if (!options.axisNames) {
    axisNames = {
      x: 'x',
      y: 'y',
    };
  } else if (Array.isArray(options.axisNames)) {
    axisNames = {
      x: options.axisNames[0],
      y: options.axisNames[1],
    };
  } else {
    axisNames = options.axisNames;
  }

  if (options.package) {
    params.push(`<wcs:format>${options.package}</wcs:format>`);
  }

  if (options.package) {
    params.push(`<wcseo:packageFormat>${options.package}</wcseo:packageFormat>`);
  }
  if (options.bbox && !options.subsetX && !options.subsetY) {
    subsetX = [options.bbox[0], options.bbox[2]];
    subsetY = [options.bbox[1], options.bbox[3]];
  }
  if (subsetX) {
    params.push(`<wcs:DimensionTrim><wcs:Dimension>${axisNames.x}</wcs:Dimension>
                   <wcs:TrimLow>${subsetX[0]}</wcs:TrimLow>
                   <wcs:TrimHigh>${subsetX[1]}</wcs:TrimHigh>
                 </wcs:DimensionTrim>`);
  }
  if (subsetY) {
    params.push(`<wcs:DimensionTrim><wcs:Dimension>${axisNames.y}</wcs:Dimension>
                   <wcs:TrimLow>${subsetY[0]}</wcs:TrimLow>
                   <wcs:TrimHigh>${subsetY[1]}</wcs:TrimHigh>
                 </wcs:DimensionTrim>`);
  }

  if (options.outputCRS) {
    extension.push(`<wcscrs:outputCrs>${options.outputCRS}</wcscrs:outputCrs>`);
  }

  if (options.sizeX && options.sizeY) {
    extension.push(`
      <scal:ScaleToSize>
        <scal:TargetAxisSize>
          <scal:axis>${axisNames.x}</scal:axis>
          <scal:targetSize>${options.sizeX}</scal:targetSize>
        </scal:TargetAxisSize>
        <scal:TargetAxisSize>
          <scal:axis>${axisNames.y}</scal:axis>
          <scal:targetSize>${options.sizeY}</scal:targetSize>
        </scal:TargetAxisSize>
      </scal:ScaleToSize>
    `);
  }

  extension.push(`<wcscrs:subsettingCrs>${subsetCRS}</wcscrs:subsettingCrs>`);


  if (options.scale) {
    extension.push(`<scal:ScaleByFactor><scal:scaleFactor>${options.scale}</scal:scaleFactor></scal:ScaleByFactor>`);
  }

  if (options.interpolation) {
    extension.push(`<int:Interpolation><int:globalInterpolation>${options.interpolation}</int:globalInterpolation></int:Interpolation>`);
  }

  if (options.multipart) {
    params.push('<wcs:mediaType>multipart/related</wcs:mediaType>');
  }

  params.push('</wcseo:GetEOCoverageSet>');
  return params.join('');
}

function getEOCoverageSetKVP(eoids, options = {}) {
  const params = [
    ['service', 'WCS'],
    ['version', '2.0.1'],
    ['request', 'GetEOCoverageSet'],
    ['eoid', eoids],
    ['count', eoids.length],
  ];

  const subsetCRS = options.subsetCRS || 'http://www.opengis.net/def/crs/EPSG/0/4326';

  if (options.format) {
    params.push(['format', options.format]);
  }

  if (options.package) {
    params.push(['packageFormat', options.package]);
  }


  let axisNames;
  if (!options.axisNames) {
    axisNames = {
      x: 'x',
      y: 'y',
    };
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

  if (options.rangeSubset) {
    params.push(['rangesubset', options.rangeSubset.join(',')]);
  }

  // scaling related stuff
  if (options.scale) {
    params.push(['scaleFactor', options.scale]);
  }
  if (options.sizeX && options.sizeY) {
    params.push(['scaleSize', `${axisNames.x}(${options.sizeX}),${axisNames.y}(${options.sizeY})`]);
  }

  if (options.interpolation) {
    params.push(['interpolation', options.interpolation]);
  }

  return params
    .map(param => param.join('='))
    .join('&');
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
    axisNames = {
      x: 'x',
      y: 'y',
    };
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

  if (options.rangeSubset) {
    params.push(['rangesubset', options.rangeSubset.join(',')]);
  }

  // scaling related stuff
  if (options.scale) {
    params.push(['scaleFactor', options.scale]);
  }
  if (options.sizeX && options.sizeY) {
    params.push(['scaleSize', `${axisNames.x}(${options.sizeX}),${axisNames.y}(${options.sizeY})`]);
  }

  if (options.interpolation) {
    params.push(['interpolation', options.interpolation]);
  }

  return params
    .map(param => param.join('='))
    .join('&');
}

function getIntersectingBbox(r1, r2) {
  // computes intersection bbox of two bboxes, returns false if no intersect
  // does not find intersection if any bbox crosses dateline and non-over 180 coordinates are used
  const noIntersect = r2[0] > r1[2] || r2[2] < r1[0] ||
  r2[1] > r1[3] || r2[3] < r1[1];
  return noIntersect ? false : [
    Math.max(r1[0], r2[0]),
    Math.max(r1[1], r2[1]),
    Math.min(r1[2], r2[2]),
    Math.min(r1[3], r2[3])
  ];
}

function computeSizeFromResolution(recordModel, filterBbox, resolutionX, resolutionY) {
  let sizeX = null;
  let sizeY = null;
  let computedBbox = null;
  const recordBbox = recordModel.get('bbox');
  if (!recordBbox && !filterBbox) {
    // can not compute resolution
    return [null, null];
  } else if (!filterBbox) {
    // use bounding box of record as is
    computedBbox = recordBbox;
  } else {
    // get intersection of two bboxes
    computedBbox = getIntersectingBbox(recordBbox, filterBbox);
    if (!computedBbox) {
      // no intersection
      return [null, null];
    }
  }
  sizeX = Math.round((computedBbox[2] - computedBbox[0]) / resolutionX);
  sizeY = Math.round((computedBbox[3] - computedBbox[1]) / resolutionY);
  sizeX = sizeX < 1 ? 1 : sizeX;
  sizeY = sizeY < 1 ? 1 : sizeY;
  return [sizeX, sizeY];
}

export function download(layerModel, filtersModel, recordModel, options) {
  const requestOptions = {
    bbox: filtersModel.get('area'),
    outputCRS: options.outputCRS,
    subsetCRS: options.subsetCRS,
    format: options.format,
    scale: options.scale,
    interpolation: options.interpolation,
    axisNames: layerModel.get('download.axisNames'),
  };
  if (options.resolutionX && options.resolutionY) {
    // compute size based on specified resolution
    const [sizeX, sizeY] = computeSizeFromResolution(recordModel, filtersModel.get('area'), options.resolutionX, options.resolutionY);
    requestOptions.sizeX = sizeX;
    requestOptions.sizeY = sizeY;
  } else {
    // use sizes directly
    requestOptions.sizeX = options.sizeX;
    requestOptions.sizeY = options.sizeY;
  }

  if (layerModel.get('download.method') === 'GET') {
    const kvp = getCoverageKVP(recordModel.get('id'), requestOptions);
    return `${layerModel.get('download.url')}?${kvp}`;
  }
  return getCoverageXML(recordModel.get('id'), requestOptions);
}
export function multiDownload(layerModel, filtersModel, options) {
  const requestOptions = {
    bbox: filtersModel.get('area'),
    outputCRS: options.outputCRS,
    subsetCRS: options.subsetCRS,
    format: options.format,
    package: options.package,
    scale: options.scale,
    interpolation: options.interpolation,
  };
  // use sizes directly
  requestOptions.sizeX = options.sizeX;
  requestOptions.sizeY = options.sizeY;

  //return getEOCoverageSetXML(layerModel, requestOptions);
  return getEOCoverageSetKVP(layerModel, requestOptions);
}
export function getDownloadInfos(layerModel, filtersModel, recordModel, options = {}) {
  const kvp = getCoverageKVP(
    recordModel.get('id'), {
      bbox: filtersModel.get('area'),
      outputCRS: options.outputCRS,
      format: options.format,
    }
  );
  const url = `${layerModel.get('download.url')}?${kvp}`;
  return Promise.resolve([{
    href: url,
    name: recordModel.get('id'),
  }]);
}

export function downloadFullResolution(layerModel, mapModel, filtersModel, options) {
  const requestOptions = {
    bbox: options.bbox || mapModel.get('bbox'),
    outputCRS: options.outputCRS,
    subsetCRS: options.subsetCRS,
    rangeSubset: options.fields,
    format: options.format,
    scale: options.scale,
    sizeX: options.sizeX,
    sizeY: options.sizeY,
    interpolation: options.interpolation,
    axisNames: layerModel.get('fullResolution.axisNames'),
  };
  const id = layerModel.get('fullResolution.id');
  let kvp = getCoverageKVP(id, requestOptions);


  const time = mapModel.get('time');
  if (time && !layerModel.get('fullResolution.disableTimeSubsetting')) {
    kvp = `${kvp}&subset=http://www.opengis.net/def/axis/OGC/0/time("${getISODateTimeString(time[0])}","${getISODateTimeString(time[1])}")`;
  }

  const cqlMapping = layerModel.get('fullResolution.cqlMapping');
  const cqlParameterName = layerModel.get('fullResolution.cqlParameterName');

  if (cqlParameterName) {
    const filtersModelCopy = new FiltersModel(filtersModel.attributes);
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
  return `${fullResolutionUrl}${char}${kvp}`;
}
