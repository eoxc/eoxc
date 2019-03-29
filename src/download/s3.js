// import AWS from 'aws-sdk';
import urlParse from 'url-parse';

import rewrite from './rewrite';

function getChildren(element) {
  let i = 0;
  const nodes = element.childNodes;
  const children = [];
  let node;
  while(node = nodes[i++]) {
    if (node.nodeType === 1) {
      children.push(node);
    }
  }
  return children;
}

function parseItem(itemNode) {
  return getChildren(itemNode)
    .reduce((acc, child) => {
      acc[child.tagName] = child.textContent;
      return acc;
    }, {});
}


function listBucket(origin, bucket, prefix) {
  return fetch(`${origin}/${bucket}?list-type=2&prefix=${prefix}`, {
    credentials: 'include',
    redirect: 'follow',
  })
    .then(response => response.text())
    .then(content => (new window.DOMParser()).parseFromString(content, 'text/xml'))
    .then(xmlDoc =>
      Array.from(xmlDoc.documentElement.getElementsByTagName('Contents'))
        .map(item => parseItem(item))
    );
}

export function getDownloadInfos(layerModel, recordModel) {
  const link = recordModel.get('properties').links.find(l => l.rel === 'enclosure');
  if (link) {
    const parsed = urlParse(
      rewrite(link.href, layerModel.get('download.rewrite'))
    );
    if (link.href.slice(-4) !== '.zip') {
      const { origin, pathname } = parsed;
      const [bucket, ...pathParts] = pathname.slice(1).split('/');
      const path = pathParts.join('/');
      return listBucket(origin, bucket, path)
        .then(items => items.map(item => ({
          href: `${origin}/${bucket}/${item.Key}`,
          size: item.Size,
          name: item.Key.substring(path.length + 1) !== 'zip' ?
            item.Key.substring(path.length + 1) :
            item.Key.split('/')[item.Key.split('/').length - 1],
        })));
    }
    let name = recordModel.get('id');
    if (parsed.query.length === 0) {
      const parts = parsed.pathname.split('/');
      name = parts[parts.length - 1];
    }
    return Promise.resolve([{ href: link.href, name }]);
  }
  return Promise.resolve([]);
}
