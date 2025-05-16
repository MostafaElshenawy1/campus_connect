module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "no-unused-vars": "warn",
    "no-console": "off",
  },
  parserOptions: {
    ecmaVersion: 2019,
  },
};
