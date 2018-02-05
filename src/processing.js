import { getISODateTimeString } from './core/util';
import { toNormalizedFeature } from './contrib/OpenLayers/utils';

/*

{
  "collectionName": "S2_MSI_L1C",
  "productIdentifiers": ["S2A_MSIL1C_20171110T070351_N0206_R020_T39PXS_20171110T102623.SAFE.zip",
  "S2A_MSIL1C_20171110T101241_N0206_R022_T33VXF_20171110T122043.SAFE.zip",
  "S2A_MSIL1C_20171110T101241_N0206_R022_T33VXG_20171110T122043.SAFE.zip",
  "S2A_MSIL1C_20171110T101241_N0206_R022_T34VCM_20171110T122043.SAFE.zip",
  "S2A_MSIL1C_20171110T101241_N0206_R022_T34VCL_20171110T122043.SAFE.zip"],
  "timeSelection": {
    "startTime": "2017-11-09T15:42:23.00Z",
    "endTime": "2017-11-10T15:42:23.00Z"
  },
  "spatialSelection": "POLYGON((9.71466064453125 53.699958629657445,10.228271484375 53.699958629657445,10.228271484375 53.425900839266,9.71466064453125 53.425900839266,9.71466064453125 53.699958629657445))"
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
  fetch(
    new Request(layerModel.get('processingUrl'), {
      method: 'POST',
      body: JSON.stringify(body),
    })
  );
}
