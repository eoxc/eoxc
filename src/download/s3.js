// import AWS from 'aws-sdk';
import urlParse from 'url-parse';

// const s3instances = {};
//
// function getS3Instance(host) {
//   if (!s3instances[host]) {
//     s3instances[host] = new AWS.S3({ apiVersion: '2006-03-01', endpoint: host });
//   }
//   return s3instances[host];
// }

function parseItem(itemNode) {
  return Array.from(itemNode.children)
    .reduce((acc, child) => {
      acc[child.tagName] = child.textContent;
      return acc;
    }, {});
}

function listBucket(origin, bucket, prefix) {
  return fetch(`${origin}/${bucket}?list-type=2&prefix=${prefix}`)
    .then(response => response.text())
    .then(content => (new window.DOMParser()).parseFromString(content, 'text/xml'))
    .then(xmlDoc =>
      Array.from(xmlDoc.documentElement.getElementsByTagName('Contents'))
        .map(parseItem)
    );
}

export function getDownloadInfos(layerModel, recordModel) {
  const link = recordModel.get('properties').links.find(l => l.rel === 'enclosure');
  if (link) {
    if (link.href.slice(-1) === '/') {
      const { origin, pathname } = urlParse(link.href);
      const [bucket, ...pathParts] = pathname.slice(1).split('/');
      const path = pathParts.join('/');

      return listBucket(origin, bucket, path)
        .then(items => items.map(item => ({
          href: `${origin}/${bucket}/${item.Key}`,
          size: item.Size,
          name: item.Key,
        })));

      // return new Promise((resolve, reject) => {
      //
      //   // const s3 = getS3Instance(host);
      //
      //
      //
      //
      //   // s3.makeUnauthenticatedRequest('listObjects', options, (err, data) => {
      //   //   if (err) {
      //   //     reject(err);
      //   //   }
      //   //   resolve(
      //   //     data.Contents.map(item => ({
      //   //
      //   //     })
      //   //   ));
      //   // });
      // });
    }

    let name = recordModel.get('id');
    const parsed = urlParse(link.href);
    if (parsed.query.length === 0) {
      const parts = parsed.pathname.split('/');
      name = parts[parts.length - 1];
    }
    return [{ href: link.href, name }];
  }
  return [];
}
