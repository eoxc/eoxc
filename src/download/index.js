import $ from 'jquery';
import { saveAs } from 'file-saver';

import { download as downloadEOWCS, getDownloadUrl as getDownloadUrlEOWCS } from './eowcs';
import { download as downloadUrl, getDownloadUrl as getDownloadUrlUrl } from './url';
import { getIEVersion } from '../core/util';

export function downloadRecord(layerModel, filtersModel, recordModel, options, elementContainer) {
  let element = null;
  if (layerModel.get('download.protocol') === 'EO-WCS') {
    element = downloadEOWCS(layerModel, filtersModel, recordModel, options);
  } else {
    // // element = downloadUrl(recordModel);
    // const a = document.createElement('a');
    // // if (typeof a.download !== 'undefined') {
    // if (true) {
    //   const url = getDownloadUrlUrl(recordModel);
    //   a.style.display = 'none';
    //   a.setAttribute('target', '_blank');
    //   a.setAttribute('href', url);
    //
    //   a.setAttribute('rel', 'noopener');
    //
    //   document.body.appendChild(a);
    //   a.click();
    //
    //   setTimeout(() => document.body.removeChild(a), 10000);
    //
    //   return null;
    // }
    // element = downloadUrl(recordModel);

    // This works, but not for SSO
    const url = getDownloadUrlUrl(recordModel);
    const $iframe = $('<iframe style="visibility: collapse;"></iframe>');
    $('body').append($iframe);
    const content = $iframe[0].contentDocument;
    const form = `<form action="${url}" method="GET"></form>`;
    content.write(form);
    $('form', content).submit();
    setTimeout(() => {
      $iframe.remove();
    }, 2000);
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
