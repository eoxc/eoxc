import LayerModel from '../../../src/core/models/LayerModel';
import LayersCollection from '../../../src/core/models/LayersCollection';
import MapModel from '../../../src/core/models/MapModel';

import OpenLayersMapView from '../../../src/contrib/OpenLayers/OpenLayersMapView';

import $ from "jquery";


$(() => {
  let view = new OpenLayersMapView({
    baseLayersCollection: new LayersCollection([{
      id: "terrain-light",
      displayName: "Terrain-Light",
      visible: true,
      view: {
        id: "terrain-light",
        protocol: "WMTS",
        urls: [
          "http://a.tiles.maps.eox.at/wmts/",
          "http://b.tiles.maps.eox.at/wmts/",
          "http://c.tiles.maps.eox.at/wmts/",
          "http://d.tiles.maps.eox.at/wmts/",
          "http://e.tiles.maps.eox.at/wmts/"
        ],
        matrixSet: "WGS84",
        format: "image/png",
        projection: "EPSG:4326",
        style: "default",
        attribution: "Terrain-Light { Data &copy; <a href=\"http://www.openstreetmap.org/copyright\" target=\"_blank\">OpenStreetMap</a> contributors and <a href='javascript:;' onClick='toggle(terrain_attribution)'>others</a>, Rendering &copy; <a href=\"http://eox.at\" target=\"_blank\">EOX</a> }"
      }
    }]),
    layersCollection: new LayersCollection([]),
    overlayLayersCollection: new LayersCollection([]),
    mapModel: new MapModel(),
    el: $("#map")[0]
  });
  view.render();
});
