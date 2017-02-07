import $ from 'jquery';
import { saveAs } from 'file-saver';

import { download as downloadEOWCS, getDownloadUrl as getDownloadUrlEOWCS } from './eowcs';
import { download as downloadUrl, getDownloadUrl as getDownloadUrlUrl } from './url';

export function downloadRecord(layerModel, filtersModel, recordModel, options, elementContainer) {
  let element = null;
  if (layerModel.get('download.protocol') === 'EO-WCS') {
    element = downloadEOWCS(layerModel, filtersModel, recordModel, options);
  } else {
    // element = downloadUrl(recordModel);
    const a = document.createElement('a');
    if (typeof a.download !== 'undefined') {
      const url = getDownloadUrlUrl(recordModel);
      a.setAttribute('href', url);
      a.setAttribute('download', 'true');
      a.click();
      return null;
    }
    element = downloadUrl(recordModel);
  }

  // TODO: other download implementations
  if (element) {
    const $element = $(element);

    if (elementContainer) {
      $(elementContainer).append($element);
    }
    if ($element.is('form')) {
      $element.submit();
    }
  }
  return element;
}

export function downloadCustom(filename, mediaType, content) {
  saveAs(new Blob([content], { type: mediaType }), filename);
}

export function getDownloadUrl(layerModel, filtersModel, recordModel, options) {
  if (layerModel.get('download.protocol') === 'EO-WCS') {
    return getDownloadUrlEOWCS(layerModel, filtersModel, recordModel, options);
  }
  return getDownloadUrlUrl(recordModel);
}
