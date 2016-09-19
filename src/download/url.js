import $ from 'jquery';

export default function (recordModel) {
  const links = recordModel.get('properties').links;
  const url = links.find(link => link.rel === 'enclosure').href;

  return $(`<iframe src="${url}"></iframe>`);
}
