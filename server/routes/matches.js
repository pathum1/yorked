const { generateMatchCode } = require('../utils/matchCodeGenerator');
const { runSimulation } = require('../services/simulationEngine');

async function matchRoutes(fastify, options) {
    const db = fastify.db;

    // CREATE MATCH
    fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const { teamId } = request.body;

        const team = db.prepare('SELECT * FROM teams WHERE id = ? AND user_id = ? AND is_ready = 1')
            .get(teamId, request.user.id);

        if (!team) {
            return reply.status(400).send({ error: 'Team not found or not ready' });
        }

        const matchCode = generateMatchCode(team.name);

        const result = db.prepare(`
            INSERT INTO matches (match_code, format, status, team_a_id, user_a_id)
            VALUES (?, ?, 'waiting', ?, ?)
        `).run(matchCode, team.format, team.id, request.user.id);

        return {
            matchId: result.lastInsertRowid,
            matchCode,
            format: team.format
        };
    });

    // JOIN MATCH
    fastify.post('/join', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const { matchCode, teamId } = request.body;

        const match = db.prepare('SELECT * FROM matches WHERE match_code = ? AND status = ?')
            .get(matchCode.toUpperCase(), 'waiting');

        if (!match) {
            return reply.status(404).send({ error: 'Match not found or already started' });
        }

        if (match.user_a_id === request.user.id) {
            return reply.status(400).send({ error: 'You cannot join your own match' });
        }

        const team = db.prepare('SELECT * FROM teams WHERE id = ? AND user_id = ? AND is_ready = 1')
            .get(teamId, request.user.id);

        if (!team) {
            return reply.status(400).send({ error: 'Team not found or not ready' });
        }

        if (team.format !== match.format) {
            return reply.status(400).send({
                error: `Format mismatch: match is ${match.format}, your team is ${team.format}`
            });
        }

        // Check for player conflicts
        const teamAPlayers = db.prepare('SELECT player_id FROM team_players WHERE team_id = ?')
            .all(match.team_a_id).map(p => p.player_id);
        const teamBPlayers = db.prepare('SELECT player_id FROM team_players WHERE team_id = ?')
            .all(team.id).map(p => p.player_id);

        const conflicts = teamAPlayers.filter(id => teamBPlayers.includes(id));

        const joinMatch = db.transaction(() => {
            // Update match with team B
            db.prepare(`
                UPDATE matches SET team_b_id = ?, user_b_id = ?, joined_at = CURRENT_TIMESTAMP,
                    status = ? WHERE id = ?
            `).run(
                team.id,
                request.user.id,
                conflicts.length > 0 ? 'conflict_resolution' : 'simulating',
                match.id
            );

            // If conflicts, create conflict records
            if (conflicts.length > 0) {
                const insertConflict = db.prepare(
                    'INSERT INTO match_conflicts (match_id, player_id) VALUES (?, ?)'
                );
                for (const playerId of conflicts) {
                    insertConflict.run(match.id, playerId);
                }
            }
        });

        joinMatch();

        // Notify Coach A via Socket.IO
        if (fastify.io) {
            fastify.io.to(`user_${match.user_a_id}`).emit('match:opponent_joined', {
                matchId: match.id,
                opponentName: request.user.username,
            });

            if (conflicts.length > 0) {
                const conflictPlayers = db.prepare(
                    `SELECT id, name FROM players WHERE id IN (${conflicts.map(() => '?').join(',')})`
                ).all(...conflicts);

                fastify.io.to(`user_${match.user_a_id}`).emit('match:conflict_detected', {
                    matchId: match.id,
                    players: conflictPlayers,
                });
                fastify.io.to(`user_${request.user.id}`).emit('match:conflict_detected', {
                    matchId: match.id,
                    players: conflictPlayers,
                });
            }
        }

        // If no conflicts, run simulation immediately
        if (conflicts.length === 0) {
            setImmediate(async () => {
                try {
                    await runSimulation(db, match.id, fastify.io);
                } catch (err) {
                    fastify.log.error('Simulation error:', err);
                }
            });
        }

        return {
            matchId: match.id,
            conflicts: conflicts.length,
            status: conflicts.length > 0 ? 'conflict_resolution' : 'simulating'
        };
    });

    // LIST USER'S MATCHES
    fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const matches = db.prepare(`
            SELECT m.*,
                   ta.name as team_a_name, ta.logo as team_a_logo,
                   tb.name as team_b_name, tb.logo as team_b_logo,
                   ua.display_name as user_a_name,
                   ub.display_name as user_b_name
            FROM matches m
            JOIN teams ta ON m.team_a_id = ta.id
            LEFT JOIN teams tb ON m.team_b_id = tb.id
            JOIN users ua ON m.user_a_id = ua.id
            LEFT JOIN users ub ON m.user_b_id = ub.id
            WHERE m.user_a_id = ? OR m.user_b_id = ?
            ORDER BY m.created_at DESC
            LIMIT 20
        `).all(request.user.id, request.user.id);

        return { matches };
    });

    // GET MATCH DETAILS
    fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const match = db.prepare(`
            SELECT m.*,
                   ta.name as team_a_name, ta.logo as team_a_logo,
                   tb.name as team_b_name, tb.logo as team_b_logo,
                   ua.display_name as user_a_name,
                   ub.display_name as user_b_name
            FROM matches m
            JOIN teams ta ON m.team_a_id = ta.id
            LEFT JOIN teams tb ON m.team_b_id = tb.id
            JOIN users ua ON m.user_a_id = ua.id
            LEFT JOIN users ub ON m.user_b_id = ub.id
            WHERE m.id = ? AND (m.user_a_id = ? OR m.user_b_id = ?)
        `).get(request.params.id, request.user.id, request.user.id);

        if (!match) {
            return reply.status(404).send({ error: 'Match not found' });
        }

        // If conflicts exist, include them
        let conflicts = [];
        if (match.status === 'conflict_resolution') {
            conflicts = db.prepare(`
                SELECT mc.*, p.name as player_name, p.country
                FROM match_conflicts mc
                JOIN players p ON mc.player_id = p.id
                WHERE mc.match_id = ?
            `).all(match.id);
        }

        return { match, conflicts };
    });

    // GET MATCH SCORECARD
    fastify.get('/:id/scorecard', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const { id } = request.params;

        const batting = db.prepare(`
            SELECT mb.*, p.name, p.country,
                   pb.name as bowler_name, pf.name as fielder_name
            FROM match_batting mb
            JOIN players p ON mb.player_id = p.id
            LEFT JOIN players pb ON mb.dismissal_bowler_id = pb.id
            LEFT JOIN players pf ON mb.dismissal_fielder_id = pf.id
            WHERE mb.match_id = ?
            ORDER BY mb.innings, mb.batting_position
        `).all(id);

        const bowling = db.prepare(`
            SELECT mbl.*, p.name, p.country
            FROM match_bowling mbl
            JOIN players p ON mbl.player_id = p.id
            WHERE mbl.match_id = ?
            ORDER BY mbl.innings, mbl.overs DESC
        `).all(id);

        return { batting, bowling };
    });

    // GET OVER-BY-OVER DATA
    fastify.get('/:id/overs', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const { id } = request.params;

        const overs = db.prepare(`
            SELECT mo.*, p.name as bowler_name, ps.name as striker_name
            FROM match_overs mo
            JOIN players p ON mo.bowler_id = p.id
            JOIN players ps ON mo.striker_id = ps.id
            WHERE mo.match_id = ?
            ORDER BY mo.innings, mo.over_number
        `).all(id);

        return { overs };
    });

    // RESOLVE CONFLICT (submit replacement player)
    fastify.post('/:id/resolve', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const { replacements } = request.body;
        // replacements: [{ conflictPlayerId, replacementPlayerId }]

        const match = db.prepare('SELECT * FROM matches WHERE id = ? AND status = ?')
            .get(request.params.id, 'conflict_resolution');

        if (!match) {
            return reply.status(404).send({ error: 'Match not found or not in conflict resolution' });
        }

        const isTeamA = match.user_a_id === request.user.id;
        const isTeamB = match.user_b_id === request.user.id;

        if (!isTeamA && !isTeamB) {
            return reply.status(403).send({ error: 'Not your match' });
        }

        const resolveConflicts = db.transaction(() => {
            for (const { conflictPlayerId, replacementPlayerId } of replacements) {
                const column = isTeamA ? 'team_a_replacement_id' : 'team_b_replacement_id';
                const resolvedColumn = isTeamA ? 'team_a_resolved' : 'team_b_resolved';

                db.prepare(`
                    UPDATE match_conflicts
                    SET ${column} = ?, ${resolvedColumn} = 1
                    WHERE match_id = ? AND player_id = ?
                `).run(replacementPlayerId, match.id, conflictPlayerId);

                // Update the team roster: swap the conflicted player with replacement
                const teamId = isTeamA ? match.team_a_id : match.team_b_id;
                const existingSlot = db.prepare(
                    'SELECT * FROM team_players WHERE team_id = ? AND player_id = ?'
                ).get(teamId, conflictPlayerId);

                if (existingSlot) {
                    db.prepare(
                        'UPDATE team_players SET player_id = ? WHERE team_id = ? AND player_id = ?'
                    ).run(replacementPlayerId, teamId, conflictPlayerId);
                }
            }
        });

        resolveConflicts();

        // Check if all conflicts are resolved by both sides
        const unresolvedCount = db.prepare(`
            SELECT COUNT(*) as count FROM match_conflicts
            WHERE match_id = ? AND (team_a_resolved = 0 OR team_b_resolved = 0)
        `).get(match.id).count;

        if (unresolvedCount === 0) {
            // All resolved — start simulation
            db.prepare("UPDATE matches SET status = 'simulating', started_at = CURRENT_TIMESTAMP WHERE id = ?")
                .run(match.id);

            setImmediate(async () => {
                try {
                    await runSimulation(db, match.id, fastify.io);
                } catch (err) {
                    fastify.log.error('Simulation error:', err);
                }
            });
        } else {
            // Notify opponent that this side resolved
            const opponentUserId = isTeamA ? match.user_b_id : match.user_a_id;
            if (fastify.io) {
                fastify.io.to(`user_${opponentUserId}`).emit('match:conflict_resolved', {
                    matchId: match.id,
                    resolvedBy: request.user.username,
                });
            }
        }

        return { success: true, allResolved: unresolvedCount === 0 };
    });
}

module.exports = matchRoutes;
