module.exports = {
  "extends": "airbnb",
  "rules": {
    "max-len": ["error", { "code": 160 }],
    "comma-dangle": ["error", {
      "functions": "ignore",
      "arrays": "only-multiline",
      "objects": "only-multiline",
    }],
    "class-methods-use-this": "off",
    "no-plusplus": "off",
    "no-prototype-builtins": "off",
    "no-underscore-dangle": ["error", {
      "allowAfterThis": true,
    }],
  },
  "env": {
    "browser": true,
  },
};
