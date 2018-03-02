import { getISODateTimeString } from './core/util';
import { toNormalizedFeature } from './contrib/OpenLayers/utils';

/*
{
  "collectionName": "S2_MSI_L1C_RE",
  "productIdentifiers": [],
  "dateRange": {
    "startTime": "2018-02-18T00:00:00Z",
    "endTime": "2018-02-28T00:00:00Z"
  },
  "regionGeometry": {
    "type": "Feature",
    "geometry": {
      "type": "Polygon",
      "coordinates": [[[11.343827077179556,47.961401004496764],[11.807999440460806,47.961401004496764],[11.807999440460806,48.30609704941864],[11.343827077179556,48.30609704941864],[11.343827077179556,47.961401004496764]]]
    }
  }
}
*/

export function sendProcessingRequest(searchModel, mapModel) {
  const layerModel = searchModel.get('layerModel');
  const downloadSelection = searchModel.get('downloadSelection');
  const [start, end] = mapModel.get('time');
  const body = {
    collectionName: layerModel.get('id'),
    productIdentifiers: downloadSelection.map(record => record.get('id')),
    dateRange: {
      startTime: getISODateTimeString(start),
      endTime: getISODateTimeString(end),
    },
  };

  const area = mapModel.get('area');
  if (area) {
    body.regionGeometry = Array.isArray(area) ? toNormalizedFeature(area)[0] : area;
  }

  if (layerModel.get('processing.method') == 'fetch') {
    fetch(
      new Request(layerModel.get('processing.url'), {
        method: 'POST',
        body: JSON.stringify(body),
        credentials: 'same-origin'
      })
    );
  } else {
    const form = document.createElement('form');
    const url = layerModel.get('processing.url');

    form.setAttribute('method', 'post');
    form.setAttribute("target", "_blank");
    form.setAttribute('action', url);

    const input = document.createElement('input');
    input.setAttribute('name', 'request');
    input.setAttribute('value', JSON.stringify(body));
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
  }
}
