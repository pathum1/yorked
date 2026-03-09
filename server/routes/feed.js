async function feedRoutes(fastify, options) {
    const db = fastify.db;

    // GET GLOBAL FEED (last 10 completed matches)
    fastify.get('/', async (request, reply) => {
        const feed = db.prepare(`
            SELECT m.id, m.format, m.result_summary, m.completed_at,
                   ta.name as team_a_name, ta.logo as team_a_logo,
                   tb.name as team_b_name, tb.logo as team_b_logo,
                   ua.display_name as coach_a,
                   ub.display_name as coach_b
            FROM matches m
            JOIN teams ta ON m.team_a_id = ta.id
            JOIN teams tb ON m.team_b_id = tb.id
            JOIN users ua ON m.user_a_id = ua.id
            JOIN users ub ON m.user_b_id = ub.id
            WHERE m.status = 'completed'
            ORDER BY m.completed_at DESC
            LIMIT 10
        `).all();

        return { feed };
    });
}

module.exports = feedRoutes;
