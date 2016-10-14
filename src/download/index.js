import $ from 'jquery';

import downloadEOWCS from './eowcs';
import downloadURL from './url';

export default function (layerModel, filtersModel, recordModel, options, elementContainer) {
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
