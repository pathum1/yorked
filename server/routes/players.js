async function playerRoutes(fastify, options) {
    const db = fastify.db;

    // SEARCH / LIST PLAYERS
    // GET /api/players?search=kohli&format=t20i
    // GET /api/players?country=India&format=t20i
    // GET /api/players?format=t20i&active=true
    fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const { search, country, format, active, limit = 50, offset = 0 } = request.query;

        if (!format) {
            return reply.status(400).send({ error: 'Format parameter is required (t20i, odi, test)' });
        }

        let query = `
            SELECT p.*, ps.batting_average, ps.batting_strike_rate, ps.batting_runs,
                   ps.batting_matches, ps.bowling_wickets, ps.bowling_economy,
                   ps.bowling_average, ps.bowling_matches,
                   c.flag_emoji, c.avatar_color, c.code as country_code
            FROM players p
            LEFT JOIN player_stats ps ON p.id = ps.player_id AND ps.format = ?
            LEFT JOIN countries c ON p.country = c.name
            WHERE 1=1
        `;
        const params = [format];

        if (search) {
            query += ` AND p.name LIKE ?`;
            params.push(`%${search}%`);
        }

        if (country) {
            query += ` AND p.country = ?`;
            params.push(country);
        }

        if (active !== undefined && active !== '') {
            query += ` AND p.is_active = ?`;
            params.push(active === 'true' || active === '1' ? 1 : 0);
        }

        // Default: sort by total matches descending (relevant players first)
        query += ` ORDER BY COALESCE(ps.batting_matches, 0) + COALESCE(ps.bowling_matches, 0) DESC`;
        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));

        const players = db.prepare(query).all(...params);

        return { players, total: players.length };
    });

    // GET SINGLE PLAYER WITH ALL FORMAT STATS
    // GET /api/players/:id?format=t20i
    fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const { id } = request.params;
        const { format } = request.query;

        const player = db.prepare(`
            SELECT p.*, c.flag_emoji, c.avatar_color, c.code as country_code
            FROM players p
            LEFT JOIN countries c ON p.country = c.name
            WHERE p.id = ?
        `).get(id);

        if (!player) {
            return reply.status(404).send({ error: 'Player not found' });
        }

        // Get stats for requested format, or all formats
        let stats;
        if (format) {
            stats = db.prepare('SELECT * FROM player_stats WHERE player_id = ? AND format = ?').get(id, format);
        } else {
            stats = db.prepare('SELECT * FROM player_stats WHERE player_id = ?').all(id);
        }

        return { player, stats };
    });
}

module.exports = playerRoutes;
