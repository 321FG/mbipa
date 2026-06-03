/**
 * App version endpoint  —  GET /api/mobile/app/version
 * ----------------------------------------------------
 * Drop-in Express route for the MBIPA Node.js backend (the Azure App Service
 * that the mobile app already talks to). It returns the version policy the
 * mobile client uses to drive optional / forced updates and the "What's new"
 * screen.
 *
 * INTEGRATION (in your backend's app.js / server.js):
 *
 *     const appVersionRoute = require("./routes/appVersion");
 *     app.use(appVersionRoute);            // mounts GET /api/mobile/app/version
 *
 * This file is a REFERENCE for the backend repo — it is not bundled into the
 * Expo app. Configuration lives in APP_VERSION_CONFIG below; move it to env
 * vars / a config store when convenient. Bumping a release = edit this object
 * and redeploy (no app store release needed to flip `forceUpdate`).
 */

"use strict";

const express = require("express");

const router = express.Router();

/**
 * Single source of truth for the current mobile version policy.
 *
 *  - latestVersion  : newest version available on the stores.
 *  - minimumVersion : oldest version still allowed to run. Anything below is
 *                     forced to update.
 *  - forceUpdate    : hard kill-switch — set true to force EVERY client below
 *                     latestVersion to update (e.g. critical security fix).
 *  - releaseNotes   : short bullet points shown in the update / What's new UI.
 *  - playStoreUrl   : store link the client opens on "Update".
 */
const APP_VERSION_CONFIG = {
  latestVersion: process.env.APP_LATEST_VERSION || "1.1.0",
  minimumVersion: process.env.APP_MINIMUM_VERSION || "1.0.0",
  forceUpdate: process.env.APP_FORCE_UPDATE === "true" || false,
  releaseNotes: [
    "Improved AI conversations",
    "Voice enhancements",
    "Bug fixes",
  ],
  playStoreUrl:
    process.env.APP_PLAY_STORE_URL ||
    "https://play.google.com/store/apps/details?id=com.mbipa.app",
};

// GET /api/mobile/app/version
router.get("/api/mobile/app/version", (req, res) => {
  // Cache at the edge for a minute; clients also fail open if this is slow.
  res.set("Cache-Control", "public, max-age=60");
  res.status(200).json({
    latestVersion: APP_VERSION_CONFIG.latestVersion,
    minimumVersion: APP_VERSION_CONFIG.minimumVersion,
    forceUpdate: APP_VERSION_CONFIG.forceUpdate,
    releaseNotes: APP_VERSION_CONFIG.releaseNotes,
    playStoreUrl: APP_VERSION_CONFIG.playStoreUrl,
  });
});

module.exports = router;
module.exports.APP_VERSION_CONFIG = APP_VERSION_CONFIG;
