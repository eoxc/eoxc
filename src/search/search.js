import SearchModel from './models/SearchModel';

export default function search(layerModel, filtersModel) {
  const searchModel = new SearchModel({ layerModel, filtersModel });
  searchModel.search();
  return searchModel;
}
