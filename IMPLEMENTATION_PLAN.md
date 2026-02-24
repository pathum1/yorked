# Yorked — Implementation Plan

> **Reference:** [YORKED_PROJECT_SPECIFICATION.md](file:///mnt/gaming/dev_work/yorked/YORKED_PROJECT_SPECIFICATION.md)
> This plan is designed for an AI coding agent to follow sequentially. Each phase builds on the previous. Do not skip phases.

---

## Phase 0: Firebase Project & Infrastructure Setup

> **Goal:** All cloud services provisioned, DuckDNS configured, before any code is written.

### 0.1 Firebase Project Creation
1. Go to [Firebase Console](https://console.firebase.google.com) → Create project **"Yorked"**
2. Enable **Authentication** → Sign-in method → **Google** (enable it)
3. Enable **Cloud Firestore** → Create database → Region: **`asia-southeast1`** → Start in **test mode**
4. Enable **Cloud Messaging** (FCM) — no config needed, it's auto-enabled
5. Go to **Project Settings → General** → Add a **Web app** → Register app name "Yorked Web"
6. Copy the Firebase config object (apiKey, authDomain, projectId, etc.) — needed in Phase 2
7. Go to **Project Settings → Service Accounts** → Generate new private key → Download `serviceAccountKey.json`
8. **Store securely** — this file is used by the Node.js backend. Never commit to git.

### 0.2 DuckDNS Subdomain
1. Log into [DuckDNS](https://www.duckdns.org)
2. Create subdomain `yorked` → point to `140.245.57.223` (same IP as `aeroaudit.duckdns.org`)

### 0.3 Oracle VM Preparation
1. SSH into the VM: `ssh opc@140.245.57.223`
2. Create secrets directory: `mkdir -p /home/opc/yorked/secrets`
3. Upload `serviceAccountKey.json` to `/home/opc/yorked/secrets/serviceAccountKey.json`
4. Verify Docker and Node.js 20 are installed: `docker --version && node --version`

### 0.4 Caddy Configuration
Add to the existing Caddyfile (do **NOT** remove anything):
```
yorked.duckdns.org {
  reverse_proxy cricket-backend:3000
}
```
Reload Caddy after adding.

> [!CAUTION]
> The existing `aeroaudit.duckdns.org` config MUST NOT be removed or modified. Append only.

---

## Phase 1: Node.js Backend — Project Scaffold & Ball Resolution Engine

> **Goal:** A working Express server with Firestore connectivity, the complete probability-based ball resolution engine, and FCM notification capability. This is the brain of the game.

### 1.1 Project Initialization

Create directory structure:
```
yorked-backend/
├── src/
│   ├── index.js
│   ├── routes/
│   │   ├── match.js
│   │   └── notify.js
│   ├── services/
│   │   ├── resolution.js
│   │   ├── notifications.js
│   │   └── firestore.js
│   └── data/
│       ├── probability_matrix.js
│       └── attribute_modifiers.js
├── Dockerfile
├── package.json
├── .env
└── .dockerignore
```

**`package.json`** dependencies:
- `express` — HTTP server
- `firebase-admin` — Firestore + FCM access from backend
- `dotenv` — environment variable loading
- `cors` — CORS for Flutter web client

**`.env`** contents:
```
PORT=3000
FIREBASE_PROJECT_ID=yorked
FIREBASE_SERVICE_ACCOUNT_PATH=/secrets/serviceAccountKey.json
```

### 1.2 Firebase Admin SDK Initialization (`src/index.js`)
- Load env vars via `dotenv`
- Initialize `firebase-admin` with service account from `FIREBASE_SERVICE_ACCOUNT_PATH`
- Create Express app on `PORT`
- Mount route modules
- Add CORS middleware (allow `yorked.duckdns.org` and `localhost` for dev)
- Add JSON body parser middleware

### 1.3 Firestore Service (`src/services/firestore.js`)
Helper module wrapping all Firestore reads/writes. Key functions:
- `getMatch(matchId)` — read full match document
- `updateMatch(matchId, data)` — partial update match document
- `getUser(uid)` — read player profile & attributes
- `writeBallResult(matchId, ballData)` — write to `/matches/{matchId}/balls/{ballId}` subcollection
- `updateInningsState(matchId, inningsKey, data)` — update innings object within match
- `updateCareerStats(uid, statsUpdate)` — increment career stats after match ends
- `createMatch(matchData)` — create new match document

### 1.4 Probability Matrix (`src/data/probability_matrix.js`)

This is the **core game design data**. Export a nested object keyed by `delivery → shot → outcome probabilities`.

**Structure:** Each delivery+shot combo maps to an object of outcome weights (not percentages — weights are normalized at resolution time).

**All 5 deliveries per bowling style × 8 shots = 40 combos per style, 4 styles = 160 total combos.**

However, many deliveries share the same name across styles (e.g., `Good Length` appears in all 4 styles). Unique deliveries across all styles:

`Yorker, Bouncer, Outswinger, Inswinger, Good Length, Slower Ball, Full Toss, Off-spin, Tossed Up, Slider, Arm Ball, Leg-spin, Googly, Flipper` — **14 unique deliveries**.

14 deliveries × 8 shots = **112 unique combos** to define.

Each combo is an object like:
```js
"Yorker|Slog": {
  DOT: 10, "1": 5, "2": 3, "3": 1, "4": 5, "6": 8,
  W_BOWLED: 35, W_CAUGHT: 15, W_LBW: 10, W_STUMPED: 0, W_RUNOUT: 3
}
```

> [!IMPORTANT]
> **Design guidelines for probability weights** (the implementing agent must follow these cricket-realistic principles):
>
> - **Defensive shots** → High DOT, low wicket, low boundary
> - **Aggressive shots (Slog, Hook, Pull)** → High variance: boundaries OR wickets
> - **Well-matched shots (Cover Drive vs Full Toss)** → High boundary probability
> - **Mismatched shots (Sweep vs Yorker)** → High wicket probability
> - **Spinner deliveries (Googly, Leg-spin)** → Elevated W_STUMPED, W_LBW
> - **Fast deliveries (Bouncer, Yorker)** → Elevated W_BOWLED, W_CAUGHT
> - **Good Length** → Most neutral — modest outcomes across the board
> - **Run Out** → Always a small fixed chance (5-8%) on 1s and 3s only — applied post-resolution, not in the matrix itself

### 1.5 Attribute Modifiers (`src/data/attribute_modifiers.js`)

Export a function `applyModifiers(baseProbs, batterAttrs, bowlerAttrs)` that returns modified probability weights.

**Batting attribute effects:**
| Attribute | Effect on probabilities |
|-----------|------------------------|
| `technique` (1-7) | Per point: DOT weight +3%, wicket weights −2% each |
| `power` (1-7) | Per point: `4` weight +3%, `6` weight +4%, DOT −1% |
| `timing` (1-7) | Per point: `2` and `3` weights +3%, `1` weight +2% |

**Bowling attribute effects:**
| Attribute | Effect on probabilities |
|-----------|------------------------|
| `accuracy` (1-7) | Per point: DOT weight +3%, `W_BOWLED` +2%, boundary weights −2% |
| `pace` (1-7) | Per point: `W_CAUGHT` +2%, `W_BOWLED` +2%, `4` and `6` weights −1% |
| `variation` (1-7) | Per point: `W_STUMPED` +2%, `W_LBW` +2%, run weights −1% |

**Modifier application:** Multiply base weights by `(1 + modifier_percentage)`. After all modifiers applied, normalize so weights sum to a consistent total (e.g., 1000). Then do weighted random selection.

### 1.6 Ball Resolution Service (`src/services/resolution.js`)

The most critical function. Export `resolveBall(matchId, inningsNumber)`:

```
1. Read match document from Firestore
2. Get pendingBall.delivery and pendingBall.shot — if either is null, abort
3. Read bowler profile: /users/{currentBowlerUid} → get bowling attributes
4. Read striker profile: /users/{strikerUid} → get batting attributes
5. Look up base probability from probability_matrix[delivery][shot]
6. Apply attribute modifiers via applyModifiers()
7. Perform weighted random selection → outcome (e.g., "4", "W_BOWLED", "DOT")
8. Determine runs scored (0 for DOT/wickets, else numeric value)
9. Handle Run Out: if outcome is 1 or 3, apply additional 5-8% random chance for W_RUNOUT
10. Write ball document to /matches/{matchId}/balls/{ballId}
11. Update innings state:
    a. Add runs to totalRuns
    b. Update batsman stats (runs, balls, fours, sixes)
    c. Update bowler stats (balls, runs conceded, wickets)
    d. If wicket: set batsman status to "out", increment totalWickets, bring in next batsman
    e. If odd runs (1, 3): swap strikerUid and nonStrikerUid
    f. Increment ball counter; if ball == 6: increment over, swap ends, reset ball to 0
    g. Check innings end conditions:
       - All wickets fallen (totalWickets == playersPerTeam - 1)
       - All overs bowled (currentOver == match.overs)
       - (Innings 2 only) Target reached
    h. If innings ends: update match status accordingly
    i. Clear pendingBall (set delivery and shot to null)
12. Determine what FCM notifications to send (see 1.8)
13. Return outcome for logging
```

### 1.7 API Routes (`src/routes/match.js`)

| Method | Endpoint | Handler logic |
|--------|----------|---------------|
| `POST` | `/api/match/create` | Validate body (overs, playersPerTeam, teamA info, creatorUid). Create match doc in Firestore with status `lobby_open`. Return `{ matchId }`. |
| `GET` | `/api/match/:matchId/state` | Read and return full match document. Fallback for clients missing real-time updates. |
| `POST` | `/api/match/resolve-ball` | Body: `{ matchId, inningsNumber }`. Call `resolveBall()`. Return outcome. This is triggered when Firestore listener detects both delivery+shot are set, OR called by the client after writing their action. |
| `POST` | `/api/match/:matchId/assign-bowler` | Body: `{ captainUid, bowlerUid }`. Validate captain is the bowling team captain. Write `currentBowlerUid` to innings state. Send FCM to assigned bowler. |

**Firestore Listener approach (preferred over client-triggered resolution):**
In `src/index.js`, set up a Firestore `onSnapshot` listener on all match documents where `status` is an active innings. When `pendingBall.delivery` and `pendingBall.shot` are both non-null and `pendingBall.resolvedAt` is null, trigger `resolveBall()`. This ensures resolution is always server-driven.

### 1.8 FCM Notification Service (`src/services/notifications.js`)

Functions:
- `sendToUser(uid, title, body, data)` — Look up user's FCM token from `/users/{uid}/fcmToken`, send via `admin.messaging().send()`
- `sendToMultiple(uids, title, body, data)` — Send to multiple users
- `notifyBowlerTurn(matchId, bowlerUid)` — "Your turn to bowl!"
- `notifyBatsmanTurn(matchId, strikerUid, bowlerName)` — "Your turn to bat!"
- `notifyNewBatsman(matchId, batsmanUid, teamName)` — "You're in!"
- `notifyAssignBowler(matchId, captainUid)` — "Pick your next bowler"
- `notifyInningsBreak(matchId, allPlayerUids, teamName, score, wickets)` — Innings complete
- `notifyMatchComplete(matchId, allPlayerUids, winnerTeamName)` — Match over
- `notifyLobbyFull(matchId, captainUids)` — Ready to toss
- `notifyTossCaller(matchId, callerUid)` — Your turn to call

All notifications include `data: { matchId, screen }` for deep linking.

Wrap all sends in try-catch — log failures, never crash.

### 1.9 Dockerfile

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY src/ ./src/
EXPOSE 3000
CMD ["node", "src/index.js"]
```

### 1.10 Docker Compose Addition

Add to the **existing** `docker-compose.yml` on the VM:
```yaml
cricket-backend:
  build: ./yorked-backend
  container_name: cricket-backend
  restart: always
  env_file: ./yorked-backend/.env
  volumes:
    - ./yorked/secrets:/secrets:ro
  networks:
    - caddy_net
```

> [!WARNING]
> Do NOT create a separate docker-compose file. Extend the existing one. The `caddy_net` network must be the same one used by the audit system and Caddy.

---

## Phase 2: Flutter Web — Project Scaffold & Auth

> **Goal:** A Flutter web app with Firebase Auth (Google Sign-In), routing, and the player profile setup flow.

### 2.1 Flutter Project Initialization
```bash
cd /mnt/gaming/dev_work/yorked
flutter create --platforms web yorked_app
cd yorked_app
```

Install FlutterFire CLI and configure:
```bash
dart pub global activate flutterfire_cli
flutterfire configure --project=yorked
```
This generates `firebase_options.dart`.

### 2.2 Dependencies (`pubspec.yaml`)
```yaml
dependencies:
  flutter:
    sdk: flutter
  firebase_core: ^3.0.0
  firebase_auth: ^5.0.0
  cloud_firestore: ^5.0.0
  firebase_messaging: ^15.0.0
  google_sign_in: ^6.0.0
  go_router: ^14.0.0
  flutter_riverpod: ^2.0.0
  http: ^1.0.0
  animate_do: ^3.0.0
  google_fonts: ^6.0.0
```

### 2.3 Directory Structure
Create the directory structure exactly as specified in the spec (Section 15). All files listed there should be created as stubs initially.

### 2.4 App Entry Point (`lib/main.dart`)
- Initialize Firebase with `firebase_options.dart`
- Set up `ProviderScope` (Riverpod)
- Configure `GoRouter` with all routes from the spec's screen table (Section 9)
- Add auth guard: unauthenticated users redirect to `/`; authenticated users without a profile redirect to `/profile/setup`

### 2.5 Auth Service (`lib/services/auth_service.dart`)
- `signInWithGoogle()` — Firebase Auth Google sign-in flow
- `signOut()`
- `currentUser` getter — returns `User?`
- `authStateChanges` stream

### 2.6 Auth Provider (`lib/providers/auth_provider.dart`)
- Riverpod `StreamProvider` wrapping `authStateChanges`
- Derived provider for current user profile from Firestore

### 2.7 Landing Screen (`lib/screens/landing_screen.dart`)
- Full-screen branded landing page with Yorked logo/name
- Large "Sign in with Google" button
- On successful auth → check if profile exists in Firestore → navigate to `/profile/setup` or `/dashboard`

### 2.8 Profile Setup Screen (`lib/screens/profile_setup_screen.dart`)
- **Display Name** text field (pre-filled from Google account name)
- **Avatar** selection — grid of ~12 cricket-themed preset icons (bat, helmet, ball, lion, tiger, stumps, gloves, cap, shield, eagle, flame, star)
- **Role** selector: `Pure Batsman`, `Pure Bowler`, `All-Rounder`
- **Bowling Style** selector: `Fast`, `Medium`, `Off-spin`, `Leg-spin`
- **Attribute Point Allocator**: 10 total points between batting (technique, power, timing) and bowling (accuracy, pace, variation) with role-based caps:
  - Pure Batsman: max 7 batting total, min 1 bowling total
  - Pure Bowler: max 7 bowling total, min 1 batting total
  - All-Rounder: max 5 batting total, max 5 bowling total
- **Save** button → write to `/users/{uid}` in Firestore → navigate to `/dashboard`

### 2.9 Firestore Service (`lib/services/firestore_service.dart`)
- `createUserProfile(uid, profileData)`
- `getUserProfile(uid)` → `Player` model
- `updateUserProfile(uid, data)`
- `getMatch(matchId)` → `Match` model
- `matchStream(matchId)` → real-time `Stream<Match>`
- `joinTeam(matchId, team, uid)` — Firestore transaction for safe slot assignment
- `setDelivery(matchId, delivery)` — write to `pendingBall.delivery`
- `setShot(matchId, shot)` — write to `pendingBall.shot`

### 2.10 Data Models (`lib/models/`)
Create Dart classes with `fromJson`/`toJson` for:
- `Player` — mirrors `/users/{uid}` schema
- `CricketMatch` — mirrors `/matches/{matchId}` schema (avoid name clash with Dart's `Match`)
- `Innings` — the innings sub-object
- `Ball` — mirrors `/matches/{matchId}/balls/{ballId}`

---

## Phase 3: Flutter Web — Dashboard & Match Creation

> **Goal:** Players can view their dashboard, create matches, and generate shareable links.

### 3.1 Dashboard Screen (`lib/screens/dashboard_screen.dart`)
- **Active Matches** section — list of matches where the user is a participant and `status != "complete"`. Each shows: team names, score, status badge, tap to navigate to match
- **Create Match** button → navigates to `/match/create`
- **Match History** section — completed matches with results
- **Profile** button → navigates to `/profile`
- All match lists populated via Firestore queries with real-time listeners

### 3.2 Create Match Screen (`lib/screens/create_match_screen.dart`)
- **Overs** selector: slider or stepper, min 1, max 20
- **Players per team** selector: min 1, max 6
- **Team A name** text field
- **Team A icon** selector — grid of ~12 preset team badge icons (different from player avatars — flags, crests, animals, shields, etc.)
- **Create** button → calls backend `POST /api/match/create` with the data + creator's UID → receives `matchId` → navigates to `/match/{matchId}/lobby`
- **Share** button appears after creation — uses Web Share API (`navigator.share`) to share `https://yorked.duckdns.org/match/{matchId}` to WhatsApp

### 3.3 API Service (`lib/services/api_service.dart`)
- Base URL: `https://yorked.duckdns.org/api`
- `createMatch(data)` → `POST /match/create`
- `getMatchState(matchId)` → `GET /match/{matchId}/state`
- `resolveBall(matchId, inningsNumber)` → `POST /match/resolve-ball`
- `assignBowler(matchId, captainUid, bowlerUid)` → `POST /match/{matchId}/assign-bowler`

---

## Phase 4: Flutter Web — Lobby, Toss & Match Intro

> **Goal:** Full pre-match flow: lobby joining, coin toss ceremony, team intro splash.

### 4.1 Lobby Screen (`lib/screens/lobby_screen.dart`)
- Two team panels side by side (Team A left, Team B right)
- Each panel shows: team name, team icon, player slots
- **Filled slots**: player avatar + display name
- **Empty slots**: "Join" button (show "Join Team A" / "Join Team B")
- Joining uses **Firestore transaction** to prevent race conditions on same slot
- First player to join Team B becomes Team B Captain — prompted to set team name + icon via a dialog
- Players who already joined see their slot highlighted, no join buttons
- Real-time listener updates the lobby UI as players join
- **"Ready to Toss"** button appears when all slots filled — only visible to captains
- Both captains must tap Ready → match status updates to `toss_pending` → all navigate to toss screen
- If player has no profile yet, redirect to `/profile/setup` with a return path

### 4.2 Toss Screen (`lib/screens/toss_screen.dart`)
- Server randomly selects one captain as toss caller (written to `match.toss.callerUid` by backend or by a Firestore cloud function)
- **Non-caller view**: "Waiting for {Captain Name} to call the toss…" with a coin animation
- **Caller view**: Two large buttons — **Heads** / **Tails**
- On selection: coin flip animation plays for all (triggered by Firestore update), result revealed
- **Toss winner view**: Two buttons — **Bat First** / **Bowl First**
- On decision: toss result written to Firestore, match status → `pre_match`, all navigate to intro splash

### 4.3 Team Intro Splash Screen (`lib/screens/intro_splash_screen.dart`)
- Full-screen animated splash
- Team A badge+name on left, animated **VS** in center, Team B badge+name on right
- Match info: "{X} overs match | Batting first: {Team Name}"
- Player cards for each team animate in (staggered) — avatar, name, role badge
- Auto-advances after 4 seconds OR on "Let's Play" tap
- Match status → `innings_1` — first innings begins

---

## Phase 5: Flutter Web — Live Match Screens

> **Goal:** The core gameplay loop: bowling, batting, ball result, live scorecard.

### 5.1 Match Live Screen (`lib/screens/match_live_screen.dart`)
- The **hub screen** all players land on during active play
- Shows: current score, overs, current batsmen (striker highlighted), current bowler, run rate, required rate (innings 2), last few ball outcomes
- **Mini scoreboard** widget at top
- **Ball-by-ball ticker** showing this over's deliveries as colored circles (dots=grey, 1-3=white, 4=blue, 6=gold, W=red)
- **Contextual action**: if current user is the active bowler → "Your turn to bowl" button → navigates to bowling screen. If current user is the striker → "Your turn to bat" button → navigates to batting screen.
- Uses real-time Firestore listener on the match document — all UI updates are automatic

### 5.2 Bowling Screen (`lib/screens/bowling_screen.dart`)
- Only accessible to the current bowler (`currentBowlerUid == currentUser.uid`)
- Shows: bowler's bowling style, current figures this match
- Displays **only the deliveries available for their bowling style** (5 options) as large selectable cards
- Each card: delivery name + brief descriptor (e.g., "Yorker — aim at the base of the stumps")
- Bowler selects delivery → confirmation dialog → writes `pendingBall.delivery` to Firestore
- After confirmation: "Waiting for batsman…" screen with a simple animation
- FCM notification fires to striker batsman

### 5.3 Batting Screen (`lib/screens/batting_screen.dart`)
- Only accessible to the current striker (`strikerUid == currentUser.uid`)
- Shows: bowler name + bowling style (but **NOT** the delivery — hidden)
- All 8 shot types displayed as large selectable cards
- Each card: shot name + brief descriptor (e.g., "Slog — high risk, high reward aerial shot")
- Batsman selects shot → confirmation dialog → writes `pendingBall.shot` to Firestore
- Backend auto-resolves when both delivery + shot are set

### 5.4 Ball Result Overlay (`lib/widgets/ball_result_overlay.dart`)
- Triggered when ball outcome is written to Firestore (real-time listener)
- Full-screen semi-transparent overlay
- Large animated text: outcome (e.g., "SIX! 🎉", "WICKET — Bowled! 💥", "Dot Ball")
- Sub-text: "Yorker vs Slog" (delivery vs shot)
- Updated score displayed
- Colors: gold for 6, blue for 4, red for wicket, grey for dot, white for 1-3
- Auto-dismisses after 3 seconds OR on tap
- After dismissal: updated live screen reflects new state

### 5.5 Scoreboard Widget (`lib/widgets/scoreboard_widget.dart`)
- Compact score display: `{TeamName} {runs}/{wickets} ({overs.balls})`
- Current batsmen with individual scores
- Current bowler with figures
- Required run rate (innings 2)

### 5.6 Bowler Assignment Flow
**After each over completes:**
- If only 2 bowlers: auto-alternate (Player 1 bowls odd overs, Player 2 bowls even overs)
- If 3+ bowlers: bowling captain gets an FCM notification + in-app prompt to select next bowler
- Captain sees list of bowlers with their current match figures + remaining overs quota
- Captain taps to assign → `currentBowlerUid` updated → assigned bowler notified

**Bowler quota enforcement**: No bowler may bowl more than `ceil(totalOvers / numberOfBowlers)` overs.

---

## Phase 6: Flutter Web — Innings Break, Victory & Career Stats

> **Goal:** Complete the match lifecycle: innings transitions, win conditions, stats.

### 6.1 Innings Break Screen (`lib/screens/innings_break_screen.dart`)
- Shown when first innings ends (all overs bowled OR all wickets fallen)
- Displays: "{Team} scored {runs}/{wickets} in {overs} overs — Target: {runs+1}"
- **Full batting card**: Each batsman — runs, balls faced, 4s, 6s, dismissal info (or "not out")
- **Full bowling figures**: Each bowler — overs, maidens, runs, wickets, economy
- "Continue" button (both captains must tap OR auto-advance after 10 seconds)
- Match status → `innings_2`, teams swap roles
- FCM notifications fire for second innings openers and first bowler

### 6.2 Victory/Defeat Screen (`lib/screens/victory_screen.dart`)

**Win conditions logic** (resolved by backend):
- Batting team reaches target → "Win by {wickets remaining} wickets"
- Batting team fails (all out or overs end) → "Win by {runs difference} runs"
- Scores tied → "Match Tied" — offer Super Over if enabled

**Screen content:**
- Winner banner with team badge, name, confetti animation
- **Full scorecard** — both innings, expandable accordion sections
- **Man of the Match**: auto-calculated by backend using formula: `(runs × 1) + (wickets × 20) + (economyBonus)` where economy bonus = `max(0, (6 - economy) × 5)`. Player with highest score wins. Display with avatar + stats.
- **Career stats updated**: backend increments all players' career stats in `/users/{uid}/careerStats`
- **Share Result** button — generates formatted text and uses Web Share API:
  `"🏏 {WinnerTeam} beat {LoserTeam} by {margin} in a {overs}-over thriller! Play at yorked.duckdns.org"`

### 6.3 Super Over (Optional — include in MVP if time permits)
- Triggered on tie if match creation had Super Over enabled
- 1 over per side — captain assigns 2 batsmen + 1 bowler
- Same resolution flow as normal play
- If still tied → match declared a tie

### 6.4 Player Profile Screen (`lib/screens/profile_screen.dart`)
- View & edit: display name, avatar, role, bowling style, attributes
- **Career stats** dashboard: matches, wins, losses, batting avg, bowling avg, highest score, best bowling
- **Match history** list — tap to view past match scorecards
- Attribute point redistribution: same caps as initial setup. Changes logged with timestamp; not retroactive.

### 6.5 Match History Screen
- List of completed matches the player participated in
- Each entry: team names, result, date, player's personal performance
- Tap → full scorecard view (reuse victory screen in read-only mode)

---

## Phase 7: FCM Push Notifications & Service Worker

> **Goal:** Background push notifications that deep-link into the correct match screen.

### 7.1 Service Worker (`web/firebase-messaging-sw.js`)
```js
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');
firebase.initializeApp({ /* config from Phase 0 */ });
const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification;
  self.registration.showNotification(title, { body, data: payload.data });
});
```

### 7.2 Notification Service (`lib/services/notification_service.dart`)
- Request notification permission on first load
- Get FCM token → write to `/users/{uid}/fcmToken`
- Listen for token refresh → update Firestore
- Handle foreground messages → show in-app snackbar/banner with tap-to-navigate
- Handle notification tap → use `data.matchId` + `data.screen` to navigate via GoRouter

### 7.3 Deep Link Payload Structure
All FCM notifications include:
```json
{
  "data": {
    "matchId": "abc123",
    "screen": "bowl" | "bat" | "lobby" | "toss" | "result" | "break" | "live"
  }
}
```
GoRouter handles these by navigating to `/match/{matchId}/{screen}`.

---

## Phase 8: Deployment & End-to-End Testing

> **Goal:** Everything running on the Oracle VM, accessible at `yorked.duckdns.org`.

### 8.1 Build Flutter Web
```bash
cd yorked_app
flutter build web --release
```
Output is in `build/web/`.

### 8.2 Firebase Hosting Deploy
```bash
firebase init hosting  # set public dir to build/web, SPA=yes
firebase deploy --only hosting
```
Configure custom domain `yorked.duckdns.org` in Firebase Hosting if using Firebase Hosting for the frontend.

**Alternative (simpler):** Serve the Flutter web build from the Node.js Express server as static files. This avoids needing Firebase Hosting entirely — Caddy reverse-proxies everything to the Express server which serves both the API and the static frontend.

> [!TIP]
> The simpler approach is to serve Flutter's `build/web` as static files from Express. In `src/index.js`:
> ```js
> app.use(express.static('public')); // copy build/web contents here
> app.get('*', (req, res) => res.sendFile('index.html', { root: 'public' }));
> ```
> This keeps everything on one server, simplifies CORS, and avoids Firebase Hosting config.

### 8.3 Docker Build & Deploy
```bash
# On the Oracle VM
cd /home/opc/yorked
docker compose build cricket-backend
docker compose up -d cricket-backend
```

### 8.4 Caddy Reload
```bash
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

### 8.5 End-to-End Test Checklist
1. Navigate to `https://yorked.duckdns.org` — landing page loads
2. Sign in with Google — auth works, redirected to profile setup
3. Create profile with attributes — saved to Firestore
4. Create a match — match document created, lobby loads
5. Share link — second player joins via link
6. Both join teams, lobby fills, ready to toss — toss flow works
7. Coin toss → team intro → match begins
8. Bowler receives push notification → selects delivery
9. Batsman receives push notification → selects shot
10. Ball resolves → result overlay appears → score updates
11. Play through full innings → innings break screen
12. Play second innings → victory screen
13. Career stats updated for all players
14. Share result button works
15. Close and reopen link — match state preserved, correct screen shown

---

## Critical Design Decisions & Clarifications

### State Machine: Match Status Transitions
```
lobby_open → toss_pending → pre_match → innings_1 → innings_break → innings_2 → complete
```
Each transition is driven by specific events. The frontend uses the match status to determine which screen to render. GoRouter should have a redirect guard that reads match status and routes to the correct screen regardless of what URL the player navigates to.

### Conflict Prevention
- **Slot joining**: Use Firestore transactions to prevent two players claiming the same slot
- **Ball resolution**: Only the backend resolves balls — clients just write their action (delivery or shot). A Firestore security rule should prevent clients from writing to the `outcome` field directly.
- **Duplicate resolution**: Check `pendingBall.resolvedAt` — if already set, skip resolution. This prevents double-resolution if the listener fires twice.

### Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
    match /matches/{matchId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null; // Backend uses admin SDK (bypasses rules)
    }
    match /matches/{matchId}/balls/{ballId} {
      allow read: if request.auth != null;
      allow write: if false; // Only backend writes ball results
    }
  }
}
```

### Maiden Over Detection
A maiden over = 6 consecutive dot balls with 0 runs scored in the over. After each over completes, the backend checks `overHistory[currentOver]` — if all 6 balls are DOT (0 runs), increment bowler's maiden count.

---

## Implementation Order Summary

| Phase | What | Depends On | Estimated Effort |
|-------|------|------------|------------------|
| 0 | Firebase + Infra setup | Nothing | 1-2 hours (manual) |
| 1 | Node.js backend + resolution engine | Phase 0 | 3-4 days |
| 2 | Flutter scaffold + Auth + Profile | Phase 0 | 2-3 days |
| 3 | Dashboard + Match creation | Phases 1, 2 | 1-2 days |
| 4 | Lobby + Toss + Intro | Phase 3 | 2-3 days |
| 5 | Live match screens (core gameplay) | Phases 1, 4 | 3-4 days |
| 6 | Innings break + Victory + Stats | Phase 5 | 2-3 days |
| 7 | FCM notifications | Phases 1, 5 | 1-2 days |
| 8 | Deployment + E2E testing | All phases | 1-2 days |

**Total estimated effort: 14-23 days** for a single developer/agent.

> [!IMPORTANT]
> Phases 1 and 2 can be worked on **in parallel** since they are independent (backend vs frontend). Phases 3-7 are sequential.

---

## Phase 11: Match Deletion Feature (User Request)

> **Goal:** The host can delete the current match, and any users visiting deleted links will see who deleted it and when.

### 11.1 Update MatchState Model
- Modify `lib/models/match_state.dart` to parse `deletedAt` and `deletedBy`.

### 11.2 Lobby UI for Host
- In `lib/screens/lobby_screen.dart`, add a "Cancel Match" / "Delete Match" icon button in the AppBar for the creator.
- When clicked, show a confirmation `AlertDialog`.
- On confirm, use Firestore directly to update the match document:
  - `status`: `'deleted'`
  - `deletedAt`: server timestamp (or local ISO8601 string)
  - `deletedBy`: `currentUser.displayName`

### 11.3 Deleted Match UI Handling
- Create `DeletedMatchWidget` in `lib/widgets/widgets.dart` or just render the UI inline when `match.status == 'deleted'`.
- This UI should display: "This match was deleted by [deletedBy] on [deletedAt]".
- In `LobbyScreen`, `MatchLiveScreen`, `TossScreen`, etc., check the stream data. If `status == 'deleted'`, return the `DeletedMatchWidget` instead of redirecting or showing normal content.
