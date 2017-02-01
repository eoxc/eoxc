import ol from 'openlayers';

const VectorSource = ol.source.Vector;
const Polygon = ol.geom.Polygon;
const Feature = ol.Feature;

/**
 * Vector source to map a Backbone collection of result records to openlayers
 * features.
 */
export default class CollectionSource extends VectorSource {
  constructor(options = {}) {
    super(options);
    this.setCollection(options.collection);
    this.format = options.format;
    this.searchModel = options.searchModel;
  }

  setCollection(collection, reset = true) {
    if (reset) {
      this.clear();
    }

    const prevCollection = this.collection;
    if (prevCollection) {
      prevCollection.off(null, null, this);
    }
    if (collection) {
      this.collection = collection;
      collection.on('reset', this.onCollectionReset, this);
      collection.on('add', this.onCollectionAdd, this);
      collection.on('remove', this.onCollectionRemove, this);
    }
  }

  // collection event handlers
  onCollectionReset() {
    this.clear();
    const features = this.collection
      .map(model => this._modelToFeature(model))
      .filter(feature => !!feature);
    this.addFeatures(features);
  }

  onCollectionAdd(model) {
    this.addFeature(this._modelToFeature(model));
  }

  onCollectionRemove(model) {
    const feature = this.getFeatureById(model.get('id'));
    if (feature) {
      this.removeFeature(feature);
    }
  }

  // private
  _modelToFeature(model) {
    const format = this.getFormat();
    if (model) {
      let geometry = null;
      if (model.geometry || model.get('geometry')) {
        geometry = format.readGeometry(model.geometry || model.get('geometry'));
      } else if (model.bbox || model.get('bbox')) {
        geometry = Polygon.fromExtent(model.bbox || model.get('bbox'));
      }

      if (geometry) {
        const feature = new Feature();
        feature.setGeometry(geometry);
        feature.model = model;
        feature.searchModel = this.searchModel;
        feature.setId(model.get('id'));
        return feature;
      }
    }
    return null;
  }
}
