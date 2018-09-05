import $ from 'jquery';
import { saveAs } from 'file-saver';

import { download as downloadEOWCS, getDownloadInfos as getDownloadInfosEOWCS } from './eowcs';
import { download as downloadUrl, getDownloadInfos as getDownloadInfosUrl } from './url';
import { getDownloadInfos as getDownloadInfosS3 } from './s3';

export function downloadRecord(layerModel, filtersModel, recordModel, options, elementContainer) {
  let element = null;
  if (layerModel.get('download.protocol') === 'EO-WCS') {
    element = downloadEOWCS(layerModel, filtersModel, recordModel, options);
  } else {
    const a = document.createElement('a');
    // This works in Chrome and Firefox
    if (typeof a.download !== 'undefined') {
      getDownloadInfosUrl(recordModel).then(infos => infos.forEach((info) => {
        const ia = document.createElement('a');
        ia.style.display = 'none';
        ia.setAttribute('target', '_blank');
        ia.setAttribute('href', info.href);

        // Needed for multiple downloads in Chrome.
        // Adding 'noreferrer' breaks multiple downloads in Firefox
        ia.setAttribute('rel', 'noopener');

        document.body.appendChild(ia);
        ia.click();

        setTimeout(() => document.body.removeChild(ia), 10000);
      }));
    } else {
      // This works in IE11, but not for SSO
      getDownloadInfosUrl(recordModel).then(infos => infos.forEach((info) => {
        const $iframe = $('<iframe style="visibility: collapse;"></iframe>');
        $('body').append($iframe);
        const content = $iframe[0].contentDocument;
        const form = `<form action="${info.href}" method="GET"></form>`;
        content.write(form);
        $('form', content).submit();
        setTimeout(() => {
          $iframe.remove();
        }, 20000);
      }));
    }
  }
}

export function downloadCustom(filename, mediaType, content) {
  saveAs(new Blob([content], { type: mediaType }), filename);
}

export function getDownloadInfos(layerModel, filtersModel, recordModel, options) {
  let downloadInfos;
  if (layerModel.get('download.protocol') === 'EO-WCS') {
    downloadInfos = getDownloadInfosEOWCS(layerModel, filtersModel, recordModel, options);
  } else if (layerModel.get('download.protocol') === 'S3') {
    downloadInfos = getDownloadInfosS3(layerModel, recordModel);
  } else {
    downloadInfos = getDownloadInfosUrl(recordModel);
  }

  const rewrite = layerModel.get('download.rewrite');
  if (rewrite) {
    const searchRE = new RegExp(rewrite.from);
    return downloadInfos.then(infos => infos.map(item => Object.assign({}, item, {
      href: item.href.replace(searchRE, rewrite.to)
    })));
  }
  return downloadInfos;
}
