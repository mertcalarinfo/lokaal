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
  ios: {
    ...config.ios,
    // EAS materializes the GOOGLE_SERVICE_INFO_PLIST file secret at build time
    // and sets this env var to its absolute path. Falls back to the static
    // app.json value (./GoogleService-Info.plist) for local development.
    googleServicesFile:
      process.env.GOOGLE_SERVICE_INFO_PLIST || config.ios.googleServicesFile,
  },
  extra: {
    ...config.extra,
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    // RevenueCat public SDK keys, injected at build time. Set these as EAS
    // secrets / .env values for production. They are publishable keys (safe to
    // ship in the bundle), but kept out of source so they are easy to rotate.
    revenueCatIosKey: process.env.REVENUECAT_IOS_API_KEY || '',
    revenueCatAndroidKey: process.env.REVENUECAT_ANDROID_KEY || '',
  },
});
