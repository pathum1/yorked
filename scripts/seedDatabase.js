/**
 * YORKED v2 — Database Seeding Script
 * Reads players_seed.json and populates the SQLite database.
 */
const fs = require('fs');
const path = require('path');
const { initializeDatabase } = require('../server/db/init');

async function seed() {
    console.log('=== YORKED v2 Database Seeding ===\n');
    const db = initializeDatabase();

    const seedPath = path.join(__dirname, 'players_seed.json');
    if (!fs.existsSync(seedPath)) {
        console.error('ERROR: players_seed.json not found!');
        console.error('Run "node scripts/generateSeedData.js" first.');
        process.exit(1);
    }

    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
    console.log(`Seed file: ${seedData._meta.total_players} players from ${seedData._meta.countries.join(', ')}`);

    // --- Insert countries ---
    console.log('Inserting countries...');
    const insertCountry = db.prepare(
        'INSERT OR REPLACE INTO countries (code, name, flag_emoji, avatar_color) VALUES (?, ?, ?, ?)'
    );
    const FLAG_EMOJIS = { SL:'🇱🇰', IND:'🇮🇳', AUS:'🇦🇺', ENG:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', NZ:'🇳🇿', SA:'🇿🇦', WI:'🏴' };
    for (const country of seedData.countries) {
        insertCountry.run(country.code, country.name, FLAG_EMOJIS[country.code] || '🏏', country.avatar_color);
    }

    // --- Insert players and stats ---
    console.log('Inserting players and stats...');
    const insertPlayer = db.prepare(
        `INSERT OR REPLACE INTO players (cricinfo_id, name, country, date_of_birth, batting_style, bowling_style,
         role_tag, computed_role, computed_sub_role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    );
    const insertStats = db.prepare(
        `INSERT OR REPLACE INTO player_stats
         (player_id, format, batting_matches, batting_innings, batting_not_outs, batting_runs,
          batting_balls_faced, batting_high_score, batting_average, batting_strike_rate,
          batting_100s, batting_50s, batting_fours, batting_sixes,
          bowling_matches, bowling_innings, bowling_balls, bowling_runs, bowling_wickets,
          bowling_average, bowling_economy, bowling_strike_rate,
          bowling_best_figures_wickets, bowling_best_figures_runs, bowling_4w, bowling_5w,
          fielding_catches, fielding_stumpings)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const getPlayerId = db.prepare('SELECT id FROM players WHERE cricinfo_id = ?');

    let inserted = 0, statsInserted = 0;

    const insertAll = db.transaction(() => {
        for (const p of seedData.players) {
            insertPlayer.run(p.cricinfo_id, p.name, p.country, p.date_of_birth || null,
                p.batting_style || null, p.bowling_style || null,
                p.role_tag || null, p.computed_role, p.computed_sub_role);

            const player = getPlayerId.get(p.cricinfo_id);
            if (!player) continue;
            inserted++;

            // Insert T20I stats
            if (p.t20i_batting || p.t20i_bowling) {
                const bat = p.t20i_batting || {};
                const bowl = p.t20i_bowling || {};
                let bfWkts = 0, bfRuns = 0;
                const bf = bowl.best_figures || '0/0';
                if (bf.includes('/')) { const parts = bf.split('/'); bfWkts = parseInt(parts[0])||0; bfRuns = parseInt(parts[1])||0; }
                insertStats.run(player.id, 't20i',
                    bat.matches||0, bat.innings||0, bat.not_outs||0, bat.runs||0,
                    bat.balls_faced||0, bat.high_score||0, bat.average||0, bat.strike_rate||0,
                    bat.hundreds||0, bat.fifties||0, bat.fours||0, bat.sixes||0,
                    bowl.matches||0, bowl.innings||0, bowl.balls||0, bowl.runs||0,
                    bowl.wickets||0, bowl.average||0, bowl.economy||0, bowl.strike_rate||0,
                    bfWkts, bfRuns, bowl.four_wickets||0, bowl.five_wickets||0,
                    bat.catches||0, bat.stumpings||0);
                statsInserted++;
            }

            // Insert ODI stats
            if (p.odi_batting || p.odi_bowling) {
                const bat = p.odi_batting || {};
                const bowl = p.odi_bowling || {};
                let bfWkts = 0, bfRuns = 0;
                const bf = bowl.best_figures || '0/0';
                if (bf.includes('/')) { const parts = bf.split('/'); bfWkts = parseInt(parts[0])||0; bfRuns = parseInt(parts[1])||0; }
                insertStats.run(player.id, 'odi',
                    bat.matches||0, bat.innings||0, bat.not_outs||0, bat.runs||0,
                    bat.balls_faced||0, bat.high_score||0, bat.average||0, bat.strike_rate||0,
                    bat.hundreds||0, bat.fifties||0, bat.fours||0, bat.sixes||0,
                    bowl.matches||0, bowl.innings||0, bowl.balls||0, bowl.runs||0,
                    bowl.wickets||0, bowl.average||0, bowl.economy||0, bowl.strike_rate||0,
                    bfWkts, bfRuns, bowl.four_wickets||0, bowl.five_wickets||0,
                    bat.catches||0, bat.stumpings||0);
                statsInserted++;
            }
        }
    });

    insertAll();

    const playerCount = db.prepare('SELECT COUNT(*) as c FROM players').get().c;
    const statsCount = db.prepare('SELECT COUNT(*) as c FROM player_stats').get().c;
    const countries = db.prepare('SELECT country, COUNT(*) as c FROM players GROUP BY country ORDER BY c DESC').all();
    const roles = db.prepare('SELECT computed_role, COUNT(*) as c FROM players GROUP BY computed_role').all();

    console.log(`\n=== Seeding Complete ===`);
    console.log(`Players inserted: ${inserted}`);
    console.log(`Stat rows inserted: ${statsInserted}`);
    console.log(`Total players in DB: ${playerCount}`);
    console.log(`Total stat entries: ${statsCount}`);
    console.log(`\nPer country:`, countries.map(c => `${c.country}: ${c.c}`).join(', '));
    console.log(`Roles:`, roles.map(r => `${r.computed_role}: ${r.c}`).join(', '));

    db.close();
}

seed().catch(err => { console.error('Seeding failed:', err); process.exit(1); });
