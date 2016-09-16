import $ from 'jquery';

export default function (recordModel) {
  const links = recordModel.get('properties').links;
  const url = links.find(link => link.rel === 'enclosure').href;

  // TODO: improve rudimentary translation from KVP -> inputs
  const parts = url.split('?');
  let inputs = '';
  if (parts.length > 1) {
    inputs = parts[1]
      .split('&')
      .map(param => {
        const kv = param.split('=');
        return `<input name="${kv[0]}" value="${kv[1]}">`;
      })
      .join('');
  }

  return $(`
    <form method="get" action="${url}" target="iframe-download-post">${inputs}</form>
  `);
}
