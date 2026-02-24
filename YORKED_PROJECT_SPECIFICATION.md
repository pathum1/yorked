# Yorked — Async Multiplayer Cricket Game
## Full Project Specification for AI Planning Agent

---

## 1. Project Overview

**Yorked** is a browser-based, asynchronous multiplayer cricket game designed for a small group of friends (4–8 people) who share a WhatsApp group. The game is turn-based and async-first — meaning a player may take up to a full day to respond to their turn. The game must maintain full state at all times so any player can open the URL and see the current live state of the match.

The experience must feel like real cricket — players have roles, attributes, bowling styles, and shot selections that all influence probabilistic outcomes. The game is not graphically intensive but must be visually engaging and tactically interesting.

**App Name:** Yorked  
**Domain:** `yorked.duckdns.org` (DuckDNS, pointing to `140.245.57.223`)  
**Primary Users:** ~4–8 friends in a WhatsApp group  

---

## 2. Technology Stack

### Frontend
- **Flutter Web** — compiled to a static web app
- Hosted on **Firebase Hosting** (free tier)
- Real-time UI updates via **Firestore real-time listeners** (no polling, no manual refresh)
- Push notifications via **Firebase Cloud Messaging (FCM)** with **Service Workers** for background delivery

### Backend
- **Node.js 20 + Express** running on the Oracle VM
- Handles ball resolution logic (delivery vs shot outcome calculation)
- Triggers FCM push notifications after each game state change
- Runs as a **Docker container** on the Oracle VM alongside the existing audit system
- Reverse-proxied by the existing **Caddy** instance on the VM

### Database & Auth
- **Firebase Firestore** — all game state, player profiles, match data
- **Firebase Authentication** — Google Sign-In only (Gmail accounts)
- Each player's UID from Firebase Auth is their permanent identity across all matches and sessions

### Infrastructure
- **Oracle Cloud VM** — `VM.Standard.A1.Flex`, ARM (Neoverse-N1), 1 OCPU, 6GB RAM, Oracle Linux 9.6 aarch64, Singapore region (`ap-singapore-2`)
- **Public IP:** `140.245.57.223`
- **Node.js 20** and **Docker** already installed on the VM
- **Caddy** already running on ports 80/443, handling existing `aeroaudit.duckdns.org` — the cricket backend must be added as a new service without disrupting this
- **Firebase Project:** `Yorked`, Firestore region `asia-southeast1`
- **DuckDNS subdomain:** `yorked.duckdns.org` → same IP as audit system

### Caddy Routing
Caddy routes by hostname. Add a new block to the existing Caddyfile:
```
yorked.duckdns.org {
  reverse_proxy cricket-backend:3000
}
```
Where `cricket-backend` is the Docker service name of the Node.js container.

---

## 3. Authentication & Player Identity

- **Google Sign-In** via Firebase Authentication
- First-time sign-in triggers **Player Profile Setup** screen
- Firebase UID is the permanent player identifier stored in all Firestore documents
- Players are always who they say they are — no PINs needed, Gmail identity is the trust anchor
- Profile is persistent across all matches and sessions

---

## 4. Player Profile

Created once on first sign-in. Editable from the Dashboard at any time (stat changes are logged, not retroactively applied to past matches).

### Fields
- **Display Name** — custom name (can differ from Gmail name)
- **Player Avatar** — selected from ~12 preset cricket-themed icons (e.g. bat, helmet, ball, lion, tiger, stumps, gloves, cap, etc.)
- **Role** — one of: `Pure Batsman`, `Pure Bowler`, `All-Rounder`
- **Bowling Style** — one of: `Fast`, `Medium`, `Off-spin`, `Leg-spin`
- **Attribute Points** — 10 points distributed across batting and bowling attributes with role-based caps:
  - Pure Batsman: max 7 batting, min 1 bowling
  - Pure Bowler: max 7 bowling, min 1 batting
  - All-Rounder: max 5 batting, max 5 bowling

### Batting Attributes
| Attribute | Effect |
|-----------|--------|
| Technique | Improves defensive shot effectiveness, reduces false shot risk |
| Power | Increases probability of boundaries (4s and 6s) on aggressive shots |
| Timing | Improves medium-risk shots like drives and cuts |

### Bowling Attributes
| Attribute | Effect |
|-----------|--------|
| Accuracy | Improves effectiveness of precision deliveries (e.g. Yorker) |
| Pace | Amplifies bouncers and fast deliveries |
| Variation | Increases surprise factor, reduces batsman's favorable odds |

### Career Stats (auto-updated after each match)
- Total matches played, wins, losses
- Total runs scored, batting average, highest score
- Total wickets taken, bowling average, economy rate
- Match history with results

---

## 5. Delivery Types by Bowling Style

The bowler sees only the deliveries available for their registered bowling style.

| Bowling Style | Available Deliveries |
|---------------|----------------------|
| Fast | Yorker, Bouncer, Outswinger, Inswinger, Good Length |
| Medium | Yorker, Good Length, Outswinger, Slower Ball, Full Toss |
| Off-spin | Off-spin, Tossed Up, Slider, Good Length, Arm Ball |
| Leg-spin | Leg-spin, Googly, Tossed Up, Flipper, Good Length |

---

## 6. Shot Types

Available to all batsmen. All 8 shots are shown as selectable cards on the batting screen. The batsman does **not** see the bowler's delivery choice before selecting their shot — this is hidden until resolution.

**Available shots:** Defensive, Cover Drive, Straight Drive, Pull Shot, Hook Shot, Cut Shot, Sweep, Slog

> Note: Contextually mismatched shots (e.g. Sweep vs Yorker) are not greyed out before ball resolution since the batsman doesn't know the delivery. However, the post-ball result overlay can highlight when a shot was a poor contextual choice.

---

## 7. Ball Resolution System

Ball resolution happens **server-side on the Node.js backend** (not in the client). This prevents cheating and keeps logic centralised.

### Trigger
When both the delivery AND the shot are written to Firestore for a given ball, a Firestore trigger (or the Node.js backend via a Firestore listener) fires the resolution function.

### Resolution Logic
Each delivery vs shot combination has a **base probability distribution** across these outcomes:

| Outcome | Code |
|---------|------|
| Dot ball | `DOT` |
| 1 run | `1` |
| 2 runs | `2` |
| 3 runs | `3` |
| Four (boundary) | `4` |
| Six | `6` |
| Wicket — Bowled | `W_BOWLED` |
| Wicket — Caught | `W_CAUGHT` |
| Wicket — LBW | `W_LBW` |
| Wicket — Stumped | `W_STUMPED` |
| Wicket — Run Out | `W_RUNOUT` |

### Attribute Modifiers
Player attributes shift probabilities from the base matrix:
- High **Power** on Slog vs Bouncer: shifts `6` probability up, `W_CAUGHT` down
- High **Accuracy** on Yorker: shifts `W_BOWLED` and `DOT` up
- High **Variation** on Googly: shifts `W_STUMPED` and `W_LBW` up
- High **Technique** on Defensive shot: shifts `DOT` up, `W_LBW` down

### Example Outcome Logic (Base Probabilities)

| Delivery | Shot | Likely Outcomes |
|----------|------|-----------------|
| Yorker | Slog | High W_BOWLED — classic death-over trap |
| Yorker | Defensive | Mostly DOT or 1 — safe but scoreless |
| Yorker | Cover Drive | Medium risk — boundary OR W_LBW/W_BOWLED |
| Bouncer | Pull Shot | High variance — 6 OR W_CAUGHT |
| Bouncer | Defensive | Usually DOT — ducking/blocking |
| Full Toss | Drive | High boundary probability — gift delivery |
| Googly | Defensive | Medium W_LBW/W_STUMPED if batsman misreads |
| Tossed Up | Slog | Classic spinner trap — 6 OR W_STUMPED/W_CAUGHT |
| Good Length | Defensive | Safe — mostly DOT or 1 |
| Inswinger | Cover Drive | W_LBW or edge caught risk |

### Wicket Types & Triggers
| Wicket | Primary Triggers |
|--------|-----------------|
| Bowled | Yorker/Good Length vs missed Slog or misread |
| Caught | Pull, Hook, Slog going airborne |
| LBW | Ball tracking to stumps, shot missed — Yorker/Inswinger |
| Stumped | Spinner delivery, batsman steps out and misses |
| Run Out | Small random chance (~5–8%) on 1s and 3s — pressure running |

---

## 8. Match Flow — Complete Step by Step

### Step 1: Create Match
The creating player (becomes Team A Captain automatically) sets:
- **Number of overs** (min 1, max 20)
- **Players per team** (min 1, max 6)
- **Team A name**
- **Team A icon** — selected from preset team badge icons (different set from player avatars — e.g. flags, crests, animals, shields)

A match document is created in Firestore with status `lobby_open` and a unique `matchId`. A shareable URL is generated: `https://yorked.duckdns.org/match/{matchId}`. The creator is presented with a **Share Match Link** button that opens the native share sheet for pasting into WhatsApp.

---

### Step 2: Lobby
All players open the shared URL. The lobby screen shows:
- **Team A panel** — creator's slot filled, remaining slots empty
- **Team B panel** — all slots empty initially
- Real-time updates via Firestore listener — names populate live as players join

**Joining flow:**
- Player taps "Join Team A" or "Join Team B"
- If no profile exists yet, they are taken through Profile Setup and returned to the lobby after
- Each player's Firebase UID is written to their team slot in Firestore
- Players who close and reopen the link rejoin their existing slot automatically via UID

**Team B Captain selection:**
- First player to join Team B becomes Team B Captain automatically
- Team B Captain is prompted to set Team B name and team icon after joining

**Lobby ready:**
- When all player slots are filled, a **"Ready to Toss"** button appears
- Both captains must tap Ready
- Match status updates to `toss_pending`

---

### Step 3: Coin Toss
- One captain is **randomly selected** by the server to call the toss
- All players on the Toss Screen see: "Waiting for [Captain Name] to call…"
- The calling captain sees: **Heads** or **Tails** — two large tap targets
- A coin flip animation plays for all players simultaneously via Firestore real-time update
- The winning captain sees: **Bat First** or **Bowl First** — tap to choose
- Match status updates to `pre_match`

---

### Step 4: Team Intro Splash Screen
Full-screen animated splash shown to all players:
- Team A badge + name on the left
- **VS** in the centre
- Team B badge + name on the right
- Match info below: "{X} overs match | Batting first: {Team Name}"
- Player cards for each team scroll in — avatar, name, role
- Auto-advances after ~4 seconds OR on "Let's Play" tap
- Match status updates to `innings_1_in_progress`

---

### Step 5: Innings — Over & Bowler Rotation

**First over assignment:**
- The bowling captain either assigns the first bowler OR the first bowler is randomly selected from the bowling team
- Assigned bowler receives an FCM push notification: "It's your turn to bowl! Open Yorked 🏏"
- Tapping notification deep-links to the Bowling Screen

**Over completion:**
- After 6 legal deliveries, the over ends
- If 2 players per team with 4 overs: overs alternate automatically (Player 1 bowls over 1, Player 2 bowls over 2, etc.) — no captain input needed
- If more than 2 bowlers available, the bowling captain receives a notification to assign the next bowler: "Over complete — assign next bowler"
- The bowling captain sees a list of their team's bowlers with current figures and taps to assign
- Assigned bowler is notified

**Constraints (optional enforcement):**
- No bowler may bowl more than their share of overs (standard cricket rule: max overs = total overs / number of bowlers, rounded up)

---

### Step 6: Batting — Strike Rotation

- Two batsmen are always at the crease (Striker and Non-Striker)
- Opening batsmen are either assigned by batting captain or auto-assigned as first two players in the batting team list
- Opening batsmen both receive FCM notifications: "You are opening the batting for {Team Name}! 🏏"
- After each ball:
  - **Even runs (0, 2, 4, 6):** Same batsman on strike for next ball
  - **Odd runs (1, 3):** Ends swap — Non-Striker becomes Striker, receives FCM notification
  - **Last ball of over:** Ends swap regardless of runs — appropriate batsman notified
  - **Wicket:** New batsman comes in — next player from the batting order — receives FCM notification: "You're in! Time to bat 🏏"
  - **All out (last wicket falls):** Innings ends regardless of overs remaining

---

### Step 7: Each Ball Sequence

1. **Bowler** receives FCM notification → opens Bowling Screen → selects delivery type → confirms → delivery written to Firestore
2. **Striker batsman** receives FCM notification → opens Batting Screen → sees bowler name and bowling style (NOT the delivery) → selects shot → confirms → shot written to Firestore
3. **Node.js backend** detects both delivery and shot are set → runs resolution function → writes outcome to Firestore
4. **Ball Result Overlay** appears on all connected clients simultaneously via Firestore listener:
   - Large animated outcome text (e.g. "SIX! 🎉" or "WICKET! Bowled! 💥" or "Dot Ball")
   - Delivery vs Shot shown (e.g. "Yorker vs Slog")
   - Updated score
   - Overlay auto-dismisses after 3 seconds
5. Correct FCM notifications fire for the next ball

---

### Step 8: Innings Break

After all overs of the first innings or all wickets fallen:
- **Innings Break Screen** shown to all players
- Displays: "Team A scored {X}/{W} in {overs} overs — Target: {X+1} runs"
- Full batting scorecard (each batsman: runs, balls, 4s, 6s, dismissal info)
- Full bowling figures (each bowler: overs, maidens, runs, wickets, economy)
- Tap to continue (both teams must confirm or auto-advance after 10 seconds)
- Teams swap roles — second innings begins
- FCM notifications fire to opening batsmen and first bowler of second innings

---

### Step 9: Victory / Defeat

**Win conditions:**
| Scenario | Result |
|----------|--------|
| Team batting second reaches or passes target | Win by X wickets (wickets remaining) |
| Team batting second bowled out or overs end below target | Win by X runs |
| Scores equal at end | Tie — offer Super Over (optional) |

**Super Over (optional):**
- 1 over per side, same flow as a normal over
- If still tied after Super Over → match declared a tie

**Victory Screen shown to all players:**
- Winner banner with team badge and name
- Full scorecard both innings, expandable
- **Man of the Match** — auto-calculated: weighted formula (runs scored + wickets × 20 + economy bonus)
- Career stats for all players updated in Firestore (matches, wins/losses, runs, wickets, averages)
- **Share Result** button — generates pre-formatted WhatsApp-ready text: e.g. *"Team Yorked beat Team Blaze by 14 runs in a 5-over thriller! 🏏🔥 — Play at yorked.duckdns.org"*

---

## 9. Screens — Complete List

| Screen | Route | Description |
|--------|-------|-------------|
| Landing / Auth | `/` | Google Sign-In button |
| Profile Setup | `/profile/setup` | First-time attribute & role configuration |
| Dashboard | `/dashboard` | Active matches, create/join, history |
| Create Match | `/match/create` | Team setup, overs, player count |
| Lobby | `/match/{id}/lobby` | Real-time player joining |
| Coin Toss | `/match/{id}/toss` | Toss call and bat/bowl decision |
| Team Intro Splash | `/match/{id}/intro` | Animated team vs team splash |
| Match Scorecard | `/match/{id}/live` | Live scorecard for all players |
| Bowling Screen | `/match/{id}/bowl` | Delivery selection (bowler only) |
| Batting Screen | `/match/{id}/bat` | Shot selection (striker only) |
| Ball Result Overlay | (overlay on live screen) | Animated outcome display |
| Innings Break | `/match/{id}/break` | End-of-innings scorecard |
| Victory / Defeat | `/match/{id}/result` | Final result, stats, share |
| Player Profile | `/profile` | Career stats, edit attributes |
| Match History | `/history` | Past match results |

---

## 10. Firestore Data Structure

```
/users/{uid}
  displayName: string
  avatarId: string
  role: "batsman" | "bowler" | "allrounder"
  bowlingStyle: "fast" | "medium" | "offspin" | "legspin"
  attributes: {
    batting: { technique: int, power: int, timing: int }
    bowling: { accuracy: int, pace: int, variation: int }
  }
  careerStats: {
    matches: int, wins: int, losses: int, ties: int
    runsScored: int, ballsFaced: int, highestScore: int
    fifties: int, hundreds: int, fours: int, sixes: int
    wicketsTaken: int, ballsBowled: int, runsConceded: int
    catches: int
  }
  fcmToken: string (updated on each login)
  createdAt: timestamp
  updatedAt: timestamp

/matches/{matchId}
  status: "lobby_open" | "toss_pending" | "pre_match" | "innings_1" | "innings_break" | "innings_2" | "complete"
  createdAt: timestamp
  overs: int
  playersPerTeam: int
  teamA: {
    name: string
    iconId: string
    captainUid: string
    players: [uid, uid, ...]  // ordered batting list
  }
  teamB: {
    name: string
    iconId: string
    captainUid: string
    players: [uid, uid, ...]
  }
  toss: {
    callerUid: string
    call: "heads" | "tails"
    result: "heads" | "tails"
    winnerTeam: "A" | "B"
    decision: "bat" | "bowl"
  }
  innings1: { ...inningsObject }
  innings2: { ...inningsObject }
  result: {
    winnerTeam: "A" | "B" | "tie"
    margin: int
    marginType: "wickets" | "runs"
    manOfMatchUid: string
  }

// Innings object structure
inningsObject: {
  battingTeam: "A" | "B"
  bowlingTeam: "A" | "B"
  totalRuns: int
  totalWickets: int
  oversBowled: float  // e.g. 3.4 = 3 overs 4 balls
  currentOver: int    // 0-indexed
  currentBall: int    // 0-indexed within over
  strikerUid: string
  nonStrikerUid: string
  currentBowlerUid: string
  batsmen: {
    [uid]: { runs: int, balls: int, fours: int, sixes: int, status: "in" | "out" | "notyet", dismissal: string }
  }
  bowlers: {
    [uid]: { overs: int, balls: int, maidens: int, runs: int, wickets: int }
  }
  overHistory: [ [ball1, ball2, ...], ... ]  // array of overs, each an array of ball outcomes
  pendingBall: {
    delivery: string | null   // set by bowler
    shot: string | null       // set by batsman
    resolvedAt: timestamp | null
  }
}

/matches/{matchId}/balls/{ballId}
  inningsNumber: 1 | 2
  over: int
  ballInOver: int
  bowlerUid: string
  strikerUid: string
  delivery: string
  shot: string
  outcome: string   // "DOT" | "1" | "2" | "3" | "4" | "6" | "W_BOWLED" | etc.
  wicketType: string | null
  runsScored: int
  timestamp: timestamp
```

---

## 11. Firebase Cloud Messaging (Push Notifications)

### Setup
- Service Worker (`firebase-messaging-sw.js`) registered in the Flutter Web app for background message handling
- FCM tokens collected on each login and stored in `/users/{uid}/fcmToken`
- Tokens refreshed automatically when they change

### Notification Triggers (fired by Node.js backend)

| Event | Recipient | Message |
|-------|-----------|---------|
| Bowler's turn to bowl | Current bowler | "Your turn to bowl! Open Yorked 🏏" |
| Batsman's turn to bat | Current striker | "Your turn to bat! {Bowler} is bowling 🏏" |
| New batsman in | Incoming batsman | "You're in! Time to bat for {Team} 🏏" |
| Over complete — assign bowler | Bowling captain | "Over complete — pick your next bowler 🎯" |
| Lobby full | Both captains | "All players joined — ready to toss!" |
| Toss caller selected | Calling captain | "You've won the toss call — Heads or Tails?" |
| Innings break | All players | "Innings complete! {Team} scored {X}/{W}" |
| Match complete | All players | "{Team} wins! Check the result 🏆" |

### Deep Links
All notifications carry a `matchId` and `screen` payload so tapping the notification navigates directly to the correct screen.

---

## 12. Node.js Backend — API Endpoints

Base URL: `https://yorked.duckdns.org/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/match/resolve-ball` | Triggered when both delivery and shot are set. Reads from Firestore, resolves outcome, writes result, triggers notifications |
| POST | `/match/notify` | Internal — sends FCM to a specific UID with a message and deep link |
| POST | `/match/create` | Creates match document in Firestore |
| GET | `/match/{matchId}/state` | Returns current match state (backup for clients that miss real-time updates) |
| POST | `/match/{matchId}/assign-bowler` | Captain assigns next bowler |

### Ball Resolution Function (core logic)
```
Input: matchId, inningsNumber, over, ballInOver
1. Read delivery from Firestore pendingBall.delivery
2. Read shot from Firestore pendingBall.shot
3. Look up bowler's bowling attributes from /users/{bowlerUid}
4. Look up batsman's batting attributes from /users/{strikerUid}
5. Get base probability table for (delivery, shot) combination
6. Apply attribute modifiers to shift probabilities
7. Random weighted selection of outcome
8. Write outcome to /matches/{matchId}/balls/{ballId}
9. Update innings state (score, wickets, striker, over progress)
10. Determine next action (next ball, over change, wicket, innings end)
11. Trigger appropriate FCM notifications
12. Return outcome to all clients via Firestore update (real-time listeners pick this up)
```

---

## 13. Real-Time Architecture

- Flutter Web app maintains a **Firestore real-time listener** on the active match document
- Any write to the match document (delivery set, shot set, outcome resolved, score updated) is instantly pushed to all connected clients
- No polling required
- Players who are offline (tab closed) miss nothing — when they open the URL, they read the latest Firestore state and see exactly where the match is
- The pending ball state (`pendingBall.delivery` and `pendingBall.shot`) drives the UI — if delivery is set but shot is null, only the batting screen is active; otherwise only the bowling screen is active

---

## 14. Docker Deployment on Oracle VM

The cricket backend is added as a new Docker service alongside the existing audit system. The existing `docker-compose.yml` is extended (not replaced).

### New services added to docker-compose.yml
```yaml
cricket-backend:
  build: ./yorked-backend
  container_name: cricket-backend
  restart: always
  environment:
    - FIREBASE_PROJECT_ID=yorked
    - FIREBASE_SERVICE_ACCOUNT_PATH=/secrets/serviceAccountKey.json
    - PORT=3000
  volumes:
    - ./secrets:/secrets:ro
  networks:
    - caddy_net

# Caddy config updated to add:
# yorked.duckdns.org {
#   reverse_proxy cricket-backend:3000
# }
```

### Firebase Service Account
- Download `serviceAccountKey.json` from Firebase Console → Project Settings → Service Accounts
- Store on VM at `/home/opc/secrets/serviceAccountKey.json`
- Mount as read-only volume into the container
- Never commit to version control

---

## 15. Flutter Web Project Structure

```
yorked/
├── lib/
│   ├── main.dart
│   ├── firebase_options.dart          # Generated by FlutterFire CLI
│   ├── models/
│   │   ├── player.dart
│   │   ├── match.dart
│   │   ├── innings.dart
│   │   └── ball.dart
│   ├── services/
│   │   ├── auth_service.dart          # Firebase Auth, Google Sign-In
│   │   ├── firestore_service.dart     # All Firestore reads/writes
│   │   ├── notification_service.dart  # FCM token management, foreground handling
│   │   └── api_service.dart           # HTTP calls to Node.js backend
│   ├── providers/                     # State management (Riverpod or Provider)
│   │   ├── match_provider.dart
│   │   └── auth_provider.dart
│   ├── screens/
│   │   ├── landing_screen.dart
│   │   ├── profile_setup_screen.dart
│   │   ├── dashboard_screen.dart
│   │   ├── create_match_screen.dart
│   │   ├── lobby_screen.dart
│   │   ├── toss_screen.dart
│   │   ├── intro_splash_screen.dart
│   │   ├── match_live_screen.dart
│   │   ├── bowling_screen.dart
│   │   ├── batting_screen.dart
│   │   ├── innings_break_screen.dart
│   │   ├── victory_screen.dart
│   │   └── profile_screen.dart
│   └── widgets/
│       ├── scoreboard_widget.dart
│       ├── ball_result_overlay.dart
│       ├── player_card_widget.dart
│       ├── delivery_card_widget.dart
│       ├── shot_card_widget.dart
│       └── team_badge_widget.dart
├── web/
│   ├── index.html
│   └── firebase-messaging-sw.js       # Service Worker for background FCM
└── pubspec.yaml
```

### Key Flutter Dependencies
```yaml
dependencies:
  firebase_core: latest
  firebase_auth: latest
  cloud_firestore: latest
  firebase_messaging: latest
  google_sign_in: latest
  go_router: latest          # URL-based navigation for web
  riverpod or provider: latest
  http: latest               # HTTP calls to Node.js backend
  animate_do: latest         # Animations for splash/overlays
```

---

## 16. Node.js Backend Project Structure

```
yorked-backend/
├── src/
│   index.js                  # Express app entry point
│   routes/
│     match.js                # Match-related routes
│     notify.js               # FCM notification routes
│   services/
│     resolution.js           # Ball resolution logic + probability tables
│     notifications.js        # FCM send functions
│     firestore.js            # Firestore read/write helpers
│   data/
│     probability_matrix.js   # Base probability tables for all delivery/shot combos
│     attribute_modifiers.js  # How attributes shift probabilities
├── secrets/                   # Mounted from host, not committed
│   serviceAccountKey.json
├── Dockerfile
├── package.json
└── .env
```

---

## 17. Edge Cases & Handling

| Scenario | Handling |
|----------|----------|
| Player leaves lobby before it fills | Slot freed, shown as empty again |
| Player closes browser mid-match | Match state preserved in Firestore; they rejoin via URL and see current state |
| Bowler/batsman takes >24h to act | No timeout enforced — async is by design. Future enhancement: optional match timeout setting |
| All wickets fall before overs complete | Innings ends immediately |
| Only 1 player per team | Valid — 1v1 match. Same bowler bowls all overs for their team |
| Odd runs on last ball of innings | Ends swap, but innings ends anyway — no effect on next ball |
| Team bowled out for 0 | Valid — second team wins by 10 wickets (or all wickets remaining) |
| FCM token invalid/expired | Catch delivery failure, log it — don't crash. Refresh token on next login |
| Two players try to join same slot | Firestore transaction used for slot assignment — first write wins |
| Super Over | Optional — if enabled at match creation, triggered on tie. 1 over per side, both captain-assigned batsmen and bowler, same resolution flow |

---

## 18. MVP Scope vs Future Enhancements

### MVP (Build First)
- Google Sign-In and player profiles
- Create match → lobby → toss → intro → match → innings break → result
- Real-time Firestore updates
- FCM push notifications
- Full ball resolution with probability matrix
- Scoreboard, batting screen, bowling screen
- Career stats update after match
- Share result text

### Future Enhancements
- Match timeout with automated forfeiture
- Stat evolution over time (attributes shift slightly based on performance)
- Tournament mode across multiple matches
- Spectator mode (friends who aren't playing can watch live)
- Chat/reactions within the match screen
- Animated pitch graphic showing delivery landing zone
- Leaderboard across all friends
- Sound effects for boundaries, wickets
- Replay of over ball-by-ball after each over completes

---

## 19. Environment Variables

### Node.js Backend (.env)
```
PORT=3000
FIREBASE_PROJECT_ID=yorked
FIREBASE_SERVICE_ACCOUNT_PATH=/secrets/serviceAccountKey.json
```

### Flutter Web (firebase_options.dart — generated by FlutterFire CLI)
```dart
// Generated from Firebase Console config object
static const FirebaseOptions web = FirebaseOptions(
  apiKey: "...",
  authDomain: "yorked.firebaseapp.com",
  projectId: "yorked",
  storageBucket: "yorked.appspot.com",
  messagingSenderId: "...",
  appId: "...",
);
```

---

## 20. Summary of What Has Been Completed

The following has been decided and confirmed prior to implementation:

- App name: **Yorked**
- DuckDNS subdomain: **yorked.duckdns.org** (to be created, same IP as audit system `140.245.57.223`)
- Firebase project: **Yorked** (to be created at console.firebase.google.com)
- Firebase Auth: **Google Sign-In enabled**
- Firestore: **Region asia-southeast1, test mode initially**
- Oracle VM: Running, SSH-accessible, Node.js 20 + Docker already installed, existing audit system (`aeroaudit.duckdns.org`) running on same VM via Caddy and Docker — must not be disrupted
- Flutter Web chosen as the frontend framework
- Full game mechanic design finalised (roles, attributes, delivery types, shot types, probability resolution, wicket types, over rotation, strike rotation, innings flow, win conditions)

---

*Document prepared for AI planning agent. All game mechanics, infrastructure, screens, data models, notification flows, and deployment details are finalised and described above. The planning agent should use this document to produce a phased implementation plan covering: Firebase setup, Flutter project scaffold, Firestore schema implementation, ball resolution engine, FCM integration, Node.js backend, Docker deployment, and Caddy routing configuration.*
