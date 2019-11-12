import $ from 'jquery';
import { saveAs } from 'file-saver';

import { download as downloadEOWCS, getDownloadInfos as getDownloadInfosEOWCS, downloadFullResolution } from './eowcs';
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

function downloadUrl(url) {
  const a = document.createElement('a');
  // This works in Chrome and Firefox
  if (typeof a.download !== 'undefined') {
    const ia = document.createElement('a');
    ia.style.display = 'none';
    ia.setAttribute('target', '_blank');
    ia.setAttribute('href', url);

    // Needed for multiple downloads in Chrome.
    // Adding 'noreferrer' breaks multiple downloads in Firefox
    ia.setAttribute('rel', 'noopener');

    document.body.appendChild(ia);
    ia.click();

    setTimeout(() => document.body.removeChild(ia), 10000);
  } else {
    // This works in IE11, but not for SSO
    const $iframe = $('<iframe style="visibility: collapse;"></iframe>');
    $('body').append($iframe);
    const content = $iframe[0].contentDocument;
    const form = `<form action="${url}" method="GET"></form>`;
    content.write(form);
    $('form', content).submit();
    setTimeout(() => {
      $iframe.remove();
    }, 20000);
  }
}

export function downloadRecord(layerModel, filtersModel, recordModel, options) {
  const rewriteRule = layerModel.get('download.rewrite');

  if (layerModel.get('download.protocol') === 'EO-WCS') {
    const urlOrElement = downloadEOWCS(layerModel, filtersModel, recordModel, options);
    if (urlOrElement) {
      if (layerModel.get('download.method') === 'GET') {
        downloadUrl(rewrite(urlOrElement, rewriteRule, recordModel));
      } else {
        const xmlRewritten = rewrite(urlOrElement, rewriteRule, recordModel);
        const urlRewritten = rewrite(layerModel.get('download.url'), rewriteRule, recordModel);
        const form = $(`<form method="post" action="${urlRewritten}" enctype="text/plain" target="_blank">
          <input type="hidden" name='<?xml version' value='"1.0"?>${xmlRewritten}'></input>
        </form>`);
        if (form) {
          const elem = form[0];
          document.body.appendChild(elem);
          elem.submit();
          setTimeout(() => elem.remove(), 10000);
        }
      }
    } else {
      getDownloadInfosUrl(recordModel).then(infos => infos.forEach((info) => {
        downloadUrl(rewrite(info.href, rewriteRule, recordModel));
      }));
    }
  }
}

export function downloadFullResolutionWCS(layerModel, mapModel, filtersModel, options) {
  const url = downloadFullResolution(layerModel, mapModel, filtersModel, options);
  downloadUrl(rewrite(url, layerModel.get('download.rewrite')));
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
    href: rewrite(item.href, layerModel.get('download.rewrite'), recordModel)
  })));
}
