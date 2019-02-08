export default function rewrite(url, rule) {
  if (rule && rule.from && rule.to) {
    return url.replace(new RegExp(rule.from), rule.to);
  }
  return url;
}
