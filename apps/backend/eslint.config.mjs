import { defineConfig, globalIgnores } from "eslint/config";

/** Backend is typechecked with tsc; no ESLint rules yet — avoids IDE "missing config" errors. */
export default defineConfig([globalIgnores(["**/*"])]);
