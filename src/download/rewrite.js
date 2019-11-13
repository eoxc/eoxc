import _ from 'underscore';

function getRewriteRule(template, modelOrCollection) {
  // allows use of templating inside rewrite function
  if (modelOrCollection) {
    if (template.constructor.name === 'RegExp') {
      return template;
    }
    const stringified = modelOrCollection.toJSON();
    const evaluatedTemplate = _.template(template, {
      interpolate: /\{\{(.+?)\}\}/g
    })(stringified);
    return evaluatedTemplate;
  }
  return template;
}

export default function rewrite(url, rule, modelOrCollection) {
  // example of templating adding __coverage to id attribute in url:
  // "from": "/({{id}}*)/gm"
  // "to": "$1__coverage",
  if (rule && rule.from && rule.to) {
    return url.replace(new RegExp(getRewriteRule(rule.from, modelOrCollection)), getRewriteRule(rule.to, modelOrCollection));
  }
  return url;
}
