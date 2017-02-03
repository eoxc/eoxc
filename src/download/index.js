import $ from 'jquery';
import saveAs from 'save-as';

import downloadEOWCS from './eowcs';
import downloadURL from './url';

export function downloadRecord(layerModel, filtersModel, recordModel, options, elementContainer) {
  let element = null;
  if (layerModel.get('download.protocol') === 'EO-WCS') {
    element = downloadEOWCS(layerModel, filtersModel, recordModel, options);
  } else {
    element = downloadURL(recordModel);
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
