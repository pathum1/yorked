/**
 * YORKED v2 — ESPNCricinfo Player Data Scraper
 * 
 * ONE-TIME SCRIPT: Run this locally to build players_seed.json
 * 
 * This script:
 *   1. Hits ESPNCricinfo's unofficial JSON API for each of the 7 target countries
 *   2. Gets the player roster for each country
 *   3. Fetches individual player profiles with full career stats
 *   4. Outputs a single players_seed.json with everything needed for the game DB
 * 
 * Target countries: Sri Lanka, India, Australia, England, New Zealand, South Africa, West Indies
 * Formats: T20I and ODI only (men's)
 * 
 * Usage:
 *   cd scripts
 *   npm install node-fetch@2
 *   node scrapeEspncricinfo.js
 * 
 * Output: scripts/players_seed.json (bundled with the project, committed to git)
 * 
 * IMPORTANT: 
 *   - Rate limited to 1 request per second to be respectful to ESPN's servers
 *   - This is for a small personal project, not commercial use
 *   - Run this once, then update occasionally (monthly) if you want fresh stats
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// =============================================
// CONFIGURATION
// =============================================

const API_BASE = 'https://hs-consumer-api.espncricinfo.com/v1/pages';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' };

// ESPN team IDs for our 7 target countries
const TEAMS = [
    { id: 8,  name: 'Sri Lanka',    code: 'SL',  avatarColor: '#0D47A1' },
    { id: 6,  name: 'India',        code: 'IND', avatarColor: '#1E88E5' },
    { id: 2,  name: 'Australia',    code: 'AUS', avatarColor: '#FFD600' },
    { id: 1,  name: 'England',      code: 'ENG', avatarColor: '#1A237E' },
    { id: 5,  name: 'New Zealand',  code: 'NZ',  avatarColor: '#212121' },
    { id: 3,  name: 'South Africa', code: 'SA',  avatarColor: '#2E7D32' },
    { id: 4,  name: 'West Indies',  code: 'WI',  avatarColor: '#7B1FA2' },
];

const DELAY_MS = 1200; // 1.2 seconds between requests

// =============================================
// HELPERS
// =============================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJSON(url) {
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return response.json();
}

function safeNum(val) {
    if (val === null || val === undefined || val === '-' || val === '') return 0;
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
}

function safeInt(val) {
    if (val === null || val === undefined || val === '-' || val === '') return 0;
    const n = parseInt(val, 10);
    return isNaN(n) ? 0 : n;
}

// =============================================
// STEP 1: Get player list for each team
// =============================================

async function getTeamPlayers(teamId) {
    // The team home page returns recent players
    const url = `${API_BASE}/team/home?lang=en&teamId=${teamId}`;
    console.log(`  Fetching team page: teamId=${teamId}`);
    const data = await fetchJSON(url);
    
    // The team page has a 'players' field with player list
    // Structure varies but typically: data.team.players or data.content.players
    let players = [];
    
    // Try different paths the API might use
    if (data.players) {
        players = data.players;
    } else if (data.content && data.content.players) {
        players = data.content.players;
    } else if (data.team && data.team.players) {
        players = data.team.players;
    }
    
    // Also check for the player search endpoint which gives a more complete list
    // Try the search endpoint with team filter
    const searchUrl = `${API_BASE}/player/search?mode=CRICINFO&filterTeamId=${teamId}&filterClassId=3&filterClassId=2&filterIsActive=true&page=1&pageSize=100`;
    
    try {
        await sleep(DELAY_MS);
        console.log(`  Fetching player search for team ${teamId}...`);
        const searchData = await fetchJSON(searchUrl);
        
        if (searchData.results) {
            for (const result of searchData.results) {
                if (result.id && !players.find(p => p.id === result.id || p.objectId === result.id)) {
                    players.push(result);
                }
            }
        }
    } catch (err) {
        console.log(`  Search endpoint failed (${err.message}), using team page data only`);
    }
    
    // Extract player IDs
    const playerIds = [];
    for (const p of players) {
        const id = p.id || p.objectId || p.playerId;
        if (id && !playerIds.includes(id)) {
            playerIds.push(id);
        }
    }
    
    return { playerIds, rawPlayers: players };
}

// =============================================
// STEP 2: Get full player profile + stats
// =============================================

async function getPlayerProfile(playerId) {
    const url = `${API_BASE}/player/home?playerId=${playerId}`;
    const data = await fetchJSON(url);
    
    // Extract player bio from the response
    // The API typically returns data under data.player or data.content.player
    let player = null;
    
    if (data.player) {
        player = data.player;
    } else if (data.content && data.content.player) {
        player = data.content.player;
    } else if (data.data && data.data.player) {
        player = data.data.player;
    } else {
        // The whole response might be the player object
        player = data;
    }
    
    if (!player) {
        console.log(`    WARNING: No player data found for ID ${playerId}`);
        return null;
    }
    
    // Extract basic profile info
    const profile = {
        cricinfo_id: String(playerId),
        name: player.longName || player.name || player.knownAs || `Player ${playerId}`,
        country: null, // Set by caller
        date_of_birth: player.dateOfBirth || player.dob || null,
        batting_style: player.longBattingStyles?.[0] || player.battingStyles?.[0] || player.battingStyle || null,
        bowling_style: player.longBowlingStyles?.[0] || player.bowlingStyles?.[0] || player.bowlingStyle || null,
        role_tag: player.playingRole || player.role || player.playerRole || null,
        
        // Stats will be filled below
        t20i_batting: null,
        t20i_bowling: null,
        odi_batting: null,
        odi_bowling: null,
    };
    
    // Extract career stats
    // The API returns stats in various structures. Common patterns:
    // - data.content.intlCareerStats or data.intlCareerStats
    // - data.content.stats
    // - player.stats
    
    const statsSource = data.intlCareerStats 
        || data.content?.intlCareerStats 
        || data.stats 
        || data.content?.stats 
        || player.stats 
        || player.intlCareerStats
        || null;
    
    if (statsSource) {
        // Stats are typically organized by format
        // Each format has batting and bowling subsections
        profile.t20i_batting = extractBattingStats(statsSource, 'T20I');
        profile.t20i_bowling = extractBowlingStats(statsSource, 'T20I');
        profile.odi_batting = extractBattingStats(statsSource, 'ODI');
        profile.odi_bowling = extractBowlingStats(statsSource, 'ODI');
    }
    
    // Also try to find stats in a different structure
    if (!profile.t20i_batting && data.content) {
        // Some API responses put stats under content.stats[formatIndex]
        const allStats = data.content.stats || data.content.careerStats || [];
        if (Array.isArray(allStats)) {
            for (const statGroup of allStats) {
                const format = statGroup.format || statGroup.matchType || statGroup.classId;
                if (format === 'T20I' || format === 3 || format === '3') {
                    profile.t20i_batting = extractBattingFromGroup(statGroup);
                    profile.t20i_bowling = extractBowlingFromGroup(statGroup);
                }
                if (format === 'ODI' || format === 2 || format === '2') {
                    profile.odi_batting = extractBattingFromGroup(statGroup);
                    profile.odi_bowling = extractBowlingFromGroup(statGroup);
                }
            }
        }
    }
    
    return profile;
}

// Extract batting stats from a stats object (try multiple key patterns)
function extractBattingStats(stats, format) {
    // Try common patterns
    const formatKey = format.toLowerCase();
    const candidates = [
        stats[format]?.batting,
        stats[formatKey]?.batting,
        stats[format],
        stats[formatKey],
    ];
    
    for (const candidate of candidates) {
        if (candidate && (candidate.matches || candidate.innings || candidate.runs !== undefined)) {
            return {
                matches: safeInt(candidate.matches || candidate.Mat),
                innings: safeInt(candidate.innings || candidate.Inns),
                not_outs: safeInt(candidate.notOuts || candidate.NO),
                runs: safeInt(candidate.runs || candidate.Runs),
                balls_faced: safeInt(candidate.ballsFaced || candidate.BF),
                high_score: String(candidate.highScore || candidate.HS || '0'),
                average: safeNum(candidate.average || candidate.Ave),
                strike_rate: safeNum(candidate.strikeRate || candidate.SR),
                hundreds: safeInt(candidate.hundreds || candidate['100s'] || candidate.hundreds),
                fifties: safeInt(candidate.fifties || candidate['50s'] || candidate.fifties),
                fours: safeInt(candidate.fours || candidate['4s']),
                sixes: safeInt(candidate.sixes || candidate['6s']),
                catches: safeInt(candidate.catches || candidate.Ct),
                stumpings: safeInt(candidate.stumpings || candidate.St),
            };
        }
    }
    
    return null;
}

function extractBowlingStats(stats, format) {
    const formatKey = format.toLowerCase();
    const candidates = [
        stats[format]?.bowling,
        stats[formatKey]?.bowling,
    ];
    
    for (const candidate of candidates) {
        if (candidate && (candidate.matches || candidate.innings || candidate.wickets !== undefined)) {
            return {
                matches: safeInt(candidate.matches || candidate.Mat),
                innings: safeInt(candidate.innings || candidate.Inns),
                balls: safeInt(candidate.balls),
                overs: safeNum(candidate.overs),
                runs: safeInt(candidate.runs || candidate.Runs),
                wickets: safeInt(candidate.wickets || candidate.Wkts),
                average: safeNum(candidate.average || candidate.Ave),
                economy: safeNum(candidate.economy || candidate.Econ),
                strike_rate: safeNum(candidate.strikeRate || candidate.SR),
                best_figures: String(candidate.bestInnings || candidate.BBI || '0/0'),
                four_wickets: safeInt(candidate.fourWickets || candidate['4w']),
                five_wickets: safeInt(candidate.fiveWickets || candidate['5w']),
            };
        }
    }
    
    return null;
}

// Alternative extraction from a format-group structure
function extractBattingFromGroup(group) {
    const bat = group.batting || group.bat || group;
    if (!bat) return null;
    
    return {
        matches: safeInt(bat.matches || bat.Mat),
        innings: safeInt(bat.innings || bat.Inns),
        not_outs: safeInt(bat.notOuts || bat.NO),
        runs: safeInt(bat.runs || bat.Runs),
        balls_faced: safeInt(bat.ballsFaced || bat.BF),
        high_score: String(bat.highScore || bat.HS || '0'),
        average: safeNum(bat.average || bat.Ave),
        strike_rate: safeNum(bat.strikeRate || bat.SR),
        hundreds: safeInt(bat.hundreds || bat['100s']),
        fifties: safeInt(bat.fifties || bat['50s']),
        fours: safeInt(bat.fours || bat['4s']),
        sixes: safeInt(bat.sixes || bat['6s']),
        catches: safeInt(bat.catches || bat.Ct),
        stumpings: safeInt(bat.stumpings || bat.St),
    };
}

function extractBowlingFromGroup(group) {
    const bowl = group.bowling || group.bowl;
    if (!bowl) return null;
    
    return {
        matches: safeInt(bowl.matches || bowl.Mat),
        innings: safeInt(bowl.innings || bowl.Inns),
        balls: safeInt(bowl.balls),
        overs: safeNum(bowl.overs),
        runs: safeInt(bowl.runs || bowl.Runs),
        wickets: safeInt(bowl.wickets || bowl.Wkts),
        average: safeNum(bowl.average || bowl.Ave),
        economy: safeNum(bowl.economy || bowl.Econ),
        strike_rate: safeNum(bowl.strikeRate || bowl.SR),
        best_figures: String(bowl.bestInnings || bowl.BBI || '0/0'),
        four_wickets: safeInt(bowl.fourWickets || bowl['4w']),
        five_wickets: safeInt(bowl.fiveWickets || bowl['5w']),
    };
}

// =============================================
// STEP 3: Compute role from stats if role_tag is missing
// =============================================

function computeRole(player) {
    const roleTag = (player.role_tag || '').toLowerCase();
    
    // Try to use the role tag first
    if (roleTag.includes('wicketkeeper') || roleTag.includes('keeper')) {
        return { computed_role: 'wicketkeeper', computed_sub_role: 'keeper' };
    }
    
    // Determine batting and bowling sub-roles from style
    const bowlStyle = (player.bowling_style || '').toLowerCase();
    const isFast = bowlStyle.includes('fast') || bowlStyle.includes('medium') || bowlStyle.includes('pace');
    const isSpin = bowlStyle.includes('spin') || bowlStyle.includes('slow') || bowlStyle.includes('orthodox') 
        || bowlStyle.includes('left-arm wrist') || bowlStyle.includes('legbreak') || bowlStyle.includes('offbreak')
        || bowlStyle.includes('chinaman');
    
    if (roleTag.includes('opening bat') || roleTag.includes('opener')) {
        return { computed_role: 'batsman', computed_sub_role: 'opener' };
    }
    if (roleTag.includes('top order') || roleTag.includes('top-order')) {
        return { computed_role: 'batsman', computed_sub_role: 'top_order' };
    }
    if (roleTag.includes('middle order') || roleTag.includes('middle-order')) {
        return { computed_role: 'batsman', computed_sub_role: 'middle_order' };
    }
    if (roleTag.includes('batting allrounder') || roleTag.includes('batting all-rounder')) {
        return { computed_role: 'all_rounder', computed_sub_role: 'batting' };
    }
    if (roleTag.includes('bowling allrounder') || roleTag.includes('bowling all-rounder') || roleTag.includes('allrounder')) {
        return { computed_role: 'all_rounder', computed_sub_role: isSpin ? 'spin' : 'bowling' };
    }
    if (roleTag.includes('fast bowler') || roleTag.includes('pace bowler')) {
        return { computed_role: 'bowler', computed_sub_role: 'fast' };
    }
    if (roleTag.includes('spin bowler')) {
        return { computed_role: 'bowler', computed_sub_role: 'spin' };
    }
    if (roleTag.includes('bowler')) {
        return { computed_role: 'bowler', computed_sub_role: isFast ? 'fast' : (isSpin ? 'spin' : 'fast') };
    }
    if (roleTag.includes('batter') || roleTag.includes('batsman')) {
        return { computed_role: 'batsman', computed_sub_role: 'middle_order' };
    }
    
    // Fallback: compute from stats
    // Use the best available format
    const batStats = player.t20i_batting || player.odi_batting;
    const bowlStats = player.t20i_bowling || player.odi_bowling;
    
    const batAvg = batStats?.average || 0;
    const batInn = batStats?.innings || 0;
    const bowlWkt = bowlStats?.wickets || 0;
    const bowlInn = bowlStats?.innings || 0;
    const bowlAvg = bowlStats?.average || 99;
    
    const batValue = batAvg * Math.log(batInn + 1);
    const wktPerInn = bowlInn > 0 ? bowlWkt / bowlInn : 0;
    const bowlValue = wktPerInn * Math.log(bowlInn + 1) * (40 / Math.max(bowlAvg, 15));
    
    const total = batValue + bowlValue;
    const ratio = total > 0 ? batValue / total : 0.5;
    
    if (ratio > 0.70) {
        return { computed_role: 'batsman', computed_sub_role: 'middle_order' };
    } else if (ratio < 0.30) {
        return { computed_role: 'bowler', computed_sub_role: isFast ? 'fast' : (isSpin ? 'spin' : 'fast') };
    } else if (ratio < 0.55) {
        return { computed_role: 'all_rounder', computed_sub_role: 'bowling' };
    } else {
        return { computed_role: 'all_rounder', computed_sub_role: 'batting' };
    }
}

// =============================================
// MAIN
// =============================================

async function main() {
    console.log('=== YORKED v2 — ESPNCricinfo Player Scraper ===\n');
    console.log(`Target: ${TEAMS.map(t => t.name).join(', ')}`);
    console.log(`Formats: T20I, ODI (men's only)\n`);
    
    const allPlayers = [];
    const seenIds = new Set();
    let totalFetched = 0;
    let totalFailed = 0;
    
    for (const team of TEAMS) {
        console.log(`\n--- ${team.name} (teamId: ${team.id}) ---`);
        
        let playerIds = [];
        
        try {
            const result = await getTeamPlayers(team.id);
            playerIds = result.playerIds;
            console.log(`  Found ${playerIds.length} player IDs from team page`);
        } catch (err) {
            console.log(`  ERROR fetching team page: ${err.message}`);
            console.log(`  Trying player search fallback...`);
        }
        
        // If team page didn't return players, try the search endpoint directly
        if (playerIds.length === 0) {
            try {
                await sleep(DELAY_MS);
                const searchUrl = `${API_BASE}/player/search?mode=CRICINFO&filterTeamId=${team.id}&filterIsActive=true&page=1&pageSize=100`;
                const searchData = await fetchJSON(searchUrl);
                if (searchData.results) {
                    playerIds = searchData.results.map(r => r.id || r.objectId).filter(Boolean);
                    console.log(`  Found ${playerIds.length} player IDs from search`);
                }
            } catch (err) {
                console.log(`  Search also failed: ${err.message}`);
            }
        }
        
        // Fetch each player's full profile
        for (let i = 0; i < playerIds.length; i++) {
            const pid = playerIds[i];
            
            if (seenIds.has(String(pid))) {
                continue; // Skip duplicates (e.g., WI players who also play for a domestic team)
            }
            seenIds.add(String(pid));
            
            try {
                await sleep(DELAY_MS);
                process.stdout.write(`  [${i + 1}/${playerIds.length}] Fetching player ${pid}...`);
                
                const profile = await getPlayerProfile(pid);
                
                if (profile) {
                    profile.country = team.name;
                    profile.country_code = team.code;
                    profile.avatar_color = team.avatarColor;
                    
                    // Compute role
                    const role = computeRole(profile);
                    profile.computed_role = role.computed_role;
                    profile.computed_sub_role = role.computed_sub_role;
                    
                    // Only include players who have SOME stats in T20I or ODI
                    const hasT20Stats = profile.t20i_batting && profile.t20i_batting.matches > 0;
                    const hasODIStats = profile.odi_batting && profile.odi_batting.matches > 0;
                    
                    if (hasT20Stats || hasODIStats) {
                        allPlayers.push(profile);
                        totalFetched++;
                        console.log(` ✓ ${profile.name} (${profile.computed_role})`);
                    } else {
                        console.log(` ⊘ ${profile.name} (no T20I/ODI stats, skipped)`);
                    }
                } else {
                    console.log(` ✗ No data`);
                    totalFailed++;
                }
            } catch (err) {
                console.log(` ✗ Error: ${err.message}`);
                totalFailed++;
            }
        }
    }
    
    // =============================================
    // STEP 4: Save to JSON
    // =============================================
    
    const output = {
        _meta: {
            generated_at: new Date().toISOString(),
            source: 'ESPNCricinfo (unofficial API)',
            countries: TEAMS.map(t => t.name),
            formats: ['T20I', 'ODI'],
            total_players: allPlayers.length,
            note: 'This data is for personal/educational use in the Yorked v2 cricket game.',
        },
        countries: TEAMS.map(t => ({
            code: t.code,
            name: t.name,
            avatar_color: t.avatarColor,
        })),
        players: allPlayers,
    };
    
    const outputPath = path.join(__dirname, 'players_seed.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    console.log(`\n=== SCRAPING COMPLETE ===`);
    console.log(`Total players saved: ${allPlayers.length}`);
    console.log(`Failed/skipped: ${totalFailed}`);
    console.log(`Output: ${outputPath}`);
    console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
    
    // Print per-country breakdown
    console.log(`\nPer-country breakdown:`);
    for (const team of TEAMS) {
        const count = allPlayers.filter(p => p.country === team.name).length;
        console.log(`  ${team.name}: ${count} players`);
    }
    
    // Print role breakdown
    console.log(`\nRole breakdown:`);
    const roles = {};
    for (const p of allPlayers) {
        roles[p.computed_role] = (roles[p.computed_role] || 0) + 1;
    }
    for (const [role, count] of Object.entries(roles)) {
        console.log(`  ${role}: ${count}`);
    }
}

main().catch(err => {
    console.error('\nFATAL ERROR:', err);
    process.exit(1);
});
