import $ from 'jquery';
import urlParse from 'url-parse';

export function download(recordModel) {
  const links = recordModel.get('properties').links;
  const url = links.find(link => link.rel === 'enclosure').href;

  return $(`<iframe src="${url}"></iframe>`);
}

export function getDownloadInfos(recordModel) {
  const properties = recordModel.get('properties');
  if (properties && properties.links) {
    const url = properties.links.find(link => link.rel === 'enclosure');
    if (url) {
      let name = recordModel.get('id');
      const parsed = urlParse(url.href);
      if (parsed.query.length === 0) {
        const parts = parsed.pathname.split('/');
        name = parts[parts.length - 1];
      }

      return Promise.resolve([{ href: url.href, name }]);
    }
  }
  return Promise.resolve([]);
}

/**
 * Flattens downloadSelection list, each entry is split into individual coverages from properties.coverages
 * if input list is a list of lists, assuming that downloadSelection will be a first item and the rest of items will be appended to the created coverage
 * @param {Array} downloadSelections Array of OpenSearchRecordModels or of arrays, where OpenSearchRecordModel is item on index 0
 * @returns {Array} Flattened array per coverage
 */
export function flattenDownloadSelectionByCoverage(downloadSelections) {
  let records = [];
  downloadSelections.forEach((record) => {
    let downloadSel = record;
    if (Array.isArray(record)) {
      downloadSel = record.shift();
    }
    const coverages = downloadSel.attributes.properties.coverages;

    if (coverages) {
      for (let j = 0; j < coverages.length; j++) {
        // for each coverage create a copy of original OpenSearchRecordModel, replace its ID with coverageID and push it back to the records array
        const recordClone = $.extend(true, {}, downloadSel);
        recordClone.attributes.id = coverages[j];
        if (Array.isArray(record)) {
          records.push([recordClone, ...record]);
        } else {
          records.push(recordClone);
        }
      }
    } else {
      // keep original entry
      records.push(downloadSel);
    }
  });
  return records;
}

export function flatten(arr) {
  return arr.reduce((acc, val) => acc.concat(val), []);
}
