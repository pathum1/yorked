async function teamRoutes(fastify, options) {
    const db = fastify.db;

    // LIST USER'S TEAMS
    fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const teams = db.prepare(`
            SELECT t.*,
                   COUNT(tp.id) as player_count,
                   GROUP_CONCAT(p.name, ', ') as player_names
            FROM teams t
            LEFT JOIN team_players tp ON t.id = tp.team_id
            LEFT JOIN players p ON tp.player_id = p.id
            WHERE t.user_id = ?
            GROUP BY t.id
            ORDER BY t.updated_at DESC
        `).all(request.user.id);

        return { teams };
    });

    // CREATE TEAM
    fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const { name, logo, format } = request.body;

        if (!name || !logo || !format) {
            return reply.status(400).send({ error: 'Name, logo, and format are required' });
        }

        if (!['t20i', 'odi', 'test'].includes(format)) {
            return reply.status(400).send({ error: 'Format must be t20i, odi, or test' });
        }

        // Check team limit (max 5)
        const teamCount = db.prepare('SELECT COUNT(*) as count FROM teams WHERE user_id = ?')
            .get(request.user.id).count;
        if (teamCount >= 5) {
            return reply.status(400).send({ error: 'Maximum 5 teams allowed. Delete a team first.' });
        }

        const result = db.prepare(
            'INSERT INTO teams (user_id, name, logo, format) VALUES (?, ?, ?, ?)'
        ).run(request.user.id, name.trim(), logo, format);

        return { id: result.lastInsertRowid, name: name.trim(), logo, format };
    });

    // GET TEAM DETAILS WITH PLAYERS
    fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const team = db.prepare('SELECT * FROM teams WHERE id = ? AND user_id = ?')
            .get(request.params.id, request.user.id);

        if (!team) {
            return reply.status(404).send({ error: 'Team not found' });
        }

        const players = db.prepare(`
            SELECT tp.*, p.name, p.country, p.batting_style, p.bowling_style,
                   p.computed_role, p.computed_sub_role,
                   ps.batting_matches, ps.batting_average, ps.batting_strike_rate, ps.batting_runs,
                   ps.bowling_matches, ps.bowling_wickets, ps.bowling_economy, ps.bowling_average,
                   c.flag_emoji, c.avatar_color
            FROM team_players tp
            JOIN players p ON tp.player_id = p.id
            LEFT JOIN player_stats ps ON p.id = ps.player_id AND ps.format = ?
            LEFT JOIN countries c ON p.country = c.name
            WHERE tp.team_id = ?
            ORDER BY tp.batting_position ASC
        `).all(team.format, team.id);

        return { team, players };
    });

    // UPDATE TEAM (add/remove players, reorder, update name/logo)
    fastify.put('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const team = db.prepare('SELECT * FROM teams WHERE id = ? AND user_id = ?')
            .get(request.params.id, request.user.id);

        if (!team) {
            return reply.status(404).send({ error: 'Team not found' });
        }

        const { name, logo, players } = request.body;

        const updateTeam = db.transaction(() => {
            // Update team metadata if provided
            if (name) {
                db.prepare('UPDATE teams SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                    .run(name.trim(), team.id);
            }
            if (logo) {
                db.prepare('UPDATE teams SET logo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                    .run(logo, team.id);
            }

            // Replace entire player roster if provided
            if (players && Array.isArray(players)) {
                // Remove existing players
                db.prepare('DELETE FROM team_players WHERE team_id = ?').run(team.id);

                // Insert new players
                const insertPlayer = db.prepare(`
                    INSERT INTO team_players
                    (team_id, player_id, batting_position, bowling_overs, bowling_priority, is_captain, is_wicketkeeper)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);

                for (const p of players) {
                    insertPlayer.run(
                        team.id,
                        p.playerId,
                        p.battingPosition,
                        p.bowlingOvers || 0,
                        p.bowlingPriority || null,
                        p.isCaptain ? 1 : 0,
                        p.isWicketkeeper ? 1 : 0
                    );
                }

                // Reset ready status on save — user must explicitly Mark Ready after changes
                db.prepare('UPDATE teams SET is_ready = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                    .run(team.id);
            }
        });

        updateTeam();

        return { success: true };
    });

    // MARK TEAM AS READY (with validation)
    fastify.post('/:id/ready', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const team = db.prepare('SELECT * FROM teams WHERE id = ? AND user_id = ?')
            .get(request.params.id, request.user.id);

        if (!team) {
            return reply.status(404).send({ error: 'Team not found' });
        }

        const players = db.prepare('SELECT * FROM team_players WHERE team_id = ?').all(team.id);

        // Validation
        const errors = [];

        if (players.length !== 11) {
            errors.push(`Need exactly 11 players (currently ${players.length})`);
        }

        if (!team.name || team.name.trim() === '') {
            errors.push('Team name is required');
        }

        if (!team.logo) {
            errors.push('Team logo is required');
        }

        const hasCaptain = players.some(p => p.is_captain);
        if (!hasCaptain) {
            errors.push('A captain must be designated');
        }

        // Check bowling allocation for limited-overs
        if (team.format !== 'test') {
            const totalOvers = team.format === 't20i' ? 20 : 50;
            const allocatedOvers = players.reduce((sum, p) => sum + (p.bowling_overs || 0), 0);
            if (Math.abs(allocatedOvers - totalOvers) > 0.1) {
                errors.push(`Bowling overs must total ${totalOvers} (currently ${allocatedOvers})`);
            }
        } else {
            // Test: at least 2 primary bowlers
            const primaryCount = players.filter(p => p.bowling_priority === 'primary').length;
            if (primaryCount < 2) {
                errors.push('At least 2 primary bowlers required for Test matches');
            }
        }

        if (errors.length > 0) {
            return reply.status(400).send({ errors });
        }

        db.prepare('UPDATE teams SET is_ready = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(team.id);

        return { success: true, ready: true };
    });

    // DELETE TEAM
    fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const team = db.prepare('SELECT * FROM teams WHERE id = ? AND user_id = ?')
            .get(request.params.id, request.user.id);

        if (!team) {
            return reply.status(404).send({ error: 'Team not found' });
        }

        db.prepare('DELETE FROM teams WHERE id = ?').run(team.id);

        return { success: true };
    });
}

module.exports = teamRoutes;
