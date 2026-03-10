/**
 * YORKED v2 — Cricsheet Data Pipeline
 * 
 * Builds players_seed.json from Cricsheet open ball-by-ball CSV data.
 * 
 * This script:
 *   1. Reads ODI + T20I ball-by-ball CSVs and info CSVs from Cricsheet
 *   2. Aggregates career batting/bowling stats per player per format
 *   3. Filters to target countries, 1996+ era, notable players only
 *   4. Cross-references with people.csv for ESPNCricinfo IDs
 *   5. Outputs players_seed.json compatible with seedDatabase.js
 * 
 * Prerequisites:
 *   Download and extract Cricsheet data:
 *     curl -L https://cricsheet.org/downloads/odis_csv2.zip -o /tmp/odis_csv2.zip
 *     curl -L https://cricsheet.org/downloads/t20s_csv2.zip -o /tmp/t20s_csv2.zip
 *     curl -L https://cricsheet.org/register/people.csv -o /tmp/people.csv
 *     mkdir -p /tmp/cricsheet_odi /tmp/cricsheet_t20i
 *     unzip -q /tmp/odis_csv2.zip -d /tmp/cricsheet_odi
 *     unzip -q /tmp/t20s_csv2.zip -d /tmp/cricsheet_t20i
 * 
 * Usage:
 *   node scripts/buildSeedFromCricsheet.js
 * 
 * Output: scripts/players_seed.json
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// =============================================
// CONFIGURATION
// =============================================

const ODI_DIR = '/tmp/cricsheet_odi';
const T20I_DIR = '/tmp/cricsheet_t20i';
const PEOPLE_CSV = '/tmp/people.csv';
const OUTPUT_PATH = path.join(__dirname, 'players_seed.json');

// Target countries (team names as they appear in Cricsheet data)
const TARGET_TEAMS = {
  'Sri Lanka':    { code: 'SL',  avatarColor: '#0D47A1' },
  'India':        { code: 'IND', avatarColor: '#1E88E5' },
  'Australia':    { code: 'AUS', avatarColor: '#FFD600' },
  'England':      { code: 'ENG', avatarColor: '#1A237E' },
  'New Zealand':  { code: 'NZ',  avatarColor: '#212121' },
  'South Africa': { code: 'SA',  avatarColor: '#2E7D32' },
  'West Indies':  { code: 'WI',  avatarColor: '#7B1FA2' },
  'Pakistan':     { code: 'PAK', avatarColor: '#01411C' },
};

// Notability thresholds — minimum matches to be included
const MIN_ODI_MATCHES = 10;
const MIN_T20I_MATCHES = 5;

// Earliest date to consider (to capture 1996 WC era players)
const EARLIEST_DATE = '1996-01-01';

// =============================================
// CSV PARSER (lightweight, no dependencies)
// =============================================

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }
    rows.push(row);
  }
  return rows;
}

function readInfoCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  const info = {
    teams: [],
    gender: 'male',
    date: '',
    players: {},       // name → team
    registry: {},      // name → cricsheet_id
  };
  for (const line of lines) {
    const parts = parseCSVLine(line);
    if (parts[0] !== 'info') continue;
    const key = parts[1];
    if (key === 'team') {
      info.teams.push(parts[2]);
    } else if (key === 'gender') {
      info.gender = parts[2];
    } else if (key === 'date') {
      info.date = parts[2].replace(/\//g, '-');
    } else if (key === 'player') {
      info.players[parts[3]] = parts[2]; // name → team
    } else if (key === 'registry' && parts[2] === 'people') {
      info.registry[parts[3]] = parts[4]; // name → cricsheet ID
    }
  }
  return info;
}

// =============================================
// PEOPLE.CSV REGISTER
// =============================================

function loadPeopleRegister() {
  console.log('Loading people.csv register...');
  const rows = readCSV(PEOPLE_CSV);
  const register = {}; // cricsheet_id → { name, cricinfo_id }
  for (const row of rows) {
    register[row.identifier] = {
      name: row.name,
      unique_name: row.unique_name,
      cricinfo_id: row.key_cricinfo || '',
    };
  }
  console.log(`  Loaded ${Object.keys(register).length} people`);
  return register;
}

// =============================================
// STATS ACCUMULATOR
// =============================================

function createEmptyStats() {
  return {
    batting: {
      matches: new Set(),
      innings: new Set(),
      runs: 0,
      balls_faced: 0,
      fours: 0,
      sixes: 0,
      not_outs: 0,
      dismissals: 0,
      highest_score: 0,
      // per-innings tracking for highest score & not outs
      _innings_runs: {},  // match_innings_key → runs
      _innings_dismissed: {}, // match_innings_key → boolean
    },
    bowling: {
      matches: new Set(),
      innings: new Set(),
      balls: 0,
      runs_conceded: 0,
      wickets: 0,
      maidens: 0, // hard to compute from ball-by-ball, skip
      // per-innings tracking for best bowling
      _innings_wickets: {},  // match_innings_key → wickets
      _innings_runs: {},     // match_innings_key → runs
    },
  };
}

// =============================================
// PROCESS MATCH FILES
// =============================================

function processMatchDir(dirPath, format, playerStats) {
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('_info.csv'));
  console.log(`Processing ${files.length} ${format} match info files...`);

  let processed = 0;
  let skipped = 0;

  for (const infoFile of files) {
    const matchId = infoFile.replace('_info.csv', '');
    const infoPath = path.join(dirPath, infoFile);
    const ballPath = path.join(dirPath, `${matchId}.csv`);

    if (!fs.existsSync(ballPath)) {
      skipped++;
      continue;
    }

    // Parse info
    const info = readInfoCSV(infoPath);

    // Skip non-male matches
    if (info.gender !== 'male') {
      skipped++;
      continue;
    }

    // Skip matches before our cutoff
    if (info.date && info.date < EARLIEST_DATE) {
      skipped++;
      continue;
    }

    // Check if at least one target team is playing
    const hasTargetTeam = info.teams.some(t => TARGET_TEAMS[t]);
    if (!hasTargetTeam) {
      skipped++;
      continue;
    }

    // Parse ball-by-ball data
    let balls;
    try {
      balls = readCSV(ballPath);
    } catch (err) {
      skipped++;
      continue;
    }

    // Determine player → team mapping from info file
    // Fall back to ball data if info doesn't have player list
    const playerTeamMap = { ...info.players };

    // Track batting innings per player in this match
    const matchBattingInnings = {}; // playerName → Set of innings numbers
    const matchBowlingInnings = {}; // playerName → Set of innings numbers

    for (const ball of balls) {
      const striker = ball.striker;
      const bowler = ball.bowler;
      const battingTeam = ball.batting_team;
      const bowlingTeam = ball.bowling_team;
      const innings = ball.innings;
      const runsOffBat = parseInt(ball.runs_off_bat) || 0;
      const extras = parseInt(ball.extras) || 0;
      const wides = parseInt(ball.wides) || 0;
      const noballs = parseInt(ball.noballs) || 0;
      const wicketType = ball.wicket_type || '';
      const playerDismissed = ball.player_dismissed || '';

      // Assign teams if not in info
      if (!playerTeamMap[striker]) playerTeamMap[striker] = battingTeam;
      if (!playerTeamMap[bowler]) playerTeamMap[bowler] = bowlingTeam;

      // Only track players from target countries
      const strikerTeam = playerTeamMap[striker];
      const bowlerTeam = playerTeamMap[bowler];

      // -- BATTING STATS --
      if (TARGET_TEAMS[strikerTeam]) {
        const key = `${strikerTeam}::${striker}`;
        if (!playerStats[key]) {
          playerStats[key] = {
            name: striker,
            country: strikerTeam,
            cricsheet_ids: new Set(),
            odi: format === 'ODI' ? createEmptyStats() : null,
            t20i: format === 'T20I' ? createEmptyStats() : null,
          };
        }
        if (!playerStats[key][format.toLowerCase()]) {
          playerStats[key][format.toLowerCase()] = createEmptyStats();
        }

        const stats = playerStats[key][format.toLowerCase()];

        // Track cricsheet registry ID
        if (info.registry[striker]) {
          playerStats[key].cricsheet_ids.add(info.registry[striker]);
        }

        const inningsKey = `${matchId}_${innings}`;
        stats.batting.matches.add(matchId);
        stats.batting.innings.add(inningsKey);

        // Don't count wides as balls faced by batter
        if (!wides) {
          stats.batting.balls_faced++;
        }
        stats.batting.runs += runsOffBat;
        if (runsOffBat === 4) stats.batting.fours++;
        if (runsOffBat === 6) stats.batting.sixes++;

        // Track per-innings runs
        if (!stats.batting._innings_runs[inningsKey]) {
          stats.batting._innings_runs[inningsKey] = 0;
        }
        stats.batting._innings_runs[inningsKey] += runsOffBat;

        // Track batting innings for this match
        if (!matchBattingInnings[striker]) matchBattingInnings[striker] = new Set();
        matchBattingInnings[striker].add(innings);
      }

      // -- BOWLING STATS --
      if (TARGET_TEAMS[bowlerTeam]) {
        const key = `${bowlerTeam}::${bowler}`;
        if (!playerStats[key]) {
          playerStats[key] = {
            name: bowler,
            country: bowlerTeam,
            cricsheet_ids: new Set(),
            odi: format === 'ODI' ? createEmptyStats() : null,
            t20i: format === 'T20I' ? createEmptyStats() : null,
          };
        }
        if (!playerStats[key][format.toLowerCase()]) {
          playerStats[key][format.toLowerCase()] = createEmptyStats();
        }

        const stats = playerStats[key][format.toLowerCase()];

        if (info.registry[bowler]) {
          playerStats[key].cricsheet_ids.add(info.registry[bowler]);
        }

        const inningsKey = `${matchId}_${innings}`;
        stats.bowling.matches.add(matchId);
        stats.bowling.innings.add(inningsKey);

        // Count legitimate balls (not wides/noballs)
        if (!wides && !noballs) {
          stats.bowling.balls++;
        }
        // Runs conceded = runs off bat + wides + noballs (not byes/legbyes)
        stats.bowling.runs_conceded += runsOffBat + (parseInt(ball.wides) || 0) + (parseInt(ball.noballs) || 0);

        // Track per-innings bowling
        if (!stats.bowling._innings_wickets[inningsKey]) {
          stats.bowling._innings_wickets[inningsKey] = 0;
          stats.bowling._innings_runs[inningsKey] = 0;
        }
        stats.bowling._innings_runs[inningsKey] += runsOffBat + (parseInt(ball.wides) || 0) + (parseInt(ball.noballs) || 0);
      }

      // -- DISMISSALS --
      if (wicketType && playerDismissed) {
        // Find dismissed player's stats
        const dismissedTeam = playerTeamMap[playerDismissed] || battingTeam;
        const dismissedKey = `${dismissedTeam}::${playerDismissed}`;
        if (playerStats[dismissedKey] && playerStats[dismissedKey][format.toLowerCase()]) {
          const inningsKey = `${matchId}_${innings}`;
          playerStats[dismissedKey][format.toLowerCase()].batting._innings_dismissed[inningsKey] = true;
          playerStats[dismissedKey][format.toLowerCase()].batting.dismissals++;
        }

        // Credit bowler with wicket (if applicable)
        if (wicketType !== 'run out' && wicketType !== 'retired hurt' &&
            wicketType !== 'retired not out' && wicketType !== 'obstructing the field') {
          const bowlerTeam2 = playerTeamMap[bowler] || bowlingTeam;
          const bowlerKey = `${bowlerTeam2}::${bowler}`;
          if (playerStats[bowlerKey] && playerStats[bowlerKey][format.toLowerCase()]) {
            const inningsKey = `${matchId}_${innings}`;
            playerStats[bowlerKey][format.toLowerCase()].bowling.wickets++;
            if (playerStats[bowlerKey][format.toLowerCase()].bowling._innings_wickets[inningsKey] !== undefined) {
              playerStats[bowlerKey][format.toLowerCase()].bowling._innings_wickets[inningsKey]++;
            }
          }
        }
      }
    }

    processed++;
    if (processed % 500 === 0) {
      process.stdout.write(`  ${processed}/${files.length} matches processed\r`);
    }
  }

  console.log(`  ${processed} matches processed, ${skipped} skipped`);
}

// =============================================
// FINALIZE STATS
// =============================================

function finalizePlayerStats(playerStats, peopleRegister) {
  const players = [];

  for (const [key, data] of Object.entries(playerStats)) {
    const teamConfig = TARGET_TEAMS[data.country];
    if (!teamConfig) continue;

    // Compute finalized stats per format
    const odiStats = finalizeFormatStats(data.odi);
    const t20iStats = finalizeFormatStats(data.t20i);

    // Notability filter: must exceed minimum matches in at least one format
    const odiMatches = odiStats?.batting?.matches || 0;
    const t20iMatches = t20iStats?.batting?.matches || 0;

    if (odiMatches < MIN_ODI_MATCHES && t20iMatches < MIN_T20I_MATCHES) {
      continue;
    }

    // Resolve cricinfo ID from people register
    let cricinfo_id = '';
    for (const csId of data.cricsheet_ids) {
      if (peopleRegister[csId] && peopleRegister[csId].cricinfo_id) {
        cricinfo_id = peopleRegister[csId].cricinfo_id;
        break;
      }
    }

    // Compute role
    const role = computeRole(odiStats, t20iStats);

    players.push({
      cricinfo_id,
      name: data.name,
      country: data.country,
      country_code: teamConfig.code,
      avatar_color: teamConfig.avatarColor,
      date_of_birth: null,
      batting_style: null,
      bowling_style: null,
      role_tag: null,
      computed_role: role.computed_role,
      computed_sub_role: role.computed_sub_role,
      odi_batting: odiStats?.batting || null,
      odi_bowling: odiStats?.bowling || null,
      t20i_batting: t20iStats?.batting || null,
      t20i_bowling: t20iStats?.bowling || null,
    });
  }

  return players;
}

function finalizeFormatStats(formatData) {
  if (!formatData) return null;

  const bat = formatData.batting;
  const bowl = formatData.bowling;

  // Compute not outs: innings where player wasn't dismissed
  let not_outs = 0;
  for (const inningsKey of bat.innings) {
    if (!bat._innings_dismissed[inningsKey]) {
      not_outs++;
    }
  }

  // Compute highest score
  let highest_score = 0;
  let highest_not_out = false;
  for (const [inningsKey, runs] of Object.entries(bat._innings_runs)) {
    if (runs > highest_score) {
      highest_score = runs;
      highest_not_out = !bat._innings_dismissed[inningsKey];
    }
  }

  // Best bowling figures
  let bestBowlWickets = 0;
  let bestBowlRuns = 999;
  for (const inningsKey of Object.keys(bowl._innings_wickets)) {
    const w = bowl._innings_wickets[inningsKey];
    const r = bowl._innings_runs[inningsKey] || 0;
    if (w > bestBowlWickets || (w === bestBowlWickets && r < bestBowlRuns)) {
      bestBowlWickets = w;
      bestBowlRuns = r;
    }
  }

  const batMatches = bat.matches.size;
  const batInnings = bat.innings.size;
  const batRuns = bat.runs;
  const ballsFaced = bat.balls_faced;
  const strikeRate = ballsFaced > 0 ? (batRuns / ballsFaced) * 100 : 0;
  const average = (batInnings - not_outs) > 0 ? batRuns / (batInnings - not_outs) : batRuns;

  // Count hundreds and fifties from per-innings data
  let hundreds = 0;
  let fifties = 0;
  for (const runs of Object.values(bat._innings_runs)) {
    if (runs >= 100) hundreds++;
    else if (runs >= 50) fifties++;
  }

  const bowlBalls = bowl.balls;
  const bowlOvers = Math.floor(bowlBalls / 6) + (bowlBalls % 6) / 10;
  const bowlRunsConceded = bowl.runs_conceded;
  const bowlWickets = bowl.wickets;
  const bowlEconomy = bowlOvers > 0 ? bowlRunsConceded / (bowlBalls / 6) : 0;
  const bowlAverage = bowlWickets > 0 ? bowlRunsConceded / bowlWickets : 0;
  const bowlStrikeRate = bowlWickets > 0 ? bowlBalls / bowlWickets : 0;

  return {
    batting: {
      matches: batMatches,
      innings: batInnings,
      not_outs: not_outs,
      runs: batRuns,
      balls_faced: ballsFaced,
      high_score: `${highest_score}${highest_not_out ? '*' : ''}`,
      average: parseFloat(average.toFixed(2)),
      strike_rate: parseFloat(strikeRate.toFixed(2)),
      hundreds,
      fifties,
      fours: bat.fours,
      sixes: bat.sixes,
      catches: 0,
      stumpings: 0,
    },
    bowling: {
      matches: bowl.matches.size,
      innings: bowl.innings.size,
      balls: bowlBalls,
      overs: parseFloat(bowlOvers.toFixed(1)),
      runs: bowlRunsConceded,
      wickets: bowlWickets,
      average: parseFloat(bowlAverage.toFixed(2)),
      economy: parseFloat(bowlEconomy.toFixed(2)),
      strike_rate: parseFloat(bowlStrikeRate.toFixed(2)),
      best_figures: bestBowlWickets > 0 ? `${bestBowlWickets}/${bestBowlRuns}` : '0/0',
      four_wickets: 0,
      five_wickets: 0,
    },
  };
}

// Count 4w/5w from per-innings data (called after finalizeFormatStats builds the result)
// We'll patch these in during finalize

// =============================================
// ROLE COMPUTATION
// =============================================

function computeRole(odiStats, t20iStats) {
  // Use the format with more data, or combine both
  const odi = odiStats || { batting: null, bowling: null };
  const t20 = t20iStats || { batting: null, bowling: null };

  // Combine stats across formats for better signal
  const batBalls = (odi.batting?.balls_faced || 0) + (t20.batting?.balls_faced || 0);
  const batRuns = (odi.batting?.runs || 0) + (t20.batting?.runs || 0);
  const batInn = (odi.batting?.innings || 0) + (t20.batting?.innings || 0);
  const batAvg = (odi.batting?.average || 0) + (t20.batting?.average || 0); // sum for weighting
  const bowlBalls = (odi.bowling?.balls || 0) + (t20.bowling?.balls || 0);
  const bowlWkts = (odi.bowling?.wickets || 0) + (t20.bowling?.wickets || 0);
  const bowlEcon = (odi.bowling?.economy || 0) || (t20.bowling?.economy || 0);

  // Sub-role: try to detect spin vs pace using economy
  // Spinners in ODIs typically have economy 4-5.5, pacers 5-7+
  // In T20Is, spinners ~6-7.5, pacers ~7-9+
  // Use ODI economy as primary signal since it's more discriminating
  const odiEcon = odi.bowling?.economy || 0;
  const odiOvers = odi.bowling?.balls ? odi.bowling.balls / 6 : 0;
  const isSpin = odiOvers > 50 && odiEcon > 0 && odiEcon < 5.2;
  const bowlSubRole = isSpin ? 'spin' : 'fast';

  // ========== CLASSIFICATION LOGIC ==========
  // The key insight: in limited-overs, EVERYONE bats
  // So we use BOWLING VOLUME (balls bowled) as the primary signal
  // for whether someone is a bowler or not

  // If they barely bowled at all → batter
  if (bowlBalls < 120) {  // Less than 20 overs total career
    return { computed_role: 'batsman', computed_sub_role: 'middle_order' };
  }

  // Ratio: what fraction of their career is bowling vs batting?
  // bowlBalls = balls DELIVERED, batBalls = balls FACED
  // A pure bowler might bowl 5000 balls and face 1000
  // A pure batter might bowl 200 balls and face 8000
  const volumeRatio = bowlBalls / Math.max(batBalls, 1);

  // Wickets per match (across formats where they bowled)
  const bowlMatches = (odi.bowling?.matches || 0) + (t20.bowling?.matches || 0);
  const wktsPerMatch = bowlMatches > 0 ? bowlWkts / bowlMatches : 0;

  // Batting quality signal
  const combinedBatAvg = batInn > 0 ? batRuns / Math.max(batInn, 1) : 0;

  // PURE BOWLER: bowls a LOT relative to batting, takes regular wickets
  // e.g., Starc: volumeRatio ~1.5+, wktsPerMatch ~1.5+
  if (volumeRatio > 1.0 && wktsPerMatch >= 1.0) {
    return { computed_role: 'bowler', computed_sub_role: bowlSubRole };
  }

  // BOWLER with some batting: high bowling volume, decent wicket rate
  if (volumeRatio > 0.6 && wktsPerMatch >= 1.0 && combinedBatAvg < 25) {
    return { computed_role: 'bowler', computed_sub_role: bowlSubRole };
  }

  // BOWLING ALL-ROUNDER: significant bowling + decent batting
  if (volumeRatio > 0.5 && wktsPerMatch >= 0.8 && combinedBatAvg >= 20) {
    return { computed_role: 'all_rounder', computed_sub_role: 'bowling' };
  }

  // BOWLING ALL-ROUNDER: lots of wickets but also bats well
  if (bowlWkts >= 50 && combinedBatAvg >= 20 && volumeRatio > 0.3) {
    return { computed_role: 'all_rounder', computed_sub_role: 'bowling' };
  }

  // BATTING ALL-ROUNDER: primarily bats but bowls enough to be useful
  if (volumeRatio > 0.2 && bowlWkts >= 30 && combinedBatAvg >= 25) {
    return { computed_role: 'all_rounder', computed_sub_role: 'batting' };
  }

  // Default: batter
  return { computed_role: 'batsman', computed_sub_role: 'middle_order' };
}

// =============================================
// MAIN
// =============================================

async function main() {
  console.log('=== YORKED v2 — Cricsheet Data Pipeline ===\n');
  console.log(`Target countries: ${Object.keys(TARGET_TEAMS).join(', ')}`);
  console.log(`Formats: ODI, T20I (men's only)`);
  console.log(`Date range: ${EARLIEST_DATE} onwards`);
  console.log(`Notability: ≥${MIN_ODI_MATCHES} ODIs or ≥${MIN_T20I_MATCHES} T20Is\n`);

  // Verify data exists
  if (!fs.existsSync(ODI_DIR)) {
    console.error(`ERROR: ODI data not found at ${ODI_DIR}`);
    console.error('Run the download commands in the header comment first.');
    process.exit(1);
  }
  if (!fs.existsSync(T20I_DIR)) {
    console.error(`ERROR: T20I data not found at ${T20I_DIR}`);
    process.exit(1);
  }
  if (!fs.existsSync(PEOPLE_CSV)) {
    console.error(`ERROR: people.csv not found at ${PEOPLE_CSV}`);
    process.exit(1);
  }

  // Load people register
  const peopleRegister = loadPeopleRegister();

  // Accumulate stats
  const playerStats = {};

  console.log('\n--- Processing ODI matches ---');
  processMatchDir(ODI_DIR, 'ODI', playerStats);

  console.log('\n--- Processing T20I matches ---');
  processMatchDir(T20I_DIR, 'T20I', playerStats);

  console.log(`\nRaw player entries: ${Object.keys(playerStats).length}`);

  // Finalize and filter
  console.log('Finalizing stats and applying filters...');
  const players = finalizePlayerStats(playerStats, peopleRegister);

  // Sort by total matches (ODI + T20I) descending
  players.sort((a, b) => {
    const aMatches = (a.odi_batting?.matches || 0) + (a.t20i_batting?.matches || 0);
    const bMatches = (b.odi_batting?.matches || 0) + (b.t20i_batting?.matches || 0);
    return bMatches - aMatches;
  });

  // Build output
  const output = {
    _meta: {
      generated_at: new Date().toISOString(),
      source: 'Cricsheet (cricsheet.org) — open ball-by-ball data',
      countries: Object.keys(TARGET_TEAMS),
      formats: ['T20I', 'ODI'],
      total_players: players.length,
      note: 'Career stats computed from ball-by-ball data. Catches/stumpings not available from Cricsheet.',
    },
    countries: Object.entries(TARGET_TEAMS).map(([name, cfg]) => ({
      code: cfg.code,
      name,
      avatar_color: cfg.avatarColor,
    })),
    players,
  };

  // Save
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));

  // Report
  console.log(`\n=== PIPELINE COMPLETE ===`);
  console.log(`Total players: ${players.length}`);
  console.log(`Output: ${OUTPUT_PATH}`);
  console.log(`File size: ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1)} KB`);

  console.log(`\nPer-country breakdown:`);
  for (const country of Object.keys(TARGET_TEAMS)) {
    const count = players.filter(p => p.country === country).length;
    console.log(`  ${country}: ${count} players`);
  }

  console.log(`\nRole breakdown:`);
  const roles = {};
  for (const p of players) {
    roles[p.computed_role] = (roles[p.computed_role] || 0) + 1;
  }
  for (const [role, count] of Object.entries(roles)) {
    console.log(`  ${role}: ${count}`);
  }

  // Show top 10 by ODI matches
  console.log(`\nTop 10 by total matches:`);
  for (const p of players.slice(0, 10)) {
    const total = (p.odi_batting?.matches || 0) + (p.t20i_batting?.matches || 0);
    console.log(`  ${p.name} (${p.country}) — ${total} matches [${p.computed_role}]`);
  }
}

main().catch(err => {
  console.error('\nFATAL ERROR:', err);
  process.exit(1);
});
