/**
 * Dynamic Expo config — extends the static app.json.
 *
 * process.env.GEMINI_API_KEY is read here at build time (Node.js context),
 * not at runtime inside the React Native bundle. Sources, in priority order:
 *   1. EAS secret (production / preview builds on EAS)
 *   2. .env file in the project root (local development — gitignored)
 *   3. Shell environment variable (CI, manual override)
 *
 * The value is injected into Constants.expoConfig.extra.geminiApiKey so the
 * app code can read it without any hardcoded strings in the source.
 */
module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    geminiApiKey: process.env.GEMINI_API_KEY || '',
  },
});
