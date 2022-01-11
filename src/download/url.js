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

export function flatten(arr) {
  return arr.reduce((acc, val) => acc.concat(val), []);
}
