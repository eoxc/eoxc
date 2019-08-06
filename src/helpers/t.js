import i18next from '../i18next';

export default function (key, value = undefined) {
  if (typeof value === 'number') {
    return i18next.t(key, { count: value, escapeInterpolation: false });
  } else if (typeof value === 'string') {
    return i18next.t(key, { value, interpolation: { escapeValue: false } });
  }
  return i18next.t(key, { interpolation: { escapeValue: false } });
}
