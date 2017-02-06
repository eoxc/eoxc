import $ from 'jquery';

export function download(recordModel) {
  const links = recordModel.get('properties').links;
  const url = links.find(link => link.rel === 'enclosure').href;

  return $(`<iframe src="${url}"></iframe>`);
}

export function getDownloadUrl(recordModel) {
  const properties = recordModel.get('properties');
  if (properties && properties.links) {
    const url = properties.links.find(link => link.rel === 'enclosure');
    if (url) {
      return url.href;
    }
  }
  return null;
}
