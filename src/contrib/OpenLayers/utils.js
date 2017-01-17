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
    wrapX: true,
  });
}

/**
 * @author Jean Souza [jeancfsouza@gmail.com] - Paulo Remoli [paulo002@gmail.com]
 *
 * @function correctLongitude
 */
export function wrapLongitude(longitude) {
  let correctedLongitude = parseFloat(longitude);
  const originalLongitude = parseFloat(longitude);

  // The correction is executed only if the longitude is incorrect
  if(originalLongitude > 180 || originalLongitude <= -180) {
    // If the longitude is negative, it's converted to a positive float, otherwise just to a float
    longitude = originalLongitude < 0 ? longitude * -1 : parseFloat(longitude);

    // Division of the longitude by 180:
    //   If the result is an even negative integer, nothing is added, subtracted or rounded
    //   If the result is an odd negative integer, is added 1 to the result
    //   If the result is a positive integer, is subtracted 1 from the result
    //   If isn't integer but its integer part is even, it's rounded down
    //   Otherwise, it's rounded up
    let divisionResult = 0;
    if ((originalLongitude / 180) % 2 === -0) {
      divisionResult = longitude / 180;
    } else if ((originalLongitude / 180) % 2 === -1) {
      divisionResult = (longitude / 180) + 1;
    } else if ((longitude / 180) % 1 === 0) {
      divisionResult = (longitude / 180) - 1;
    } else if (parseInt(longitude / 180) % 2 === 0) {
      divisionResult = parseInt(longitude / 180);
    } else {
      divisionResult = Math.ceil(longitude / 180);
    }

    // If the division result is greater than zero, the correct longitude is calculated:
    //   If the original longitude is negative, the division result multiplied by 180 is added to it
    //   Otherwise, the division result multiplied by 180 is subtracted from it
    if (divisionResult > 0) {
      correctedLongitude = (originalLongitude < 0) ? originalLongitude +
          (divisionResult * 180) : originalLongitude - (divisionResult * 180);
    }
  }
  return correctedLongitude;
}
