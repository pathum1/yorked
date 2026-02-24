# Yorked Cricket Game - Deployment Handoff Summary

## 🏗️ Architecture Overview
The application is a multiplayer cricket game consisting of:
1.  **Frontend**: A Flutter Web application.
2.  **Backend**: A Node.js Express server.
3.  **Database**: Firebase Firestore (Real-time updates & state management).
4.  **Infrastructure**: Deployed on an Oracle VM running Linux.
5.  **Proxying**: Caddy Server handling reverse proxying and auto-HTTPS via Let's Encrypt.

## ✅ Current Successful State
*   **Backend Docker Container**: The Node.js application is successfully containerized (`yorked-backend`) and running on the Oracle VM, binding to host port `3000`.
*   **Static Serving**: The Express server is successfully configured to serve the Flutter Web production bundle from the mapped Docker volume (`/usr/src/app/public_web`). 
*   **Reverse Proxy**: Caddy configuration (`Caddyfile.prod`) was updated to route traffic from the public domain `https://yorked.duckdns.org` to the backend container's internal IP (`10.0.0.224:3000`).
*   **SSL**: Certificates were successfully generated; the endpoint is secure.
*   **Basic HTTP Routing**: `curl` tests directly to `https://yorked.duckdns.org/health`, `flutter.js`, and SPA routes (`/lobby`) return `HTTP 200 OK`.

## 🚨 The Core Issue
Despite the infrastructure routing correctly and the files being served by Express, **the Flutter Web application fails to load or initialize in the browser**. The page either hangs indefinitely, times out, or fails to render the UI, indicating a silent failure within the client-side bundle initialization, likely tied to missing or misconfigured environmental variables.

---

## 🔍 Environment Variables & Configuration Troubleshooting Guide

To the assisting AI agent, please investigate the following integration points and environment configurations which are the most likely culprits for the frontend failure:

### 1. Flutter Web Firebase Configuration (Client-Side)
The Flutter app relies on Firebase Auth and Firestore directly.
*   **Issue**: If the Firebase Web configuration (API keys, App ID, Project ID, etc.) is missing, hardcoded incorrectly, or not properly injected into the build environment, the Flutter engine will crash silently on startup when calling `Firebase.initializeApp()`.
*   **Action Required**: Verify how `firebase_options.dart` or `index.html` (for Firebase JS SDK imports) is configured. Are the web API keys present? Do they match the `yorked` Firebase project?

### 2. Backend Environment Variables (`.env`)
The Node.js backend requires specific variables localized to the VM Docker environment.
*   **Current State**: 
    - `FIREBASE_SERVICE_ACCOUNT_PATH` is correctly mapped to `/usr/src/app/secrets/serviceAccountKey.json`.
    - `FIREBASE_PROJECT_ID` defaults to `yorked` in `index.js` if missing.
*   **Action Required**: Ensure the VM's `.env` file passed to the Docker container does not have conflicting variables. Check if CORS origins listed in `index.js` (`['https://yorked.duckdns.org', ...]`) strictly match the requesting client.

### 3. API Service Endpoint (Frontend -> Backend)
The Flutter app uses HTTP calls to interact with the Node.js backend (e.g., creating a match).
*   **Current State**: `ApiService.baseUrl` is hardcoded to `https://yorked.duckdns.org/api` inside `lib/services/api_service.dart`.
*   **Action Required**: Ensure this matches exactly. If the frontend was built *before* this URL was finalized, the old local URL (like `http://localhost:3000`) might still be baked into the production `main.dart.js` bundle. Verify if a fresh `flutter build web` is required to lock in the correct URL.

### 4. Caddy Proxy Environment Constraints
The Oracle VM hosts a pre-existing Caddy setup for another system (Aviation Audit System).
*   **Current State**: We appended the `yorked.duckdns.org` block directly to `/home/opc/aviation-audit-system/repo/deploy/Caddyfile.prod`.
*   **Action Required**: Ensure there are no cross-contamination issues with global Caddy directives or environment variables (like `SITE_DOMAIN`) that might be injecting headers (like restrictive Content Security Policies) that block Flutter's initialization scripts or WebAssembly execution.

### 5. CanvasKit / WebAssembly Serving
Flutter Web heavily relies on WebAssembly (`.wasm`) files for its CanvasKit renderer.
*   **Action Required**: Check the browser console logs (if accessible) to see if `skwasm.wasm` or `canvaskit.wasm` are returning 404s or being blocked by MIME-type policies. Express might need specific configuration to serve `.wasm` files with the `application/wasm` MIME type.
