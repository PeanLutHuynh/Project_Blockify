module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  env: {
    node: true,
    es2020: true,
    jest: true,
  },
  rules: {
    // Allow unused vars if they start with underscore
    'no-unused-vars': 'off', // turned off for TypeScript
    // Allow any type for now (can be tightened later)
    'no-undef': 'off', // TypeScript handles this
  },
};