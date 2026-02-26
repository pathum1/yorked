const fs = require('fs');
const currentMatrix = require('./src/data/probability_matrix.js');

const newMatrix = { ...currentMatrix };

// 1. Un-map Lofted. It should be an actual unique shot.
// We will clone "Slog" but modify it to be slightly safer: lower W_*, lower 6, higher 4.
const deliveries = [
  'Yorker', 'Bouncer', 'Outswinger', 'Inswinger', 'Good Length', 
  'Slower Ball', 'Full Toss', 'Off-spin', 'Tossed Up', 'Slider', 
  'Arm Ball', 'Leg-spin', 'Googly', 'Flipper'
];

for (const del of deliveries) {
  const slogKey = `${del}|Slog`;
  if (currentMatrix[slogKey]) {
    const slogVals = currentMatrix[slogKey];
    // Lofted logic
    let newLoft = { ...slogVals };
    newLoft['4'] = Math.min(100, newLoft['4'] + 10);
    newLoft['6'] = Math.max(0, newLoft['6'] - 10);
    
    // Make slightly safer (lower catch/bowled)
    if (newLoft.W_CAUGHT > 5) newLoft.W_CAUGHT -= 5;
    if (newLoft.W_BOWLED > 5) newLoft.W_BOWLED -= 2;
    // transfer these saved points to 'DOT' or '1' or '2'
    newLoft.DOT += 7;
    
    newMatrix[`${del}|Lofted`] = newLoft;
  }
}

// 2. Add Half Volley for all shots (Drive, Straight Drive, Pull, Hook, Cut, Sweep, Slog, Lofted, Defensive)
// Half Volley is very easy to drive/slog, hard to cut/pull (too full).
const halfVolleyShots = {
  "Defensive": { DOT: 99, "1": 0, "2": 0, "3": 0, "4": 0, "6": 0, W_BOWLED: 1, W_CAUGHT: 0, W_LBW: 0, W_STUMPED: 0 },
  "Cover Drive": { DOT: 5, "1": 15, "2": 15, "3": 5, "4": 50, "6": 10, W_BOWLED: 0, W_CAUGHT: 0, W_LBW: 0, W_STUMPED: 0 },
  "Straight Drive": { DOT: 5, "1": 20, "2": 10, "3": 5, "4": 50, "6": 10, W_BOWLED: 0, W_CAUGHT: 0, W_LBW: 0, W_STUMPED: 0 },
  "Pull Shot": { DOT: 25, "1": 15, "2": 5, "3": 0, "4": 20, "6": 15, W_BOWLED: 10, W_CAUGHT: 5, W_LBW: 5, W_STUMPED: 0 },
  "Hook Shot": { DOT: 25, "1": 15, "2": 5, "3": 0, "4": 15, "6": 15, W_BOWLED: 10, W_CAUGHT: 10, W_LBW: 5, W_STUMPED: 0 },
  "Cut Shot": { DOT: 25, "1": 15, "2": 5, "3": 0, "4": 20, "6": 5, W_BOWLED: 10, W_CAUGHT: 15, W_LBW: 5, W_STUMPED: 0 },
  "Sweep": { DOT: 10, "1": 15, "2": 10, "3": 0, "4": 35, "6": 15, W_BOWLED: 5, W_CAUGHT: 5, W_LBW: 5, W_STUMPED: 0 },
  "Slog": { DOT: 5, "1": 10, "2": 5, "3": 0, "4": 20, "6": 50, W_BOWLED: 5, W_CAUGHT: 5, W_LBW: 0, W_STUMPED: 0 },
  "Lofted": { DOT: 5, "1": 10, "2": 5, "3": 0, "4": 40, "6": 30, W_BOWLED: 5, W_CAUGHT: 5, W_LBW: 0, W_STUMPED: 0 }
};

for (const [shot, probs] of Object.entries(halfVolleyShots)) {
  newMatrix[`Half Volley|${shot}`] = probs;
}

let content = `// Base probability weights for each Delivery vs Shot combination
// Normalized at runtime.
const probabilityMatrix = ${JSON.stringify(newMatrix, null, 2)};

module.exports = probabilityMatrix;
`;

fs.writeFileSync('./src/data/probability_matrix.js', content);
console.log("Updated matrix!");
