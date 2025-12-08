module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  env: {
    es2021: true,
    node: true,
    browser: true
  },
  ignorePatterns: ["dist", "build", "node_modules"]
};

