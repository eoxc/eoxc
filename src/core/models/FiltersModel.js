import Backbone from 'backbone';

/**
 * @memberof core/models
 */

class FiltersModel extends Backbone.Model {
  /**
   * Validation function for Filter models.
   */

  validate(attrs) {
    const area = attrs.area;
    const time = attrs.time;

    if (area) {
      if (area.length !== 4) {
        return 'invalid area specification';
      }
      else if (area[0] > area[2]) {
        return 'minX larger than maxX';
      }
      else if (area[1] > area[3]) {
        return 'minX larger than maxX';
      }
    }

    if (time) {
      if (Array.isArray(time)) {
        if (time.length !== 2) {
          return 'invalid time span specification';
        }
        else if (time[0] > time[1]) {
          return 'min time larger than max time';
        }
      }
    }
    return null;
  }
}

/**
 *
 */
FiltersModel.prototype.defaults = {
  area: null, // shall either be an array of 4 values [left, bottom, top, right] or null
  time: null, // shall either be a Date, an array of two Dates or null
};


export default FiltersModel;
