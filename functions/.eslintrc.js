module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "quotes": ["error", "double"],
    "object-curly-spacing": ["error", "always"],
    "max-len": ["error", { "code": 120 }],
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
}; 