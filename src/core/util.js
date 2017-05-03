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

export function getISODateTimeString(date) {
  const hours = padLeft(String(date.getUTCHours()), '0', 2);
  const minutes = padLeft(String(date.getUTCMinutes()), '0', 2);
  const seconds = padLeft(String(date.getUTCSeconds()), '0', 2);

  const ms = date.getUTCMilliseconds();
  if (ms !== 0) {
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
