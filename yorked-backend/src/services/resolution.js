const firestore = require('./firestore');
const notifications = require('./notifications');
const probabilityMatrix = require('../data/probability_matrix');
const applyModifiers = require('../data/attribute_modifiers');

class ResolutionService {
    async resolveBall(matchId, inningsNumber) {
        const match = await firestore.getMatch(matchId);
        if (!match) return { error: 'Match not found' };

        const inningsKey = `innings${inningsNumber}`;
        const innings = match[inningsKey];

        if (!innings || !innings.pendingBall || !innings.pendingBall.delivery || !innings.pendingBall.shot) {
            return { error: 'Pending ball is incomplete' };
        }
        if (innings.pendingBall.resolvedAt) {
            return { error: 'Ball already resolved' };
        }

        const delivery = innings.pendingBall.delivery;
        const shot = innings.pendingBall.shot;

        const bowlerUid = innings.currentBowlerUid;
        const strikerUid = innings.currentStrikerUid;

        const bowlerProfile = await firestore.getUser(bowlerUid);
        const strikerProfile = await firestore.getUser(strikerUid);

        const bowlerAttrs = bowlerProfile ? bowlerProfile.attributes?.bowling : null;
        const strikerAttrs = strikerProfile ? strikerProfile.attributes?.batting : null;

        const comboKey = `${delivery}|${shot}`;
        const baseProbs = probabilityMatrix[comboKey] || probabilityMatrix['Good Length|Defensive']; // fallback

        let finalProbs = applyModifiers(baseProbs, strikerAttrs, bowlerAttrs);

        // Weighted random selection
        let totalWeight = Object.values(finalProbs).reduce((a, b) => a + b, 0);
        let rand = Math.random() * totalWeight;
        let outcome = 'DOT';
        for (const [key, weight] of Object.entries(finalProbs)) {
            if (rand < weight) {
                outcome = key;
                break;
            }
            rand -= weight;
        }

        let runsScored = 0;
        let wicketType = null;
        let isWicket = false;

        if (outcome.startsWith('W_')) {
            isWicket = true;
            wicketType = outcome.split('_')[1];
        } else if (outcome !== 'DOT') {
            runsScored = parseInt(outcome, 10);
        }

        // Run Out logic (5% on 1s and 3s)
        if (!isWicket && (runsScored === 1 || runsScored === 3)) {
            if (Math.random() < 0.05) {
                isWicket = true;
                wicketType = 'RUNOUT';
                outcome = 'W_RUNOUT';
                // The runs completed before runout
                runsScored = runsScored - 1;
            }
        }

        // Prepare ball result document
        const ballResult = {
            inningsNumber,
            over: innings.overs || 0,
            ballInOver: innings.balls || 0,
            bowlerUid,
            strikerUid,
            delivery,
            shot,
            outcome,
            wicketType,
            runsScored,
            timestamp: new Date()
        };

        // Begin updates to innings state
        let runs = innings.runs || 0;
        let wickets = innings.wickets || 0;
        let overs = innings.overs || 0;
        let balls = innings.balls || 0;

        let batsmen = innings.batsmen || {};
        let bowlers = innings.bowlers || {};
        let overHistory = innings.overHistory || {};

        let currStriker = innings.currentStrikerUid;
        let currNonStriker = innings.currentNonStrikerUid;

        runs += runsScored;

        if (!batsmen[currStriker]) batsmen[currStriker] = { runs: 0, balls: 0, fours: 0, sixes: 0, status: 'in' };
        if (!bowlers[bowlerUid]) bowlers[bowlerUid] = { overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0 };

        batsmen[currStriker].runs += runsScored;
        batsmen[currStriker].balls += 1;
        if (runsScored === 4) batsmen[currStriker].fours += 1;
        if (runsScored === 6) batsmen[currStriker].sixes += 1;

        bowlers[bowlerUid].balls += 1;
        bowlers[bowlerUid].runs += runsScored;

        if (isWicket) {
            batsmen[currStriker].status = 'out';
            batsmen[currStriker].dismissal = wicketType;
            wickets += 1;
            bowlers[bowlerUid].wickets += 1;
        }

        // Add to overHistory
        if (!overHistory[overs]) overHistory[overs] = [];
        overHistory[overs].push(runsScored === 0 && !isWicket ? 'DOT' : (isWicket ? 'W' : runsScored.toString()));

        balls += 1;
        let overCompleted = false;
        let maidenOver = false;

        if (balls === 6) {
            // Over complete
            overCompleted = true;
            const overRuns = overHistory[overs].reduce((sum, ball) => {
                if (ball === 'W' || ball === 'DOT') return sum;
                return sum + parseInt(ball);
            }, 0);
            if (overRuns === 0) {
                maidenOver = true;
                bowlers[bowlerUid].maidens += 1;
            }

            overs += 1;
            balls = 0;
        }

        // Strike rotation calculation
        let swapEnds = false;
        // In 1v1 we don't swap ends, there is only one batsman
        if (match.playersPerTeam > 1) {
            if (runsScored % 2 !== 0 && runsScored > 0) swapEnds = true; // 1, 3
            if (overCompleted) swapEnds = !swapEnds; // Swap ends at end of over, unless odd run on last ball
        }

        let nextStriker = swapEnds ? currNonStriker : currStriker;
        let nextNonStriker = swapEnds ? currStriker : currNonStriker;

        let inningsEnded = false;
        // Check innings end
        if (wickets >= match.playersPerTeam || overs >= match.overs) {  // 1v1 means 1 wicket
            inningsEnded = true;
        } else if (inningsNumber === 2) {
            const target = (match.innings1?.runs || 0) + 1;
            if (runs >= target) inningsEnded = true;
        }

        if (isWicket && !inningsEnded && match.playersPerTeam > 1) {
            // Bring in next batsman (only if more than 1v1)
            const battingTeamObj = innings.battingTeam === 'A' ? match.teamA : match.teamB;
            const nextBatUid = battingTeamObj.players.find(uid => batsmen[uid] === undefined || batsmen[uid].status === 'notyet');
            if (nextBatUid) {
                batsmen[nextBatUid] = { runs: 0, balls: 0, fours: 0, sixes: 0, status: 'in' };
                if (nextStriker === currStriker) nextStriker = nextBatUid;
                else nextNonStriker = nextBatUid;

                // Notify new batsman async
                notifications.notifyNewBatsman(matchId, nextBatUid, battingTeamObj.name);
            } else {
                inningsEnded = true; // All out
            }
        }

        if (isWicket && inningsEnded) {
            if (nextStriker === currStriker) nextStriker = null;
            else nextNonStriker = null;
        }

        const inningsUpdate = {
            runs,
            wickets,
            overs,
            balls,
            batsmen,
            bowlers,
            overHistory,
            currentStrikerUid: nextStriker,
            currentNonStrikerUid: nextNonStriker,
            pendingBall: {
                delivery: null,
                shot: null,
                resolvedAt: new Date()
            }
        };

        // Write ball
        await firestore.writeBallResult(matchId, ballResult);
        // Update match
        await firestore.updateInningsState(matchId, inningsKey, inningsUpdate);

        let nextStatus = match.status;
        if (inningsEnded) {
            if (inningsNumber === 1) {
                nextStatus = 'innings_break';
                const teamName = innings.battingTeam === 'A' ? match.teamA.name : match.teamB.name;
                notifications.notifyInningsBreak(matchId, [...match.teamA.players, ...match.teamB.players], teamName, runs, wickets);
            } else {
                nextStatus = 'complete';
                this.finishMatch(match, matchId, runs, wickets, innings);
            }
            await firestore.updateMatch(matchId, { status: nextStatus });
        } else {
            // Notify for next ball
            if (overCompleted) {
                const fieldingCap = innings.bowlingTeam === 'A' ? match.teamA.captainUid : match.teamB.captainUid;
                notifications.notifyAssignBowler(matchId, fieldingCap);
            } else {
                // Assume current bowler continues
                notifications.notifyBowlerTurn(matchId, bowlerUid);
                const bowlerNameObj = await firestore.getUser(bowlerUid);
                notifications.notifyBatsmanTurn(matchId, nextStriker, bowlerNameObj ? bowlerNameObj.displayName : 'Bowler');
            }
        }

        return { outcome, ballResult };
    }

    async finishMatch(match, matchId, runs2, wickets2, innings2) {
        const runs1 = match.innings1?.runs || 0;
        let winnerTeamObj;
        let margin = 0;
        let marginType = '';

        if (runs2 > runs1) {
            winnerTeamObj = match[innings2.battingTeam === 'A' ? 'teamA' : 'teamB'];
            margin = match.playersPerTeam - wickets2;
            marginType = 'wickets';
        } else if (runs1 > runs2) {
            winnerTeamObj = match[innings2.bowlingTeam === 'A' ? 'teamA' : 'teamB'];
            margin = runs1 - runs2;
            marginType = 'runs';
        } else {
            winnerTeamObj = { name: 'Tie', isTie: true };
        }

        const result = {
            winnerTeam: winnerTeamObj.isTie ? 'tie' : (winnerTeamObj.name === match.teamA.name ? 'A' : 'B'),
            margin,
            marginType
        };

        await firestore.updateMatch(matchId, { result });
        notifications.notifyMatchComplete(matchId, [...match.teamA.players, ...match.teamB.players], winnerTeamObj.name);
    }
}

module.exports = new ResolutionService();

