import ol from 'openlayers';
const Map = ol.Map;
const Attribution = ol.control.Attribution;
const Zoom = ol.control.Zoom;
const VectorLayer = ol.layer.Vector;
const VectorSource = ol.source.Vector;
const Style = ol.style.Style;
const Fill = ol.style.Fill;
const Stroke = ol.style.Stroke;
const Circle = ol.style.Circle;


export function createMap(center, zoom, renderer) {
  return new Map({
    controls: [
      new Attribution,
      new Zoom,
      // new ol.control.MousePosition({
      //   coordinateFormat: ol.coordinate.createStringXY(4),
      //   projection: 'EPSG:4326',
      //   undefinedHTML: '&nbsp;',
      // }),
    ],
    renderer: renderer || 'canvas',
    view: new ol.View({
      projection: ol.proj.get('EPSG:4326'),
      center,
      zoom,
      enableRotation: false,
    }),
    logo: false,
  });
}

export function createVectorLayer(fillColor, strokeColor, strokeWidth = 1, circleRadius = 0) {
  const definition = {
    fill: new Fill({
      color: fillColor,
    }),
    stroke: new Stroke({
      color: strokeColor,
      width: strokeWidth,
    }),
  };

  if (circleRadius) {
    definition.image = new Circle({
      radius: circleRadius,
      fill: new Fill({
        color: '#ffcc33',
      }),
    });
  }

  const style = new Style(definition);
  return new VectorLayer({
    source: new VectorSource,
    style,
  });
}
