module.exports = {
  extends: ["next/core-web-vitals"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    // Disable problematic rules temporarily
    "@next/next/no-html-link-for-pages": "off",
    "react/no-unescaped-entities": "warn", // Change to warning instead of error
    "react-hooks/exhaustive-deps": "warn", // Change to warning instead of error
  },
};
