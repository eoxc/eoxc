module.exports = {
  "extends": "airbnb",
  "rules": {
    "comma-dangle": ["error", {
      "functions": "ignore",
      "arrays": "only-multiline",
      "objects": "only-multiline",
    }],
    "class-methods-use-this": "off",
  },
};
