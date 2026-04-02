/* ============================================================
   Abot Kamay WiFi — Portal Public Configuration
   ============================================================
   Edit this file to configure the captive portal without
   touching application code. Served as a static file.

   Changes take effect on the next page load.
   ============================================================ */

window.PORTAL_CONFIG = {

  // ── Adcash Integration ──────────────────────────────────────
  // Your Adcash publisher zone ID for the Interstitial format.
  // Get this from: https://publisher.adcash.com → Zones → Create Zone → Interstitial
  // Leave empty ('') to disable external ads (local video/image ads still work).
  adcashZoneId: '11097198',

  // ── Ad Duration Fallback ─────────────────────────────────────
  // Countdown duration in seconds used when the server does not
  // return a durationSec value with the ad. Must be >= the
  // ad_minimum_watch_seconds setting in the database (default: 15).
  defaultAdDuration: 30,

};
