import $ from 'jquery';
import { saveAs } from 'file-saver';

import { download as downloadEOWCS, getDownloadInfos as getDownloadInfosEOWCS } from './eowcs';
import { getDownloadInfos as getDownloadInfosUrl } from './url';
import { getDownloadInfos as getDownloadInfosS3 } from './s3';
import rewrite from './rewrite';

export function isRecordDownloadable(layerModel, recordModel) {
  if (layerModel.get('download.protocol') === 'EO-WCS') {
    return true;
  }
  const properties = recordModel.get('properties');
  if (properties && properties.links) {
    const url = properties.links.find(link => link.rel === 'enclosure');
    if (url) {
      return true;
    }
  }
  return false;
}

export function downloadRecord(layerModel, filtersModel, recordModel, options) {
  let element = null;
  const rewriteRule = layerModel.get('download.rewrite');

  if (layerModel.get('download.protocol') === 'EO-WCS') {
    element = downloadEOWCS(layerModel, filtersModel, recordModel, options);
    if (element) {
      const form = element[0];
      document.body.appendChild(form);
      form.submit();
    }
  } else {
    const a = document.createElement('a');
    // This works in Chrome and Firefox
    if (typeof a.download !== 'undefined') {
      getDownloadInfosUrl(recordModel).then(infos => infos.forEach((info) => {
        const ia = document.createElement('a');
        ia.style.display = 'none';
        ia.setAttribute('target', '_blank');
        ia.setAttribute('href', rewrite(info.href, rewriteRule));

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
        const form = `<form action="${rewrite(info.href, rewriteRule)}" method="GET"></form>`;
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

  return downloadInfos.then(infos => infos.map(item => Object.assign({}, item, {
    href: rewrite(item.href, layerModel.get('download.rewrite'))
  })));
}
