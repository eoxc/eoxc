import { describeEOCoverageSetURL } from 'libcoverage/src/eowcs/kvp';
import { parseFunctions } from 'libcoverage/src/eowcs/parse';
import { pushParseFunctions, parse } from 'libcoverage/src/parse';

pushParseFunctions(parseFunctions);

function convertFilters(filtersModel, mapModel, options) {
  const parameters = {
    sections: ['CoverageDescriptions'],
    count: options.itemsPerPage,
  };

  const time = filtersModel.get('time');
  if (time) {
    if (Array.isArray(time)) {
      parameters.subsetTime = time.map((t) => `${t.toISOString().substring(0, 19)}Z`);
    } else {
      parameters.subsetTime = `${time.toISOString().substring(0, 19)}Z`;
    }
  }

  const area = filtersModel.get('area');
  if (area) {
    if (Array.isArray(area)) {
      parameters.bbox = area;
    } else if (typeof array === 'object') {
      // TODO: points
    }
  } else if (mapModel) {
    // use the maps BBox by default
    parameters.bbox = mapModel.get('bbox');
  }
  return parameters;
}

function prepareRecords(records) {
  return records.map(coverage => {
    const bounds = coverage.bounds;
    const bbox = [bounds.lower[1], bounds.lower[0], bounds.upper[1], bounds.upper[0]];

    const geometry = {
      type: 'MultiPolygon',
      coordinates: [[[]]],
    };
    for (let i = 0; i < coverage.footprint.length; i += 2) {
      const lon = coverage.footprint[i + 1];
      const lat = coverage.footprint[i];
      geometry.coordinates[0][0].push([lon, lat]);
    }

    return {
      id: coverage.coverageId,
      bbox,
      properties: {
        startTime: new Date(coverage.timePeriod[0]),
        endTime: new Date(coverage.timePeriod[1]),
      },
      geometry,
    };
  });
}

export default function search(layerModel, filtersModel, mapModel, options = {}) {
  const parameters = convertFilters(filtersModel, mapModel, options);
  const url = describeEOCoverageSetURL(
    layerModel.get('search.url'), layerModel.get('search.id'), parameters
  );

  return fetch(url)
    .then(response => response.text())
    .then(response => {
      const eoCoverageSet = parse(response, { throwOnException: true });
      const coverageDescriptions = eoCoverageSet.coverageDescriptions || [];
      const records = prepareRecords(coverageDescriptions);
      return {
        itemsPerPage: eoCoverageSet.numberReturned,
        totalResults: eoCoverageSet.numberMatched,
        records,
      };
    });
}
