require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');


// Initialize Firebase Admin
let serviceAccount = null;

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            console.log('Using FIREBASE_SERVICE_ACCOUNT_JSON from environment');
        } catch (e) {
            console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON', e);
        }
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        try {
            // Read the file synchronously to ensure we have the raw JSON string before parsing
            const fs = require('fs');
            const rawData = fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8');
            serviceAccount = JSON.parse(rawData);
            console.log('Loaded service account from path:', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        } catch (e) {
            console.warn(`Could not load service account from ${process.env.FIREBASE_SERVICE_ACCOUNT_PATH}:`, e.message);
        }
    }

    if (!serviceAccount) {
        console.warn('No valid service account found, attempting default app credentials.');
    }

    admin.initializeApp({
        credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault(),
        projectId: serviceAccount?.project_id || process.env.FIREBASE_PROJECT_ID || 'yorked'
    });
    console.log('Firebase Admin initialized');
} catch (error) {
    console.error('Firebase Admin initialization error:', error);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: ['https://yorked.duckdns.org', 'http://localhost:5000', 'http://localhost:3000', 'http://localhost:8080'] }));
app.use(express.json());

// Routes
const matchRoutes = require('./routes/match');
// Optional: notifications test route
const notifyRoutes = express.Router();
app.use('/api/match', matchRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('Yorked Backend OK');
});

// Serve Flutter Web static files
app.use(express.static('/usr/src/app/public_web'));

// Catch-all route for Flutter web routing (GoRouter)
// Use a 404 handler middleware that falls back to index.html for non-file requests
app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html') && !req.path.includes('.')) {
        res.sendFile('/usr/src/app/public_web/index.html');
    } else {
        next();
    }
});

// Setup Firestore Listener for automatic resolution
const setupListeners = () => {
    const resolution = require('./services/resolution');
    const db = admin.firestore();

    // Listen to all active matches
    db.collection('matches')
        .where('status', 'in', ['innings_1', 'innings_2'])
        .onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added' || change.type === 'modified') {
                    const match = change.doc.data();
                    const matchId = change.doc.id;

                    const inningsNum = match.status === 'innings_1' ? 1 : 2;
                    const innings = match[`innings${inningsNum}`];

                    if (innings && innings.pendingBall) {
                        if (innings.pendingBall.delivery && innings.pendingBall.shot && !innings.pendingBall.resolvedAt) {
                            console.log(`Auto-resolving ball for match ${matchId}`);
                            // Using setTimeout to give a slight delay and avoid transaction conflicts
                            setTimeout(() => {
                                resolution.resolveBall(matchId, inningsNum).catch(console.error);
                            }, 500);
                        }
                    }
                }
            });
        }, err => console.error('Firestore listener error:', err));
};

try {
    setupListeners();
} catch (e) {
    console.error('Failed to setup Firestore listeners:', e);
}

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Yorked backend listening on port ${PORT}`);
});
