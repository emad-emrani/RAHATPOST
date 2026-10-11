import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The store app is a thin native shell: the WebView loads the live site, so every deploy of
 * rahatpost.com updates the app without a store release. `www/` is only an offline fallback.
 */
const config: CapacitorConfig = {
  appId: "com.rahatpost.app",
  appName: "رهط بوست",
  webDir: "www",
  server: {
    url: "https://rahatpost.com",
    cleartext: false,
    errorPath: "offline.html",
    // Google / Facebook sign-in is NOT done in the WebView (they block it); see README.
    allowNavigation: ["rahatpost.com", "*.rahatpost.com"],
  },
  backgroundColor: "#FDB700",
  // Lets the site recognise the store app (e.g. hide "install the app" prompts).
  appendUserAgent: "RahatPostApp/1.0.0",
  android: {
    allowMixedContent: false,
    // targetSdk 35+ forces edge-to-edge; keep the WebView below the status bar / above the nav bar.
    adjustMarginsForEdgeToEdge: "auto",
    webContentsDebuggingEnabled: false,
  },
  ios: { contentInset: "automatic" },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#FDB700",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: { style: "LIGHT", backgroundColor: "#F2C94C", overlaysWebView: false },
  },
};

export default config;
