-- ============================================
-- YORKED v2 — Complete Database Schema
-- ============================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------
-- USERS
-- ---------------------
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ---------------------
-- PLAYERS (real cricket players)
-- ---------------------
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cricinfo_id TEXT UNIQUE,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    date_of_birth TEXT,
    batting_style TEXT,
    bowling_style TEXT,
    role_tag TEXT,
    computed_role TEXT,
    computed_sub_role TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_players_name ON players(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_players_country ON players(country);
CREATE INDEX IF NOT EXISTS idx_players_role ON players(computed_role);
CREATE INDEX IF NOT EXISTS idx_players_active ON players(is_active);

-- ---------------------
-- PLAYER STATS (per format)
-- ---------------------
CREATE TABLE IF NOT EXISTS player_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    format TEXT NOT NULL CHECK(format IN ('t20i', 'odi', 'test')),

    -- Batting
    batting_matches INTEGER DEFAULT 0,
    batting_innings INTEGER DEFAULT 0,
    batting_not_outs INTEGER DEFAULT 0,
    batting_runs INTEGER DEFAULT 0,
    batting_balls_faced INTEGER DEFAULT 0,
    batting_high_score INTEGER DEFAULT 0,
    batting_high_score_not_out BOOLEAN DEFAULT 0,
    batting_average REAL DEFAULT 0.0,
    batting_strike_rate REAL DEFAULT 0.0,
    batting_50s INTEGER DEFAULT 0,
    batting_100s INTEGER DEFAULT 0,
    batting_fours INTEGER DEFAULT 0,
    batting_sixes INTEGER DEFAULT 0,

    -- Bowling
    bowling_matches INTEGER DEFAULT 0,
    bowling_innings INTEGER DEFAULT 0,
    bowling_balls INTEGER DEFAULT 0,
    bowling_runs INTEGER DEFAULT 0,
    bowling_wickets INTEGER DEFAULT 0,
    bowling_average REAL DEFAULT 0.0,
    bowling_economy REAL DEFAULT 0.0,
    bowling_strike_rate REAL DEFAULT 0.0,
    bowling_best_figures_wickets INTEGER DEFAULT 0,
    bowling_best_figures_runs INTEGER DEFAULT 0,
    bowling_4w INTEGER DEFAULT 0,
    bowling_5w INTEGER DEFAULT 0,

    -- Fielding
    fielding_catches INTEGER DEFAULT 0,
    fielding_stumpings INTEGER DEFAULT 0,
    fielding_run_outs INTEGER DEFAULT 0,

    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE(player_id, format)
);

CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_format ON player_stats(format);
CREATE INDEX IF NOT EXISTS idx_player_stats_batting_avg ON player_stats(format, batting_average);

-- ---------------------
-- TEAMS
-- ---------------------
CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    logo TEXT NOT NULL,
    format TEXT NOT NULL CHECK(format IN ('t20i', 'odi', 'test')),
    is_ready BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_teams_user ON teams(user_id);

-- ---------------------
-- TEAM PLAYERS (11 per team)
-- ---------------------
CREATE TABLE IF NOT EXISTS team_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    batting_position INTEGER NOT NULL CHECK(batting_position BETWEEN 1 AND 11),
    bowling_overs REAL DEFAULT 0,
    bowling_priority TEXT,
    is_captain BOOLEAN DEFAULT 0,
    is_wicketkeeper BOOLEAN DEFAULT 0,

    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id),
    UNIQUE(team_id, player_id),
    UNIQUE(team_id, batting_position)
);

CREATE INDEX IF NOT EXISTS idx_team_players_team ON team_players(team_id);

-- ---------------------
-- MATCHES
-- ---------------------
CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_code TEXT UNIQUE NOT NULL,
    format TEXT NOT NULL CHECK(format IN ('t20i', 'odi', 'test')),
    status TEXT NOT NULL DEFAULT 'waiting'
        CHECK(status IN ('waiting', 'conflict_resolution', 'simulating', 'completed', 'cancelled')),

    team_a_id INTEGER NOT NULL,
    team_b_id INTEGER,
    user_a_id INTEGER NOT NULL,
    user_b_id INTEGER,

    toss_winner TEXT CHECK(toss_winner IN ('team_a', 'team_b')),
    toss_decision TEXT CHECK(toss_decision IN ('bat', 'bowl')),

    result_summary TEXT,
    result_type TEXT,
    result_margin TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    joined_at DATETIME,
    started_at DATETIME,
    completed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_matches_code ON matches(match_code);
CREATE INDEX IF NOT EXISTS idx_matches_user_a ON matches(user_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON matches(user_b_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- ---------------------
-- MATCH CONFLICTS
-- ---------------------
CREATE TABLE IF NOT EXISTS match_conflicts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    team_a_replacement_id INTEGER,
    team_b_replacement_id INTEGER,
    team_a_resolved BOOLEAN DEFAULT 0,
    team_b_resolved BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,

    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id)
);

-- ---------------------
-- MATCH OVERS (over-by-over simulation results)
-- ---------------------
CREATE TABLE IF NOT EXISTS match_overs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    innings INTEGER NOT NULL,
    over_number INTEGER NOT NULL,
    bowler_id INTEGER NOT NULL,
    striker_id INTEGER NOT NULL,
    runs_scored INTEGER DEFAULT 0,
    bat_runs INTEGER DEFAULT 0,
    wickets_taken INTEGER DEFAULT 0,
    extras INTEGER DEFAULT 0,
    extras_detail TEXT,
    ball_by_ball TEXT,
    cumulative_runs INTEGER DEFAULT 0,
    cumulative_wickets INTEGER DEFAULT 0,
    narrative TEXT,
    notable_event TEXT,

    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (bowler_id) REFERENCES players(id),
    FOREIGN KEY (striker_id) REFERENCES players(id)
);

CREATE INDEX IF NOT EXISTS idx_match_overs_match ON match_overs(match_id, innings, over_number);

-- ---------------------
-- MATCH BATTING CARD
-- ---------------------
CREATE TABLE IF NOT EXISTS match_batting (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    innings INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    batting_position INTEGER NOT NULL,
    runs INTEGER DEFAULT 0,
    balls_faced INTEGER DEFAULT 0,
    fours INTEGER DEFAULT 0,
    sixes INTEGER DEFAULT 0,
    strike_rate REAL DEFAULT 0.0,
    dismissal_type TEXT,
    dismissal_bowler_id INTEGER,
    dismissal_fielder_id INTEGER,
    fall_of_wicket_score INTEGER,
    fall_of_wicket_over REAL,

    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE INDEX IF NOT EXISTS idx_match_batting_match ON match_batting(match_id, innings);

-- ---------------------
-- MATCH BOWLING CARD
-- ---------------------
CREATE TABLE IF NOT EXISTS match_bowling (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL,
    innings INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    overs REAL DEFAULT 0.0,
    overs_balls INTEGER DEFAULT 0,
    maidens INTEGER DEFAULT 0,
    runs_conceded INTEGER DEFAULT 0,
    wickets INTEGER DEFAULT 0,
    economy REAL DEFAULT 0.0,
    wides INTEGER DEFAULT 0,
    no_balls INTEGER DEFAULT 0,

    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE INDEX IF NOT EXISTS idx_match_bowling_match ON match_bowling(match_id, innings);

-- ---------------------
-- COUNTRIES (reference table)
-- ---------------------
CREATE TABLE IF NOT EXISTS countries (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    flag_emoji TEXT,
    avatar_color TEXT NOT NULL
);

-- Seed countries
INSERT OR IGNORE INTO countries (code, name, flag_emoji, avatar_color) VALUES
    ('AFG', 'Afghanistan', '🇦🇫', '#1565C0'),
    ('AUS', 'Australia', '🇦🇺', '#FFD600'),
    ('BAN', 'Bangladesh', '🇧🇩', '#2E7D32'),
    ('ENG', 'England', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '#1A237E'),
    ('IND', 'India', '🇮🇳', '#1E88E5'),
    ('IRE', 'Ireland', '🇮🇪', '#43A047'),
    ('NZ',  'New Zealand', '🇳🇿', '#212121'),
    ('PAK', 'Pakistan', '🇵🇰', '#1B5E20'),
    ('SA',  'South Africa', '🇿🇦', '#2E7D32'),
    ('SL',  'Sri Lanka', '🇱🇰', '#0D47A1'),
    ('WI',  'West Indies', '🏴', '#7B1FA2'),
    ('ZIM', 'Zimbabwe', '🇿🇼', '#C62828'),
    ('SCO', 'Scotland', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '#1565C0'),
    ('NAM', 'Namibia', '🇳🇦', '#1565C0'),
    ('NEP', 'Nepal', '🇳🇵', '#C62828'),
    ('NED', 'Netherlands', '🇳🇱', '#E65100'),
    ('OMA', 'Oman', '🇴🇲', '#C62828'),
    ('PNG', 'Papua New Guinea', '🇵🇬', '#C62828'),
    ('UAE', 'United Arab Emirates', '🇦🇪', '#212121'),
    ('USA', 'United States', '🇺🇸', '#1565C0');

-- ---------------------
-- TEAM LOGOS (preset icon options)
-- ---------------------
CREATE TABLE IF NOT EXISTS team_logos (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    svg_icon TEXT NOT NULL
);

INSERT OR IGNORE INTO team_logos (id, name, svg_icon) VALUES
    ('shield', 'Shield', 'Shield'),
    ('flame', 'Flame', 'Flame'),
    ('sword', 'Sword', 'Sword'),
    ('crown', 'Crown', 'Crown'),
    ('lightning', 'Lightning', 'Zap'),
    ('star', 'Star', 'Star'),
    ('trophy', 'Trophy', 'Trophy'),
    ('target', 'Target', 'Target'),
    ('rocket', 'Rocket', 'Rocket'),
    ('mountain', 'Mountain', 'Mountain'),
    ('eagle', 'Eagle', 'Bird'),
    ('wolf', 'Wolf', 'Dog'),
    ('cobra', 'Cobra', 'Bug'),
    ('phoenix', 'Phoenix', 'Feather'),
    ('trident', 'Trident', 'Anchor'),
    ('hammer', 'Hammer', 'Hammer'),
    ('diamond', 'Diamond', 'Diamond'),
    ('fortress', 'Fortress', 'Castle'),
    ('storm', 'Storm', 'CloudLightning'),
    ('skull', 'Skull', 'Skull');
