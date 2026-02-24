const express = require('express');
const router = express.Router();
const firestore = require('../services/firestore');
const resolution = require('../services/resolution');
const notifications = require('../services/notifications');

router.post('/create', async (req, res) => {
    try {
        const { overs, playersPerTeam, teamA, creatorUid } = req.body;
        if (!overs || !playersPerTeam || !teamA || !creatorUid) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const matchData = {
            status: 'lobby_open',
            createdAt: new Date(),
            creatorUid,
            overs,
            playersPerTeam,
            teamA: {
                name: teamA.name,
                iconId: teamA.iconId,
                captainUid: creatorUid,
                players: [creatorUid]
            },
            teamB: {
                name: '',
                iconId: '',
                captainUid: null,
                players: []
            },
            players: [creatorUid],
            toss: null,
            innings1: null,
            innings2: null,
            result: null
        };

        const matchId = await firestore.createMatch(matchData);
        res.json({ matchId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:matchId/state', async (req, res) => {
    try {
        const match = await firestore.getMatch(req.params.matchId);
        if (!match) return res.status(404).json({ error: 'Match not found' });
        res.json(match);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:matchId/join', async (req, res) => {
    try {
        const { uid } = req.body;
        const matchId = req.params.matchId;

        if (!uid) {
            return res.status(400).json({ error: 'Missing user ID' });
        }

        const match = await firestore.getMatch(matchId);
        if (!match) return res.status(404).json({ error: 'Match not found' });
        if (match.status !== 'lobby_open') return res.status(400).json({ error: 'Match is no longer open for joining' });

        if (match.teamA.players.includes(uid) || match.teamB.players.includes(uid)) {
            return res.status(400).json({ error: 'User is already in this match' });
        }

        // Auto-assign to the team with fewer players to keep them balanced
        let targetTeam = 'teamA';
        if (match.teamA.players.length > match.teamB.players.length) {
            targetTeam = 'teamB';
        }

        const teamData = match[targetTeam];

        if (teamData.players.length >= match.playersPerTeam) {
            return res.status(400).json({ error: 'Match is full' });
        }

        const updateData = {
            [`${targetTeam}.players`]: [...teamData.players, uid],
            'players': [...match.teamA.players, ...match.teamB.players, uid]
        };

        // If team was empty, make this user the captain
        if (teamData.players.length === 0) {
            updateData[`${targetTeam}.captainUid`] = uid;
        }

        // Auto-close lobby if both teams are full after this join
        const totalPlayersAfterJoin = match.teamA.players.length + match.teamB.players.length + 1;
        if (totalPlayersAfterJoin >= match.playersPerTeam * 2) {
            updateData['status'] = 'toss'; // Move to toss phase if you want automatic transition, or just keep it open and let captain do it. Leaving it manual for now.
        }

        await firestore.updateMatch(matchId, updateData);
        res.json({ success: true, teamAssigned: targetTeam });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Bowler submits delivery (step 1 of turn)
router.post('/:matchId/bowl', async (req, res) => {
    try {
        const { uid, delivery } = req.body;
        const matchId = req.params.matchId;

        if (!uid || !delivery) {
            return res.status(400).json({ error: 'Missing uid or delivery' });
        }

        const match = await firestore.getMatch(matchId);
        if (!match) return res.status(404).json({ error: 'Match not found' });

        const inningsKey = `innings${match.currentInnings}`;
        const innings = match[inningsKey];
        if (!innings) return res.status(400).json({ error: 'Innings not active' });

        if (uid !== innings.currentBowlerUid) {
            return res.status(403).json({ error: 'You are not the current bowler' });
        }

        // Write delivery to pendingBall
        await firestore.updateInningsState(matchId, inningsKey, {
            pendingBall: { delivery, shot: null }
        });

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Batsman submits shot (step 2 of turn) — auto-resolves the ball
router.post('/:matchId/bat', async (req, res) => {
    try {
        const { uid, shot } = req.body;
        const matchId = req.params.matchId;

        if (!uid || !shot) {
            return res.status(400).json({ error: 'Missing uid or shot' });
        }

        const match = await firestore.getMatch(matchId);
        if (!match) return res.status(404).json({ error: 'Match not found' });

        const inningsKey = `innings${match.currentInnings}`;
        const innings = match[inningsKey];
        if (!innings) return res.status(400).json({ error: 'Innings not active' });

        if (uid !== innings.currentStrikerUid) {
            return res.status(403).json({ error: 'You are not the current striker' });
        }

        if (!innings.pendingBall || !innings.pendingBall.delivery) {
            return res.status(400).json({ error: 'No delivery bowled yet' });
        }

        // Write shot to pendingBall
        await firestore.updateInningsState(matchId, inningsKey, {
            'pendingBall.shot': shot
        });

        // Auto-resolve the ball now that both delivery and shot are set
        const result = await resolution.resolveBall(matchId, match.currentInnings);
        if (result.error) return res.status(400).json({ error: result.error });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/resolve-ball', async (req, res) => {
    try {
        const { matchId, inningsNumber } = req.body;
        if (!matchId || !inningsNumber) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await resolution.resolveBall(matchId, inningsNumber);
        if (result.error) return res.status(400).json({ error: result.error });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/:matchId/assign-bowler', async (req, res) => {
    try {
        const { captainUid, bowlerUid, inningsNumber } = req.body;
        const matchId = req.params.matchId;

        if (!captainUid || !bowlerUid || !inningsNumber) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const match = await firestore.getMatch(matchId);
        if (!match) return res.status(404).json({ error: 'Match not found' });

        const inningsKey = `innings${inningsNumber}`;
        const innings = match[inningsKey];
        if (!innings) return res.status(400).json({ error: 'Innings not active' });

        const bowlingCap = innings.bowlingTeam === 'A' ? match.teamA.captainUid : match.teamB.captainUid;
        if (captainUid !== bowlingCap) {
            return res.status(403).json({ error: 'Only the bowling captain can assign' });
        }

        await firestore.updateInningsState(matchId, inningsKey, { currentBowlerUid: bowlerUid });
        notifications.notifyBowlerTurn(matchId, bowlerUid);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
