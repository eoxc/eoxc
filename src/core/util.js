/**
  @namespace core/util
 */

/**
  left pad a string with a fill value
  @memberof core/util
  @param str The string to pad
  @param pad The character to pad with
  @param size The tital size the string shall have
  @returns The padded string
 */

export function padLeft(str, pad, size) {
  let out = str;
  while (out.length < size) {
    out = pad + str;
  }
  return out;
}

/**
  Transform a Date object into a string.
  @memberof core/util
  @param {Date} date The date object
  @returns {string} The resulting date string.
 */

export function getDateString(date) {
  const year = date.getUTCFullYear();
  const month = padLeft(String(date.getUTCMonth() + 1), '0', 2);
  const day = padLeft(String(date.getUTCDate()), '0', 2);
  return `${year}-${month}-${day}`;
}

/**
  Transform a Date object into an ISO 8601 conformant date string.
  @memberof core/util
  @param {Date} date The date object
  @returns {string} The resulting date string.
 */

export function getISODateString(date) {
  return `${getDateString(date)}T`;
}

/**
  Transform a Date object into an ISO 8601 conformant datetime string.
  @memberof core/util
  @param {Date} date The date object
  @returns {string} The resulting datetime string.
 */

export function getISODateTimeString(date, useMilliseconds = true) {
  const hours = padLeft(String(date.getUTCHours()), '0', 2);
  const minutes = padLeft(String(date.getUTCMinutes()), '0', 2);
  const seconds = padLeft(String(date.getUTCSeconds()), '0', 2);

  const ms = date.getUTCMilliseconds();
  if (ms !== 0 && useMilliseconds) {
    const milliseconds = padLeft(String(ms), '0', 3);
    return `${getISODateString(date)}${hours}:${minutes}:${seconds}.${milliseconds}Z`;
  }
  return `${getISODateString(date)}${hours}:${minutes}:${seconds}Z`;
}

/*
*/
export function uniqueBy(arr, cmp) {
  const out = [];
  for (let i = 0; i < arr.length; ++i) {
    const curr = arr[i];
    let found = false;
    for (let j = 0; j < out.length; ++j) {
      if (cmp(out[j], curr)) {
        found = true;
        break;
      }
    }
    if (!found) {
      out.push(curr);
    }
  }
  return out;
}

/**
 * Converts the filters of a filters model to the CQL expressions. When a mapping
 * is provided, the filter names are translated and only filters of entailed
 * name are used. When no mapping is passed, only filters with types of 'eo:...'
 * are used and the name (without namespace prefix) is used as the CQL attribute
 * name.
 */
export function filtersToCQL(filtersModel, mapping = null) {

  function serializeValue(value) {
    if (value instanceof Date) {
      return getISODateTimeString(value);
    }
    return value;
  }

  const attributes = filtersModel.attributes;
  return Object.keys(attributes)
    .map((key) => {
      if (mapping && mapping.hasOwnProperty(key)) {
        return [mapping[key], attributes[key]];
      } else if (mapping) {
        return null;
      }
      if (key.startsWith('eo:')) {
        return [key.split(':')[1], attributes[key]];
      }
      return null;
    })
    .filter(keyValue => !!keyValue)
    .map(([key, value]) => {
      if (value.min && value.max) {
        if (value.min instanceof Date && value.max instanceof Date) {
          return `${key} DURING ${serializeValue(value.min)}/${serializeValue(value.max)}`;
        }
        return `${key} BETWEEN ${serializeValue(value.min)} AND ${serializeValue(value.max)}`;
      } else if (value.min) {
        if (value.min instanceof Date) {
          return `${key} AFTER ${serializeValue(value.min)}`;
        }
        return `${key} >= ${serializeValue(value.min)}`;
      } else if (value.max) {
        if (value.max instanceof Date) {
          return `${key} BEFORE ${serializeValue(value.min)}`;
        }
        return `${key} <= ${serializeValue(value.max)}`;
      }
      if (typeof value === 'string') {
        return `${key} = '${value}'`;
      }
      return `${key} = ${serializeValue(value)}`;
    })
    .join(' AND ');
}

export function setSearchParam(key, value) {
  if (!window.history.pushState || !key) {
    return;
  }
  const url = new URL(window.location.href);
  const params = new window.URLSearchParams(window.location.search);
  if (value === undefined || value === null) {
    params.delete(key);
  } else {
    params.set(key, value);
  }
  url.search = params;
  const urlStr = url.toString();
  window.history.replaceState({ url: urlStr }, null, urlStr);
}
