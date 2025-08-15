module.exports = {
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'script', // Changed from module to script for browser compatibility
  },
  env: {
    browser: true,
    es2020: true,
    jest: true,
    node: true, // Added for module.exports
  },
  globals: {
    'bootstrap': 'readonly', // Bootstrap global
  },
  rules: {
    // Allow unused vars if they start with underscore
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
  },
};