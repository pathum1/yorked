// Base probability weights for each Delivery vs Shot combination
// Normalized at runtime.
// Shots: Defensive, Cover Drive, Straight Drive, Pull Shot, Hook Shot, Cut Shot, Sweep, Slog
// Deliveries: Yorker, Bouncer, Outswinger, Inswinger, Good Length, Slower Ball, Full Toss, Off-spin, Tossed Up, Slider, Arm Ball, Leg-spin, Googly, Flipper

const probabilityMatrix = {
  // --- YORKER ---
  "Yorker|Defensive": { DOT: 60, "1": 30, "2": 5, "3": 0, "4": 0, "6": 0, W_BOWLED: 3, W_CAUGHT: 1, W_LBW: 1, W_STUMPED: 0 },
  "Yorker|Cover Drive": { DOT: 30, "1": 20, "2": 10, "3": 2, "4": 15, "6": 0, W_BOWLED: 15, W_CAUGHT: 5, W_LBW: 3, W_STUMPED: 0 },
  "Yorker|Straight Drive": { DOT: 20, "1": 20, "2": 15, "3": 2, "4": 20, "6": 0, W_BOWLED: 15, W_CAUGHT: 5, W_LBW: 3, W_STUMPED: 0 },
  "Yorker|Pull Shot": { DOT: 40, "1": 10, "2": 0, "3": 0, "4": 0, "6": 0, W_BOWLED: 30, W_CAUGHT: 10, W_LBW: 10, W_STUMPED: 0 },
  "Yorker|Hook Shot": { DOT: 40, "1": 10, "2": 0, "3": 0, "4": 0, "6": 0, W_BOWLED: 30, W_CAUGHT: 10, W_LBW: 10, W_STUMPED: 0 },
  "Yorker|Cut Shot": { DOT: 40, "1": 10, "2": 0, "3": 0, "4": 0, "6": 0, W_BOWLED: 30, W_CAUGHT: 10, W_LBW: 10, W_STUMPED: 0 },
  "Yorker|Sweep": { DOT: 20, "1": 10, "2": 5, "3": 0, "4": 5, "6": 0, W_BOWLED: 35, W_CAUGHT: 10, W_LBW: 15, W_STUMPED: 0 },
  "Yorker|Slog": { DOT: 10, "1": 5, "2": 3, "3": 0, "4": 5, "6": 8, W_BOWLED: 45, W_CAUGHT: 15, W_LBW: 9, W_STUMPED: 0 },

  // --- BOUNCER ---
  "Bouncer|Defensive": { DOT: 70, "1": 10, "2": 0, "3": 0, "4": 0, "6": 0, W_BOWLED: 0, W_CAUGHT: 15, W_LBW: 0, W_STUMPED: 5 },
  "Bouncer|Cover Drive": { DOT: 50, "1": 10, "2": 0, "3": 0, "4": 0, "6": 0, W_BOWLED: 0, W_CAUGHT: 30, W_LBW: 0, W_STUMPED: 10 },
  "Bouncer|Straight Drive": { DOT: 50, "1": 10, "2": 0, "3": 0, "4": 0, "6": 0, W_BOWLED: 0, W_CAUGHT: 30, W_LBW: 0, W_STUMPED: 10 },
  "Bouncer|Pull Shot": { DOT: 10, "1": 10, "2": 15, "3": 0, "4": 25, "6": 20, W_BOWLED: 0, W_CAUGHT: 20, W_LBW: 0, W_STUMPED: 0 },
  "Bouncer|Hook Shot": { DOT: 10, "1": 10, "2": 10, "3": 0, "4": 20, "6": 30, W_BOWLED: 0, W_CAUGHT: 20, W_LBW: 0, W_STUMPED: 0 },
  "Bouncer|Cut Shot": { DOT: 20, "1": 10, "2": 10, "3": 2, "4": 25, "6": 10, W_BOWLED: 0, W_CAUGHT: 20, W_LBW: 0, W_STUMPED: 3 },
  "Bouncer|Sweep": { DOT: 50, "1": 5, "2": 0, "3": 0, "4": 0, "6": 0, W_BOWLED: 0, W_CAUGHT: 35, W_LBW: 0, W_STUMPED: 10 },
  "Bouncer|Slog": { DOT: 20, "1": 5, "2": 5, "3": 0, "4": 15, "6": 20, W_BOWLED: 0, W_CAUGHT: 30, W_LBW: 0, W_STUMPED: 5 },

  // --- OUTSWINGER ---
  "Outswinger|Defensive": { DOT: 65, "1": 20, "2": 2, "3": 0, "4": 1, "6": 0, W_BOWLED: 2, W_CAUGHT: 8, W_LBW: 2, W_STUMPED: 0 },
  "Outswinger|Cover Drive": { DOT: 20, "1": 15, "2": 15, "3": 3, "4": 25, "6": 2, W_BOWLED: 2, W_CAUGHT: 15, W_LBW: 3, W_STUMPED: 0 },
  "Outswinger|Straight Drive": { DOT: 25, "1": 15, "2": 10, "3": 2, "4": 20, "6": 5, W_BOWLED: 5, W_CAUGHT: 15, W_LBW: 3, W_STUMPED: 0 },
  "Outswinger|Pull Shot": { DOT: 30, "1": 15, "2": 10, "3": 0, "4": 15, "6": 5, W_BOWLED: 5, W_CAUGHT: 15, W_LBW: 5, W_STUMPED: 0 },
  "Outswinger|Hook Shot": { DOT: 35, "1": 10, "2": 5, "3": 0, "4": 10, "6": 10, W_BOWLED: 5, W_CAUGHT: 20, W_LBW: 5, W_STUMPED: 0 },
  "Outswinger|Cut Shot": { DOT: 20, "1": 20, "2": 15, "3": 2, "4": 25, "6": 5, W_BOWLED: 2, W_CAUGHT: 10, W_LBW: 1, W_STUMPED: 0 },
  "Outswinger|Sweep": { DOT: 35, "1": 10, "2": 5, "3": 0, "4": 10, "6": 0, W_BOWLED: 10, W_CAUGHT: 15, W_LBW: 15, W_STUMPED: 0 },
  "Outswinger|Slog": { DOT: 15, "1": 10, "2": 5, "3": 0, "4": 20, "6": 25, W_BOWLED: 5, W_CAUGHT: 20, W_LBW: 0, W_STUMPED: 0 },

  // --- INSWINGER ---
  "Inswinger|Defensive": { DOT: 60, "1": 20, "2": 5, "3": 0, "4": 2, "6": 0, W_BOWLED: 5, W_CAUGHT: 3, W_LBW: 5, W_STUMPED: 0 },
  "Inswinger|Cover Drive": { DOT: 35, "1": 15, "2": 5, "3": 0, "4": 10, "6": 0, W_BOWLED: 10, W_CAUGHT: 10, W_LBW: 15, W_STUMPED: 0 },
  "Inswinger|Straight Drive": { DOT: 20, "1": 20, "2": 15, "3": 2, "4": 25, "6": 3, W_BOWLED: 5, W_CAUGHT: 5, W_LBW: 5, W_STUMPED: 0 },
  "Inswinger|Pull Shot": { DOT: 20, "1": 15, "2": 15, "3": 2, "4": 20, "6": 15, W_BOWLED: 3, W_CAUGHT: 8, W_LBW: 2, W_STUMPED: 0 },
  "Inswinger|Hook Shot": { DOT: 25, "1": 10, "2": 10, "3": 0, "4": 15, "6": 25, W_BOWLED: 5, W_CAUGHT: 8, W_LBW: 2, W_STUMPED: 0 },
  "Inswinger|Cut Shot": { DOT: 40, "1": 10, "2": 5, "3": 0, "4": 5, "6": 0, W_BOWLED: 15, W_CAUGHT: 15, W_LBW: 10, W_STUMPED: 0 },
  "Inswinger|Sweep": { DOT: 20, "1": 20, "2": 10, "3": 2, "4": 20, "6": 5, W_BOWLED: 5, W_CAUGHT: 8, W_LBW: 10, W_STUMPED: 0 },
  "Inswinger|Slog": { DOT: 15, "1": 10, "2": 5, "3": 0, "4": 20, "6": 25, W_BOWLED: 10, W_CAUGHT: 10, W_LBW: 5, W_STUMPED: 0 },

  // --- GOOD LENGTH ---
  "Good Length|Defensive": { DOT: 70, "1": 20, "2": 5, "3": 0, "4": 0, "6": 0, W_BOWLED: 2, W_CAUGHT: 2, W_LBW: 1, W_STUMPED: 0 },
  "Good Length|Cover Drive": { DOT: 25, "1": 20, "2": 15, "3": 2, "4": 25, "6": 2, W_BOWLED: 3, W_CAUGHT: 6, W_LBW: 2, W_STUMPED: 0 },
  "Good Length|Straight Drive": { DOT: 25, "1": 22, "2": 15, "3": 2, "4": 25, "6": 2, W_BOWLED: 3, W_CAUGHT: 4, W_LBW: 2, W_STUMPED: 0 },
  "Good Length|Pull Shot": { DOT: 30, "1": 20, "2": 10, "3": 1, "4": 15, "6": 5, W_BOWLED: 4, W_CAUGHT: 12, W_LBW: 3, W_STUMPED: 0 },
  "Good Length|Hook Shot": { DOT: 35, "1": 15, "2": 5, "3": 0, "4": 10, "6": 10, W_BOWLED: 5, W_CAUGHT: 15, W_LBW: 5, W_STUMPED: 0 },
  "Good Length|Cut Shot": { DOT: 25, "1": 20, "2": 15, "3": 1, "4": 20, "6": 5, W_BOWLED: 3, W_CAUGHT: 9, W_LBW: 2, W_STUMPED: 0 },
  "Good Length|Sweep": { DOT: 30, "1": 15, "2": 10, "3": 0, "4": 15, "6": 5, W_BOWLED: 5, W_CAUGHT: 10, W_LBW: 10, W_STUMPED: 0 },
  "Good Length|Slog": { DOT: 15, "1": 10, "2": 5, "3": 0, "4": 20, "6": 25, W_BOWLED: 10, W_CAUGHT: 10, W_LBW: 5, W_STUMPED: 0 },

  // --- SLOWER BALL ---
  "Slower Ball|Defensive": { DOT: 50, "1": 35, "2": 10, "3": 0, "4": 2, "6": 0, W_BOWLED: 1, W_CAUGHT: 1, W_LBW: 1, W_STUMPED: 0 },
  "Slower Ball|Cover Drive": { DOT: 30, "1": 20, "2": 10, "3": 2, "4": 15, "6": 5, W_BOWLED: 5, W_CAUGHT: 10, W_LBW: 3, W_STUMPED: 0 },
  "Slower Ball|Straight Drive": { DOT: 30, "1": 20, "2": 10, "3": 2, "4": 15, "6": 5, W_BOWLED: 5, W_CAUGHT: 10, W_LBW: 3, W_STUMPED: 0 },
  "Slower Ball|Pull Shot": { DOT: 20, "1": 15, "2": 10, "3": 2, "4": 20, "6": 15, W_BOWLED: 5, W_CAUGHT: 10, W_LBW: 3, W_STUMPED: 0 },
  "Slower Ball|Hook Shot": { DOT: 25, "1": 15, "2": 10, "3": 1, "4": 15, "6": 20, W_BOWLED: 5, W_CAUGHT: 6, W_LBW: 3, W_STUMPED: 0 },
  "Slower Ball|Cut Shot": { DOT: 25, "1": 20, "2": 10, "3": 2, "4": 20, "6": 5, W_BOWLED: 3, W_CAUGHT: 12, W_LBW: 3, W_STUMPED: 0 },
  "Slower Ball|Sweep": { DOT: 25, "1": 20, "2": 15, "3": 1, "4": 15, "6": 5, W_BOWLED: 5, W_CAUGHT: 9, W_LBW: 5, W_STUMPED: 0 },
  "Slower Ball|Slog": { DOT: 15, "1": 10, "2": 5, "3": 0, "4": 15, "6": 35, W_BOWLED: 5, W_CAUGHT: 15, W_LBW: 0, W_STUMPED: 0 },

  // --- FULL TOSS ---
  "Full Toss|Defensive": { DOT: 40, "1": 40, "2": 10, "3": 0, "4": 5, "6": 0, W_BOWLED: 2, W_CAUGHT: 3, W_LBW: 0, W_STUMPED: 0 },
  "Full Toss|Cover Drive": { DOT: 10, "1": 15, "2": 15, "3": 5, "4": 40, "6": 10, W_BOWLED: 1, W_CAUGHT: 4, W_LBW: 0, W_STUMPED: 0 },
  "Full Toss|Straight Drive": { DOT: 10, "1": 15, "2": 15, "3": 5, "4": 40, "6": 10, W_BOWLED: 1, W_CAUGHT: 4, W_LBW: 0, W_STUMPED: 0 },
  "Full Toss|Pull Shot": { DOT: 15, "1": 15, "2": 15, "3": 2, "4": 25, "6": 20, W_BOWLED: 1, W_CAUGHT: 7, W_LBW: 0, W_STUMPED: 0 },
  "Full Toss|Hook Shot": { DOT: 20, "1": 15, "2": 10, "3": 2, "4": 20, "6": 25, W_BOWLED: 1, W_CAUGHT: 7, W_LBW: 0, W_STUMPED: 0 },
  "Full Toss|Cut Shot": { DOT: 15, "1": 20, "2": 15, "3": 2, "4": 30, "6": 10, W_BOWLED: 1, W_CAUGHT: 7, W_LBW: 0, W_STUMPED: 0 },
  "Full Toss|Sweep": { DOT: 20, "1": 15, "2": 15, "3": 2, "4": 25, "6": 15, W_BOWLED: 2, W_CAUGHT: 6, W_LBW: 0, W_STUMPED: 0 },
  "Full Toss|Slog": { DOT: 5, "1": 10, "2": 5, "3": 0, "4": 20, "6": 50, W_BOWLED: 2, W_CAUGHT: 8, W_LBW: 0, W_STUMPED: 0 },

  // --- OFF-SPIN ---
  "Off-spin|Defensive": { DOT: 70, "1": 22, "2": 3, "3": 0, "4": 1, "6": 0, W_BOWLED: 1, W_CAUGHT: 2, W_LBW: 1, W_STUMPED: 0 },
  "Off-spin|Cover Drive": { DOT: 30, "1": 25, "2": 15, "3": 3, "4": 15, "6": 2, W_BOWLED: 3, W_CAUGHT: 5, W_LBW: 2, W_STUMPED: 0 },
  "Off-spin|Straight Drive": { DOT: 25, "1": 25, "2": 15, "3": 3, "4": 20, "6": 5, W_BOWLED: 2, W_CAUGHT: 3, W_LBW: 2, W_STUMPED: 0 },
  "Off-spin|Pull Shot": { DOT: 30, "1": 20, "2": 10, "3": 2, "4": 20, "6": 10, W_BOWLED: 2, W_CAUGHT: 6, W_LBW: 0, W_STUMPED: 0 },
  "Off-spin|Hook Shot": { DOT: 40, "1": 15, "2": 5, "3": 0, "4": 15, "6": 15, W_BOWLED: 2, W_CAUGHT: 8, W_LBW: 0, W_STUMPED: 0 },
  "Off-spin|Cut Shot": { DOT: 30, "1": 20, "2": 15, "3": 2, "4": 20, "6": 5, W_BOWLED: 2, W_CAUGHT: 6, W_LBW: 0, W_STUMPED: 0 },
  "Off-spin|Sweep": { DOT: 20, "1": 20, "2": 15, "3": 2, "4": 25, "6": 10, W_BOWLED: 3, W_CAUGHT: 3, W_LBW: 2, W_STUMPED: 0 },
  "Off-spin|Slog": { DOT: 15, "1": 10, "2": 5, "3": 0, "4": 20, "6": 30, W_BOWLED: 5, W_CAUGHT: 10, W_LBW: 0, W_STUMPED: 5 },

  // --- TOSSED UP ---
  "Tossed Up|Defensive": { DOT: 50, "1": 30, "2": 10, "3": 0, "4": 2, "6": 0, W_BOWLED: 2, W_CAUGHT: 4, W_LBW: 0, W_STUMPED: 2 },
  "Tossed Up|Cover Drive": { DOT: 20, "1": 20, "2": 15, "3": 3, "4": 25, "6": 10, W_BOWLED: 1, W_CAUGHT: 4, W_LBW: 0, W_STUMPED: 2 },
  "Tossed Up|Straight Drive": { DOT: 15, "1": 20, "2": 15, "3": 3, "4": 25, "6": 15, W_BOWLED: 1, W_CAUGHT: 4, W_LBW: 0, W_STUMPED: 2 },
  "Tossed Up|Pull Shot": { DOT: 30, "1": 15, "2": 10, "3": 0, "4": 20, "6": 15, W_BOWLED: 2, W_CAUGHT: 8, W_LBW: 0, W_STUMPED: 0 },
  "Tossed Up|Hook Shot": { DOT: 40, "1": 10, "2": 5, "3": 0, "4": 15, "6": 20, W_BOWLED: 2, W_CAUGHT: 8, W_LBW: 0, W_STUMPED: 0 },
  "Tossed Up|Cut Shot": { DOT: 35, "1": 15, "2": 10, "3": 0, "4": 20, "6": 10, W_BOWLED: 2, W_CAUGHT: 8, W_LBW: 0, W_STUMPED: 0 },
  "Tossed Up|Sweep": { DOT: 25, "1": 20, "2": 10, "3": 2, "4": 20, "6": 15, W_BOWLED: 2, W_CAUGHT: 4, W_LBW: 0, W_STUMPED: 2 },
  "Tossed Up|Slog": { DOT: 10, "1": 5, "2": 5, "3": 0, "4": 20, "6": 40, W_BOWLED: 2, W_CAUGHT: 10, W_LBW: 0, W_STUMPED: 8 },

  // --- SLIDER ---
  "Slider|Defensive": { DOT: 65, "1": 20, "2": 5, "3": 0, "4": 1, "6": 0, W_BOWLED: 3, W_CAUGHT: 2, W_LBW: 4, W_STUMPED: 0 },
  "Slider|Cover Drive": { DOT: 35, "1": 20, "2": 10, "3": 2, "4": 15, "6": 2, W_BOWLED: 4, W_CAUGHT: 6, W_LBW: 6, W_STUMPED: 0 },
  "Slider|Straight Drive": { DOT: 30, "1": 20, "2": 10, "3": 2, "4": 20, "6": 3, W_BOWLED: 4, W_CAUGHT: 5, W_LBW: 6, W_STUMPED: 0 },
  "Slider|Pull Shot": { DOT: 25, "1": 20, "2": 15, "3": 2, "4": 20, "6": 10, W_BOWLED: 2, W_CAUGHT: 4, W_LBW: 2, W_STUMPED: 0 },
  "Slider|Hook Shot": { DOT: 35, "1": 15, "2": 10, "3": 0, "4": 15, "6": 15, W_BOWLED: 2, W_CAUGHT: 6, W_LBW: 2, W_STUMPED: 0 },
  "Slider|Cut Shot": { DOT: 40, "1": 15, "2": 10, "3": 0, "4": 15, "6": 5, W_BOWLED: 4, W_CAUGHT: 6, W_LBW: 5, W_STUMPED: 0 },
  "Slider|Sweep": { DOT: 25, "1": 25, "2": 15, "3": 2, "4": 20, "6": 5, W_BOWLED: 2, W_CAUGHT: 4, W_LBW: 2, W_STUMPED: 0 },
  "Slider|Slog": { DOT: 20, "1": 10, "2": 5, "3": 0, "4": 20, "6": 25, W_BOWLED: 10, W_CAUGHT: 5, W_LBW: 5, W_STUMPED: 0 },

  // --- ARM BALL ---
  "Arm Ball|Defensive": { DOT: 65, "1": 20, "2": 5, "3": 0, "4": 1, "6": 0, W_BOWLED: 3, W_CAUGHT: 2, W_LBW: 4, W_STUMPED: 0 },
  "Arm Ball|Cover Drive": { DOT: 35, "1": 20, "2": 10, "3": 2, "4": 15, "6": 2, W_BOWLED: 4, W_CAUGHT: 6, W_LBW: 6, W_STUMPED: 0 },
  "Arm Ball|Straight Drive": { DOT: 30, "1": 20, "2": 10, "3": 2, "4": 20, "6": 3, W_BOWLED: 4, W_CAUGHT: 5, W_LBW: 6, W_STUMPED: 0 },
  "Arm Ball|Pull Shot": { DOT: 25, "1": 20, "2": 15, "3": 2, "4": 20, "6": 10, W_BOWLED: 2, W_CAUGHT: 4, W_LBW: 2, W_STUMPED: 0 },
  "Arm Ball|Hook Shot": { DOT: 35, "1": 15, "2": 10, "3": 0, "4": 15, "6": 15, W_BOWLED: 2, W_CAUGHT: 6, W_LBW: 2, W_STUMPED: 0 },
  "Arm Ball|Cut Shot": { DOT: 40, "1": 15, "2": 10, "3": 0, "4": 15, "6": 5, W_BOWLED: 4, W_CAUGHT: 6, W_LBW: 5, W_STUMPED: 0 },
  "Arm Ball|Sweep": { DOT: 25, "1": 25, "2": 15, "3": 2, "4": 20, "6": 5, W_BOWLED: 2, W_CAUGHT: 4, W_LBW: 2, W_STUMPED: 0 },
  "Arm Ball|Slog": { DOT: 20, "1": 10, "2": 5, "3": 0, "4": 20, "6": 25, W_BOWLED: 10, W_CAUGHT: 5, W_LBW: 5, W_STUMPED: 0 },

  // --- LEG-SPIN ---
  "Leg-spin|Defensive": { DOT: 70, "1": 22, "2": 3, "3": 0, "4": 1, "6": 0, W_BOWLED: 1, W_CAUGHT: 2, W_LBW: 1, W_STUMPED: 0 },
  "Leg-spin|Cover Drive": { DOT: 25, "1": 25, "2": 15, "3": 3, "4": 20, "6": 5, W_BOWLED: 2, W_CAUGHT: 3, W_LBW: 2, W_STUMPED: 0 },
  "Leg-spin|Straight Drive": { DOT: 25, "1": 25, "2": 15, "3": 3, "4": 20, "6": 5, W_BOWLED: 2, W_CAUGHT: 3, W_LBW: 2, W_STUMPED: 0 },
  "Leg-spin|Pull Shot": { DOT: 30, "1": 20, "2": 10, "3": 2, "4": 20, "6": 10, W_BOWLED: 2, W_CAUGHT: 6, W_LBW: 0, W_STUMPED: 0 },
  "Leg-spin|Hook Shot": { DOT: 40, "1": 15, "2": 5, "3": 0, "4": 15, "6": 15, W_BOWLED: 2, W_CAUGHT: 8, W_LBW: 0, W_STUMPED: 0 },
  "Leg-spin|Cut Shot": { DOT: 25, "1": 25, "2": 15, "3": 2, "4": 20, "6": 5, W_BOWLED: 2, W_CAUGHT: 4, W_LBW: 2, W_STUMPED: 0 },
  "Leg-spin|Sweep": { DOT: 20, "1": 20, "2": 15, "3": 2, "4": 25, "6": 10, W_BOWLED: 3, W_CAUGHT: 3, W_LBW: 2, W_STUMPED: 0 },
  "Leg-spin|Slog": { DOT: 15, "1": 10, "2": 5, "3": 0, "4": 20, "6": 30, W_BOWLED: 5, W_CAUGHT: 10, W_LBW: 0, W_STUMPED: 5 },

  // --- GOOGLY ---
  "Googly|Defensive": { DOT: 60, "1": 20, "2": 2, "3": 0, "4": 1, "6": 0, W_BOWLED: 5, W_CAUGHT: 2, W_LBW: 8, W_STUMPED: 2 },
  "Googly|Cover Drive": { DOT: 40, "1": 15, "2": 10, "3": 2, "4": 10, "6": 2, W_BOWLED: 6, W_CAUGHT: 5, W_LBW: 8, W_STUMPED: 2 },
  "Googly|Straight Drive": { DOT: 35, "1": 20, "2": 10, "3": 2, "4": 15, "6": 2, W_BOWLED: 5, W_CAUGHT: 3, W_LBW: 6, W_STUMPED: 2 },
  "Googly|Pull Shot": { DOT: 25, "1": 20, "2": 15, "3": 2, "4": 20, "6": 10, W_BOWLED: 3, W_CAUGHT: 3, W_LBW: 2, W_STUMPED: 0 },
  "Googly|Hook Shot": { DOT: 35, "1": 15, "2": 10, "3": 0, "4": 15, "6": 15, W_BOWLED: 3, W_CAUGHT: 5, W_LBW: 2, W_STUMPED: 0 },
  "Googly|Cut Shot": { DOT: 45, "1": 15, "2": 10, "3": 0, "4": 15, "6": 5, W_BOWLED: 4, W_CAUGHT: 6, W_LBW: 0, W_STUMPED: 0 },
  "Googly|Sweep": { DOT: 30, "1": 15, "2": 10, "3": 2, "4": 20, "6": 10, W_BOWLED: 5, W_CAUGHT: 3, W_LBW: 5, W_STUMPED: 0 },
  "Googly|Slog": { DOT: 25, "1": 10, "2": 5, "3": 0, "4": 15, "6": 25, W_BOWLED: 8, W_CAUGHT: 5, W_LBW: 5, W_STUMPED: 2 },

  // --- FLIPPER ---
  "Flipper|Defensive": { DOT: 65, "1": 20, "2": 5, "3": 0, "4": 1, "6": 0, W_BOWLED: 3, W_CAUGHT: 2, W_LBW: 4, W_STUMPED: 0 },
  "Flipper|Cover Drive": { DOT: 35, "1": 20, "2": 10, "3": 2, "4": 15, "6": 2, W_BOWLED: 4, W_CAUGHT: 6, W_LBW: 6, W_STUMPED: 0 },
  "Flipper|Straight Drive": { DOT: 30, "1": 20, "2": 10, "3": 2, "4": 20, "6": 3, W_BOWLED: 4, W_CAUGHT: 5, W_LBW: 6, W_STUMPED: 0 },
  "Flipper|Pull Shot": { DOT: 25, "1": 20, "2": 15, "3": 2, "4": 20, "6": 10, W_BOWLED: 2, W_CAUGHT: 4, W_LBW: 2, W_STUMPED: 0 },
  "Flipper|Hook Shot": { DOT: 35, "1": 15, "2": 10, "3": 0, "4": 15, "6": 15, W_BOWLED: 2, W_CAUGHT: 6, W_LBW: 2, W_STUMPED: 0 },
  "Flipper|Cut Shot": { DOT: 40, "1": 15, "2": 10, "3": 0, "4": 15, "6": 5, W_BOWLED: 4, W_CAUGHT: 6, W_LBW: 5, W_STUMPED: 0 },
  "Flipper|Sweep": { DOT: 25, "1": 25, "2": 15, "3": 2, "4": 20, "6": 5, W_BOWLED: 2, W_CAUGHT: 4, W_LBW: 2, W_STUMPED: 0 },
  "Flipper|Slog": { DOT: 20, "1": 10, "2": 5, "3": 0, "4": 20, "6": 25, W_BOWLED: 10, W_CAUGHT: 5, W_LBW: 5, W_STUMPED: 0 }
};

module.exports = probabilityMatrix;
