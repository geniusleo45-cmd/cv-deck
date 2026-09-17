import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: process.cwd() });

const config = [
  ...compat.extends("next/core-web-vitals"),
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
];

export default config;
