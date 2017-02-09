import ol from 'openlayers';

const VectorSource = ol.source.Vector;

/**
 * Vector source to map a Backbone collection of result records to openlayers
 * features.
 */
export default class CollectionSource extends VectorSource {
  /**
   * Creates a new CollectionSource
   * @param {object} options The options
   * @param {function} options.transformModel The transformation function to
   *                                          create a feature from a model
   * @param {Backbone.Collection} options.collection The collection to map
   */
  constructor(options) {
    super(options);
    this.transformModel = options.transformModel;
    this.setCollection(options.collection, false);
  }

  /**
   * Sets the collection to watch for this source.
   * @param {Backbone.Collection} collection The collection to observe
   * @param {boolean} [clear=true] Whether to clear the current features of this
   *                               source when the new collection is set
   */
  setCollection(collection, clear = true) {
    const prevCollection = this.collection;
    if (prevCollection) {
      prevCollection.off(null, null, this);
    }
    if (collection) {
      collection.on('reset', this.onCollectionReset, this);
      collection.on('add', this.onCollectionAdd, this);
      collection.on('remove', this.onCollectionRemove, this);
    }
    this.collection = collection;
    this.onCollectionReset(this.collection, {}, clear);
  }

  // collection event handlers
  onCollectionReset(collection, options, clear = true) {
    if (clear) {
      this.clear();
    }
    const features = collection
      .map(model => this.transformModel(model))
      .filter(feature => !!feature);
    this.addFeatures(features);
  }

  onCollectionAdd(model) {
    const feature = this.transformModel(model);
    if (feature) {
      this.addFeature(feature);
    }
  }

  onCollectionRemove(model) {
    const feature = this.getFeatureById(model.get('id'));
    if (feature) {
      this.removeFeature(feature);
    }
  }
}
