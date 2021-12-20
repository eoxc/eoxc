import Backbone from 'backbone';

export default Backbone.Model.extend({
  defaults: {
    availableDownloadFormats: [{
      name: 'TIFF',
      mimeType: 'image/tiff',
    }, {
      name: 'PNG',
      mimeType: 'image/png',
    }],
    availableMultiDownloadFormats: [{
      name: 'ZIP',
      mimeType: 'application/zip',
    }, {
      name: 'TAR',
      mimeType: 'application/tar',
    }],
    selectedDownloadFormat: null,

    availableProjections: [{
      name: 'WGS-84',
      identifier: 'EPSG:4326',
    }, {
      name: 'Web Mercator',
      identifier: 'EPSG:3857',
    }],
    selectedProjection: null,

    availableInterpolations: [{
      name: 'Bilinear',
      identifier: 'http://www.opengis.net/def/interpolation/OGC/1/bilinear',
    }],
    selectedInterpolation: null,

    subsetByBounds: false,

    useMultipleDownload: false,

    downloadLimitCount: null,
  }
});
