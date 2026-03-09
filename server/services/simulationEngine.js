/**
 * YORKED v2 — Match Simulation Engine
 *
 * Resolves a cricket match over-by-over using player stats and weighted probabilities.
 * Produces: over-by-over summaries, batting scorecards, bowling scorecards.
 *
 * Supports: T20I (20 overs), ODI (50 overs), Test (up to 450 overs, 4 innings)
 */

const { generateNarrative } = require('./narrativeGenerator');

// =============================================
// BASE PROBABILITIES PER FORMAT
// =============================================
const BASE_PROBS = {
    t20i: { dot: 0.35, single: 0.28, double: 0.10, triple: 0.03, four: 0.10, six: 0.05, wicket: 0.05, extras: 0.04 },
    odi:  { dot: 0.42, single: 0.30, double: 0.10, triple: 0.03, four: 0.07, six: 0.02, wicket: 0.035, extras: 0.025 },
    test: { dot: 0.55, single: 0.25, double: 0.08, triple: 0.02, four: 0.05, six: 0.01, wicket: 0.025, extras: 0.015 },
};

const FORMAT_TOTAL_OVERS = { t20i: 20, odi: 50, test: 90 }; // test = per day
const FORMAT_MAX_PER_BOWLER = { t20i: 4, odi: 10, test: Infinity };

// Dismissal type probabilities
const DISMISSAL_TYPES = [
    { type: 'caught', prob: 0.55 },
    { type: 'bowled', prob: 0.20 },
    { type: 'lbw', prob: 0.15 },
    { type: 'run out', prob: 0.05 },
    { type: 'stumped', prob: 0.03 },
    { type: 'hit wicket', prob: 0.01 },
    { type: 'caught & bowled', prob: 0.01 },
];

// =============================================
// MAIN SIMULATION FUNCTION
// =============================================
async function runSimulation(db, matchId, io) {
    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    if (!match) throw new Error('Match not found');

    const format = match.format;

    // Load both team rosters with player stats
    const teamA = loadTeam(db, match.team_a_id, format);
    const teamB = loadTeam(db, match.team_b_id, format);

    // Determine toss
    const toss = simulateToss(format);

    db.prepare('UPDATE matches SET toss_winner = ?, toss_decision = ? WHERE id = ?')
        .run(toss.winner, toss.decision, matchId);

    // Determine batting order for each innings
    let battingFirst, bowlingFirst;
    if ((toss.winner === 'team_a' && toss.decision === 'bat') ||
        (toss.winner === 'team_b' && toss.decision === 'bowl')) {
        battingFirst = teamA;
        bowlingFirst = teamB;
    } else {
        battingFirst = teamB;
        bowlingFirst = teamA;
    }

    let matchResult;

    if (format === 'test') {
        matchResult = simulateTestMatch(db, matchId, format, teamA, teamB, battingFirst, bowlingFirst);
    } else {
        matchResult = simulateLimitedOvers(db, matchId, format, battingFirst, bowlingFirst);
    }

    // Save result
    db.prepare(`
        UPDATE matches
        SET status = 'completed', result_summary = ?, result_type = ?, result_margin = ?,
            completed_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).run(matchResult.summary, matchResult.type, matchResult.margin, matchId);

    // Notify both coaches
    if (io) {
        io.to(`user_${match.user_a_id}`).emit('match:simulation_complete', {
            matchId, resultSummary: matchResult.summary,
        });
        io.to(`user_${match.user_b_id}`).emit('match:simulation_complete', {
            matchId, resultSummary: matchResult.summary,
        });
        // Global feed
        io.emit('feed:new_result', {
            matchId,
            teamA: battingFirst.name,
            teamB: bowlingFirst.name,
            result: matchResult.summary,
            format,
        });
    }

    return matchResult;
}

// =============================================
// LOAD TEAM DATA
// =============================================
function loadTeam(db, teamId, format) {
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);

    const players = db.prepare(`
        SELECT tp.*, p.name, p.country, p.computed_role, p.computed_sub_role,
               p.bowling_style,
               ps.batting_average, ps.batting_strike_rate, ps.batting_runs,
               ps.batting_innings, ps.batting_matches,
               ps.bowling_average, ps.bowling_economy, ps.bowling_strike_rate,
               ps.bowling_wickets, ps.bowling_innings, ps.bowling_matches, ps.bowling_balls
        FROM team_players tp
        JOIN players p ON tp.player_id = p.id
        LEFT JOIN player_stats ps ON p.id = ps.player_id AND ps.format = ?
        WHERE tp.team_id = ?
        ORDER BY tp.batting_position ASC
    `).all(format, teamId);

    // Find captain
    const captain = players.find(p => p.is_captain);

    return {
        id: teamId,
        name: team.name,
        logo: team.logo,
        players,
        captain,
        getBowlers() {
            return this.players.filter(p =>
                (p.bowling_overs > 0) ||
                (p.bowling_priority && p.bowling_priority !== null)
            );
        }
    };
}

// =============================================
// TOSS SIMULATION
// =============================================
function simulateToss(format) {
    const winner = Math.random() < 0.5 ? 'team_a' : 'team_b';

    let batProb;
    switch (format) {
        case 't20i': batProb = 0.40; break;  // 60% bowl first in T20
        case 'odi':  batProb = 0.55; break;  // 55% bat first in ODI
        case 'test': batProb = 0.70; break;  // 70% bat first in Test
        default:     batProb = 0.50;
    }

    const decision = Math.random() < batProb ? 'bat' : 'bowl';

    return { winner, decision };
}

// =============================================
// LIMITED-OVERS SIMULATION (T20I / ODI)
// =============================================
function simulateLimitedOvers(db, matchId, format, battingFirst, bowlingFirst) {
    const totalOvers = FORMAT_TOTAL_OVERS[format];

    // --- 1st Innings ---
    const innings1 = simulateInnings(db, matchId, 1, format, totalOvers, battingFirst, bowlingFirst, null);

    // --- 2nd Innings ---
    const target = innings1.totalRuns + 1;
    const innings2 = simulateInnings(db, matchId, 2, format, totalOvers, bowlingFirst, battingFirst, target);

    // --- Determine Result ---
    let summary, type, margin;

    if (innings2.totalRuns >= target) {
        // Batting second won (chased successfully)
        const wicketsRemaining = 10 - innings2.totalWickets;
        summary = `${bowlingFirst.name} beat ${battingFirst.name} by ${wicketsRemaining} wicket${wicketsRemaining !== 1 ? 's' : ''}`;
        type = 'wickets';
        margin = `${wicketsRemaining} wickets`;
    } else if (innings2.totalRuns === innings1.totalRuns) {
        summary = `${battingFirst.name} vs ${bowlingFirst.name} — Match Tied!`;
        type = 'tie';
        margin = 'tie';
    } else {
        const runMargin = innings1.totalRuns - innings2.totalRuns;
        summary = `${battingFirst.name} beat ${bowlingFirst.name} by ${runMargin} run${runMargin !== 1 ? 's' : ''}`;
        type = 'runs';
        margin = `${runMargin} runs`;
    }

    return { summary, type, margin };
}

// =============================================
// SINGLE INNINGS SIMULATION
// =============================================
function simulateInnings(db, matchId, inningsNum, format, totalOvers, battingTeam, bowlingTeam, target) {
    const maxPerBowler = FORMAT_MAX_PER_BOWLER[format];
    const battingOrder = battingTeam.players.slice(); // Copy, sorted by batting_position
    const bowlers = bowlingTeam.getBowlers();

    // Initialize batsman tracking
    const batsmanStats = {};
    for (const p of battingOrder) {
        batsmanStats[p.player_id] = { runs: 0, balls: 0, fours: 0, sixes: 0, out: false, dismissal: null };
    }

    // Initialize bowler tracking
    const bowlerStats = {};
    for (const b of bowlers) {
        bowlerStats[b.player_id] = { balls: 0, runs: 0, wickets: 0, maidens: 0, wides: 0, noBalls: 0 };
    }

    // Track bowler overs used
    const bowlerOversUsed = {};
    for (const b of bowlers) {
        bowlerOversUsed[b.player_id] = 0;
    }

    let totalRuns = 0;
    let totalWickets = 0;
    let currentBatsmanIdx = 0;
    let nonStrikerIdx = 1;
    let strikerIdx = 0;

    // Captain bonus
    const captainId = battingTeam.captain ? battingTeam.captain.player_id : null;

    const allOvers = [];
    let lastBowlerId = null;

    for (let overNum = 1; overNum <= totalOvers; overNum++) {
        if (totalWickets >= 10) break;
        if (target && totalRuns >= target) break;

        // Select bowler for this over
        const bowler = selectBowler(bowlers, bowlerOversUsed, maxPerBowler, overNum, totalOvers, format, lastBowlerId);
        lastBowlerId = bowler.player_id;

        let overRuns = 0;
        let overWickets = 0;
        let overExtras = 0;
        let overBalls = 0;
        let isMaiden = true;
        const ballResults = [];
        let notableEvents = [];

        const striker = battingOrder[strikerIdx];

        while (overBalls < 6) {
            if (totalWickets >= 10) break;
            if (target && totalRuns >= target) break;

            const currentStriker = battingOrder[strikerIdx];

            // Resolve this ball
            const outcome = resolveBall(
                currentStriker, bowler, format, overNum, totalOvers,
                totalRuns, totalWickets, target, captainId, bowlingTeam.captain
            );

            if (outcome.type === 'wide' || outcome.type === 'no_ball') {
                // Extras don't count as a legal delivery
                totalRuns += 1;
                overRuns += 1;
                overExtras += 1;
                isMaiden = false;
                bowlerStats[bowler.player_id].runs += 1;
                if (outcome.type === 'wide') {
                    bowlerStats[bowler.player_id].wides += 1;
                    ballResults.push('wd');
                } else {
                    bowlerStats[bowler.player_id].noBalls += 1;
                    ballResults.push('nb');
                }
                continue; // Don't count as a ball
            }

            overBalls += 1;
            bowlerStats[bowler.player_id].balls += 1;
            batsmanStats[currentStriker.player_id].balls += 1;

            if (outcome.type === 'wicket') {
                totalWickets += 1;
                overWickets += 1;
                bowlerStats[bowler.player_id].wickets += 1;
                isMaiden = false;

                // Determine dismissal
                const dismissal = determineDismissal(bowler, bowlingTeam);
                batsmanStats[currentStriker.player_id].out = true;
                batsmanStats[currentStriker.player_id].dismissal = {
                    type: dismissal.type,
                    bowlerId: bowler.player_id,
                    fielderId: dismissal.fielderId,
                };

                const event = `WICKET: ${currentStriker.name} ${formatDismissal(dismissal, bowler.name)} for ${batsmanStats[currentStriker.player_id].runs}`;
                notableEvents.push(event);
                ballResults.push('W');

                // Save batting card
                saveBattingEntry(db, matchId, inningsNum, currentStriker, batsmanStats[currentStriker.player_id], battingTeam.id, totalRuns, overNum + (overBalls / 10));

                // Next batsman
                if (totalWickets < 10) {
                    currentBatsmanIdx += 1;
                    if (currentBatsmanIdx + 1 < battingOrder.length) {
                        strikerIdx = currentBatsmanIdx + 1;
                    } else {
                        break; // All out
                    }
                }
            } else if (outcome.type === 'dot') {
                ballResults.push('.');
            } else {
                // Runs scored: 1, 2, 3, 4, 6
                const runs = outcome.runs;
                totalRuns += runs;
                overRuns += runs;
                isMaiden = false;

                batsmanStats[currentStriker.player_id].runs += runs;
                bowlerStats[bowler.player_id].runs += runs;

                if (runs === 4) {
                    batsmanStats[currentStriker.player_id].fours += 1;
                    ballResults.push('4');
                } else if (runs === 6) {
                    batsmanStats[currentStriker.player_id].sixes += 1;
                    ballResults.push('6');
                } else {
                    ballResults.push(String(runs));
                }

                // Check milestones
                const bRuns = batsmanStats[currentStriker.player_id].runs;
                const bBalls = batsmanStats[currentStriker.player_id].balls;
                if (bRuns >= 50 && bRuns - runs < 50) {
                    notableEvents.push(`${currentStriker.name} reaches FIFTY off ${bBalls} balls!`);
                }
                if (bRuns >= 100 && bRuns - runs < 100) {
                    notableEvents.push(`${currentStriker.name} reaches a magnificent CENTURY off ${bBalls} balls!`);
                }

                // Rotate strike on odd runs
                if (runs % 2 === 1) {
                    [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];
                }
            }
        }

        // End of over: rotate strike
        [strikerIdx, nonStrikerIdx] = [nonStrikerIdx, strikerIdx];

        // Update bowler overs
        bowlerOversUsed[bowler.player_id] = (bowlerOversUsed[bowler.player_id] || 0) + 1;

        if (isMaiden) {
            bowlerStats[bowler.player_id].maidens += 1;
        }

        // Generate narrative
        const narrative = generateNarrative({
            bowlerName: bowler.name,
            strikerName: striker.name,
            overRuns,
            overWickets,
            totalRuns,
            totalWickets,
            overNum,
            totalOvers,
            target,
            format,
            notableEvents,
        });

        // Save over
        db.prepare(`
            INSERT INTO match_overs
            (match_id, innings, over_number, bowler_id, striker_id, runs_scored, bat_runs,
             wickets_taken, extras, ball_by_ball, cumulative_runs, cumulative_wickets,
             narrative, notable_event)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            matchId, inningsNum, overNum, bowler.player_id, striker.player_id,
            overRuns, overRuns - overExtras, overWickets, overExtras,
            JSON.stringify(ballResults), totalRuns, totalWickets,
            narrative, notableEvents.length > 0 ? notableEvents.join(' | ') : null
        );
    }

    // Save remaining not-out batsmen
    for (const p of battingOrder) {
        if (!batsmanStats[p.player_id].out && batsmanStats[p.player_id].balls > 0) {
            batsmanStats[p.player_id].dismissal = { type: 'not out', bowlerId: null, fielderId: null };
            saveBattingEntry(db, matchId, inningsNum, p, batsmanStats[p.player_id], battingTeam.id, null, null);
        }
    }

    // Save bowling cards
    for (const b of bowlers) {
        const stats = bowlerStats[b.player_id];
        if (stats.balls > 0) {
            const overs = Math.floor(stats.balls / 6) + (stats.balls % 6) / 10;
            const economy = stats.runs / (stats.balls / 6);

            db.prepare(`
                INSERT INTO match_bowling
                (match_id, innings, player_id, team_id, overs, overs_balls, maidens,
                 runs_conceded, wickets, economy, wides, no_balls)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                matchId, inningsNum, b.player_id, bowlingTeam.id,
                overs, stats.balls, stats.maidens, stats.runs, stats.wickets,
                Math.round(economy * 100) / 100, stats.wides, stats.noBalls
            );
        }
    }

    return { totalRuns, totalWickets };
}

// =============================================
// BALL OUTCOME RESOLUTION
// =============================================
function resolveBall(batsman, bowler, format, overNum, totalOvers, totalRuns, wickets, target, captainId, bowlingCaptain) {
    // Start with base probabilities for the format
    const probs = { ...BASE_PROBS[format] };

    // --- 1. Batsman Quality Modifier ---
    const batAvg = batsman.batting_average || 15;
    const batSR = batsman.batting_strike_rate || 100;

    const batQuality = Math.min(Math.max(batAvg / 40, 0.3), 1.5);
    const srFactor = Math.min(Math.max(batSR / 130, 0.7), 1.4);

    probs.four *= batQuality * srFactor;
    probs.six *= batQuality * srFactor;
    probs.single *= Math.sqrt(batQuality);
    probs.wicket *= (1 / batQuality) * 0.9;
    probs.dot *= (1 / (batQuality * 0.8));

    // --- 2. Bowler Quality Modifier ---
    const bowlAvg = bowler.bowling_average || 35;
    const bowlEcon = bowler.bowling_economy || 8;

    const bowlQuality = Math.min(Math.max(35 / Math.max(bowlAvg, 15), 0.5), 1.5);
    const econFactor = Math.min(Math.max(7 / Math.max(bowlEcon, 3), 0.6), 1.4);

    probs.dot *= bowlQuality * econFactor;
    probs.wicket *= bowlQuality;
    probs.four *= (1 / bowlQuality);
    probs.six *= (1 / bowlQuality);

    // --- 3. Match Situation Modifier ---
    const overPhase = overNum / totalOvers;

    if (format === 't20i' || format === 'odi') {
        if (overNum <= 6) {
            // Powerplay
            probs.four *= 1.15;
            probs.six *= 1.10;
        } else if (overPhase > 0.8) {
            // Death overs
            probs.four *= 1.25;
            probs.six *= 1.30;
            probs.wicket *= 1.20;
        } else {
            // Middle overs
            probs.dot *= 1.10;
        }
    }

    // Run chase pressure (2nd innings)
    if (target) {
        const runsNeeded = target - totalRuns;
        const ballsRemaining = (totalOvers * 6) - (overNum * 6);
        const requiredRate = (runsNeeded / Math.max(ballsRemaining, 1)) * 6;

        if (requiredRate > 10) {
            probs.four *= 1.30;
            probs.six *= 1.40;
            probs.wicket *= 1.40;
        } else if (requiredRate < 5) {
            probs.wicket *= 0.70;
        }
    }

    // --- 4. Captain Bonus ---
    if (captainId === batsman.player_id) {
        probs.four *= 1.05;
        probs.six *= 1.05;
        probs.wicket *= 0.95;
    }
    if (captainId) {
        probs.single *= 1.02;
        probs.double *= 1.02;
    }

    // --- 5. Randomness Jitter ---
    for (const key of Object.keys(probs)) {
        probs[key] *= (0.82 + Math.random() * 0.36); // ±18%
    }

    // --- 6. Normalize ---
    const total = Object.values(probs).reduce((sum, v) => sum + v, 0);
    for (const key of Object.keys(probs)) {
        probs[key] /= total;
    }

    // --- 7. Roll ---
    const roll = Math.random();
    let cumulative = 0;

    const outcomes = [
        { type: 'dot', runs: 0 },
        { type: 'single', runs: 1 },
        { type: 'double', runs: 2 },
        { type: 'triple', runs: 3 },
        { type: 'four', runs: 4 },
        { type: 'six', runs: 6 },
        { type: 'wicket', runs: 0 },
        { type: 'extras', runs: 0 },
    ];

    const probKeys = ['dot', 'single', 'double', 'triple', 'four', 'six', 'wicket', 'extras'];

    for (let i = 0; i < probKeys.length; i++) {
        cumulative += probs[probKeys[i]];
        if (roll <= cumulative) {
            const outcome = outcomes[i];
            // Convert extras to wide or no_ball
            if (outcome.type === 'extras') {
                return { type: Math.random() < 0.6 ? 'wide' : 'no_ball', runs: 1 };
            }
            return outcome;
        }
    }

    // Fallback
    return { type: 'dot', runs: 0 };
}

// =============================================
// DISMISSAL DETERMINATION
// =============================================
function determineDismissal(bowler, bowlingTeam) {
    const roll = Math.random();
    let cumulative = 0;

    for (const d of DISMISSAL_TYPES) {
        cumulative += d.prob;
        if (roll <= cumulative) {
            let fielderId = null;

            if (['caught', 'run out'].includes(d.type)) {
                const fielders = bowlingTeam.players.filter(p => p.player_id !== bowler.player_id);
                if (fielders.length > 0) {
                    fielderId = fielders[Math.floor(Math.random() * fielders.length)].player_id;
                }
            } else if (d.type === 'stumped') {
                const keeper = bowlingTeam.players.find(p => p.is_wicketkeeper);
                fielderId = keeper ? keeper.player_id : null;
            } else if (d.type === 'caught & bowled') {
                fielderId = bowler.player_id;
            }

            return { type: d.type, fielderId };
        }
    }

    return { type: 'caught', fielderId: null };
}

// =============================================
// BOWLER SELECTION
// =============================================
function selectBowler(bowlers, bowlerOversUsed, maxPerBowler, overNum, totalOvers, format, lastBowlerId) {
    // Filter to bowlers who haven't exceeded their max and didn't bowl last over
    const available = bowlers.filter(b =>
        (bowlerOversUsed[b.player_id] || 0) < (format === 'test' ? 20 : maxPerBowler) &&
        b.player_id !== lastBowlerId
    );

    // If no one is available (excluding last bowler), allow last bowler too
    const pool = available.length > 0 ? available : bowlers.filter(b =>
        (bowlerOversUsed[b.player_id] || 0) < (format === 'test' ? 20 : maxPerBowler)
    );

    if (pool.length === 0) {
        // Fallback: any bowler
        return bowlers[Math.floor(Math.random() * bowlers.length)];
    }

    // Weight selection by bowling rating
    const weighted = pool.map(b => {
        const rating = b.bowling_average ? (40 / b.bowling_average) : 0.5;
        const oversLeft = maxPerBowler - (bowlerOversUsed[b.player_id] || 0);
        return { bowler: b, weight: rating * Math.max(oversLeft, 0.5) };
    });

    // Weighted random selection
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let wRoll = Math.random() * totalWeight;

    for (const w of weighted) {
        wRoll -= w.weight;
        if (wRoll <= 0) return w.bowler;
    }

    return pool[0];
}

// =============================================
// HELPER: Save batting entry
// =============================================
function saveBattingEntry(db, matchId, innings, player, stats, teamId, fowScore, fowOver) {
    const sr = stats.balls > 0 ? Math.round((stats.runs / stats.balls) * 100 * 100) / 100 : 0;

    db.prepare(`
        INSERT INTO match_batting
        (match_id, innings, player_id, team_id, batting_position, runs, balls_faced,
         fours, sixes, strike_rate, dismissal_type, dismissal_bowler_id, dismissal_fielder_id,
         fall_of_wicket_score, fall_of_wicket_over)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        matchId, innings, player.player_id, teamId, player.batting_position,
        stats.runs, stats.balls, stats.fours, stats.sixes, sr,
        stats.dismissal?.type || 'did not bat',
        stats.dismissal?.bowlerId || null,
        stats.dismissal?.fielderId || null,
        fowScore || null, fowOver || null
    );
}

// =============================================
// HELPER: Format dismissal for display
// =============================================
function formatDismissal(dismissal, bowlerName) {
    switch (dismissal.type) {
        case 'caught': return `c [fielder] b ${bowlerName}`;
        case 'bowled': return `b ${bowlerName}`;
        case 'lbw': return `lbw b ${bowlerName}`;
        case 'run out': return `run out`;
        case 'stumped': return `st [keeper] b ${bowlerName}`;
        case 'hit wicket': return `hit wicket b ${bowlerName}`;
        case 'caught & bowled': return `c & b ${bowlerName}`;
        default: return `b ${bowlerName}`;
    }
}

// =============================================
// TEST MATCH SIMULATION
// =============================================
function simulateTestMatch(db, matchId, format, teamA, teamB, battingFirst, bowlingFirst) {
    const innings1 = simulateInnings(db, matchId, 1, 'test', 90, battingFirst, bowlingFirst, null);
    const innings2 = simulateInnings(db, matchId, 2, 'test', 90, bowlingFirst, battingFirst, null);
    const innings3 = simulateInnings(db, matchId, 3, 'test', 90, battingFirst, bowlingFirst, null);

    const targetRuns = (innings1.totalRuns + innings3.totalRuns) - innings2.totalRuns + 1;
    const innings4 = simulateInnings(db, matchId, 4, 'test', 90, bowlingFirst, battingFirst, targetRuns);

    const team2Total = innings2.totalRuns + innings4.totalRuns;
    const team1Total = innings1.totalRuns + innings3.totalRuns;

    let summary, type, margin;
    if (team2Total >= targetRuns + innings2.totalRuns - 1) {
        const wicketsRemaining = 10 - innings4.totalWickets;
        summary = `${bowlingFirst.name} beat ${battingFirst.name} by ${wicketsRemaining} wickets`;
        type = 'wickets';
        margin = `${wicketsRemaining} wickets`;
    } else if (innings4.totalWickets < 10 && innings4.totalRuns < targetRuns) {
        summary = `${battingFirst.name} vs ${bowlingFirst.name} — Match Drawn`;
        type = 'draw';
        margin = 'draw';
    } else {
        const runMargin = team1Total - team2Total;
        summary = `${battingFirst.name} beat ${bowlingFirst.name} by ${runMargin} runs`;
        type = 'runs';
        margin = `${runMargin} runs`;
    }

    return { summary, type, margin };
}

module.exports = { runSimulation };
