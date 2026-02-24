const admin = require('firebase-admin');

class NotificationService {
    async sendToUser(uid, title, body, data) {
        try {
            const db = admin.firestore();
            const userDoc = await db.collection('users').doc(uid).get();
            if (!userDoc.exists) return false;

            const fcmToken = userDoc.data().fcmToken;
            if (!fcmToken) return false;

            const message = {
                notification: { title, body },
                data: data || {},
                token: fcmToken
            };

            await admin.messaging().send(message);
            console.log(`FCM sent to ${uid}: ${title}`);
            return true;
        } catch (err) {
            console.error(`Failed to send FCM to ${uid}:`, err);
            return false;
        }
    }

    async sendToMultiple(uids, title, body, data) {
        try {
            const db = admin.firestore();
            const fcmTokens = [];

            // Batch fetch tokens
            for (let uid of uids) {
                const userDoc = await db.collection('users').doc(uid).get();
                if (userDoc.exists && userDoc.data().fcmToken) {
                    fcmTokens.push(userDoc.data().fcmToken);
                }
            }

            if (fcmTokens.length === 0) return false;

            const message = {
                notification: { title, body },
                data: data || {},
                tokens: fcmTokens
            };

            const response = await admin.messaging().sendMulticast(message);
            console.log(`FCM multicast sent, success: ${response.successCount}`);
            return true;
        } catch (err) {
            console.error(`Failed to send FCM multicast:`, err);
            return false;
        }
    }

    notifyBowlerTurn(matchId, bowlerUid) {
        return this.sendToUser(bowlerUid, 'Your turn to bowl!', 'Open Yorked 🏏', { matchId, screen: 'bowl' });
    }

    notifyBatsmanTurn(matchId, strikerUid, bowlerName) {
        return this.sendToUser(strikerUid, 'Your turn to bat!', `${bowlerName} is bowling 🏏`, { matchId, screen: 'bat' });
    }

    notifyNewBatsman(matchId, batsmanUid, teamName) {
        return this.sendToUser(batsmanUid, 'You\'re in!', `Time to bat for ${teamName} 🏏`, { matchId, screen: 'bat' });
    }

    notifyAssignBowler(matchId, captainUid) {
        return this.sendToUser(captainUid, 'Over complete', 'Pick your next bowler 🎯', { matchId, screen: 'live' });
    }

    notifyInningsBreak(matchId, allPlayerUids, teamName, score, wickets) {
        return this.sendToMultiple(allPlayerUids, 'Innings complete!', `${teamName} scored ${score}/${wickets}`, { matchId, screen: 'break' });
    }

    notifyMatchComplete(matchId, allPlayerUids, winnerTeamName) {
        return this.sendToMultiple(allPlayerUids, 'Match complete!', `${winnerTeamName} wins! Check the result 🏆`, { matchId, screen: 'result' });
    }

    notifyLobbyFull(matchId, captainUids) {
        return this.sendToMultiple(captainUids, 'Lobby full', 'All players joined — ready to toss!', { matchId, screen: 'toss' });
    }

    notifyTossCaller(matchId, callerUid) {
        return this.sendToUser(callerUid, 'Toss Time', "You've won the toss call — Heads or Tails?", { matchId, screen: 'toss' });
    }
}

module.exports = new NotificationService();
