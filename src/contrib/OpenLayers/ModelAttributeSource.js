import VectorSource from 'ol/source/Vector';

/**
 * Vector source to map a Backbone model to openlayers features.
 */
export default class ModelAttributeSource extends VectorSource {
  /**
   * @param {object} options The initial options
   * @param {Backbone.Model} options.model The model to observe
   * @param {string} options.attributeName The name of the attribute to observe
   * @param {function} options.transformAttribute The function to transform the
   *                                              attribute to a feature (or an
   *                                              array thereof)
   */
  constructor(options) {
    super(options);
    this.transformAttribute = options.transformAttribute;
    this.setModel(options.model, false);
    this.setAttributeName(options.attributeName);
  }

  /**
   * Sets the new model to observe
   * @param {Backbone.Model} model The new model to observe
   */
  setModel(model) {
    this.model = model;
    this._reset();
  }

  /**
   * Sets the new attribute to observe.
   * @param {string} attributeName The new attribute name
   */
  setAttributeName(attributeName) {
    this.attributeName = attributeName;
    this._reset();
  }

  _reset() {
    const prevModel = this.model;
    if (prevModel) {
      prevModel.off(null, null, this);
    }
    if (this.model && this.attributeName) {
      if (this.model) {
        this.model.on(`change:${this.attributeName}`, this.onAttributeChange, this);
        this.onAttributeChange(this.model, this.model.get(this.attributeName));
      }
    }
  }

  // collection event handlers
  onAttributeChange(model, value) {
    this.clear();
    const feature = this.transformAttribute(value);
    if (Array.isArray(feature)) {
      this.addFeatures(feature.filter(f => !!f));
    } else if (value) {
      this.addFeature(feature);
    }
  }
}
