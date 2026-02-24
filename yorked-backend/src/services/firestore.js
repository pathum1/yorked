const admin = require('firebase-admin');

class FirestoreService {
    constructor() {
        this.db = admin.firestore();
    }

    async getMatch(matchId) {
        const doc = await this.db.collection('matches').doc(matchId).get();
        return doc.exists ? doc.data() : null;
    }

    async updateMatch(matchId, data) {
        await this.db.collection('matches').doc(matchId).update(data);
    }

    async createMatch(matchData) {
        const docRef = await this.db.collection('matches').add(matchData);
        return docRef.id;
    }

    async getUser(uid) {
        const doc = await this.db.collection('users').doc(uid).get();
        return doc.exists ? doc.data() : null;
    }

    async writeBallResult(matchId, ballData) {
        await this.db.collection('matches').doc(matchId).collection('balls').add(ballData);
    }

    async updateInningsState(matchId, inningsKey, data) {
        const updates = {};
        for (const [key, value] of Object.entries(data)) {
            updates[`${inningsKey}.${key}`] = value;
        }
        await this.db.collection('matches').doc(matchId).update(updates);
    }

    async updateCareerStats(uid, statsUpdate) {
        const userRef = this.db.collection('users').doc(uid);
        await this.db.runTransaction(async (transaction) => {
            const doc = await transaction.get(userRef);
            if (!doc.exists) return;
            const data = doc.data();
            const currentStats = data.careerStats || {
                matches: 0, wins: 0, losses: 0, ties: 0,
                runsScored: 0, ballsFaced: 0, highestScore: 0,
                fifties: 0, hundreds: 0, fours: 0, sixes: 0,
                wicketsTaken: 0, ballsBowled: 0, runsConceded: 0, catches: 0
            };

            const newStats = { ...currentStats };
            for (const [key, val] of Object.entries(statsUpdate)) {
                if (key === 'highestScore') {
                    newStats.highestScore = Math.max(newStats.highestScore, val);
                } else {
                    newStats[key] = (newStats[key] || 0) + val;
                }
            }
            transaction.update(userRef, { careerStats: newStats });
        });
    }
}

module.exports = new FirestoreService();
