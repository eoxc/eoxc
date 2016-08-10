import { describeEOCoverageSetURL } from 'libcoverage/src/eowcs/kvp';
import { parseFunctions } from 'libcoverage/src/eowcs/parse';
import { pushParseFunctions, parse } from 'libcoverage/src/parse';

pushParseFunctions(parseFunctions);

function convertFilters(filtersModel) {
  const parameters = {};
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
    parameters.bbox = area;
  }
  return parameters;
}

export default function search(layerModel, filtersModel) {
  const parameters = convertFilters(filtersModel);
  const url = describeEOCoverageSetURL(
    layerModel.get('search.url'), layerModel.get('search.id'), parameters
  );

  return fetch(url)
    .then(response => response.text())
    .then(response => {
      const eoCoverageSet = parse(response, { throwOnException: true });
      const coverageDescriptions = eoCoverageSet.coverageDescriptions || [];
      return coverageDescriptions.map(coverage => {
        const bounds = coverage.bounds;
        const bbox = [bounds.lower[1], bounds.lower[0], bounds.upper[1], bounds.upper[0]];

        // TODO: parse additional stuff like footprint etc.

        return {
          id: coverage.coverageId,
          bbox,
          properties: {
            startTime: new Date(coverage.timePeriod[0]),
            endTime: new Date(coverage.timePeriod[1]),
          }
        };
      });
    });
}
