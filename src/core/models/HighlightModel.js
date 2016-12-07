import Backbone from 'backbone';

/**
 * @memberof core/models
 */

class HighlightModel extends Backbone.Model {
  highlight(feature) {
    this.set('highlightFeature', feature);
  }

  unHighlight(feature) {
    const currentFeature = this.get('highlightFeature');
    if (currentFeature && currentFeature.id === feature.id) {
      this.set('highlightFeature', null);
    }
  }
}

HighlightModel.prototype.defaults = {
  highlightFeature: null,
};


export default HighlightModel;
