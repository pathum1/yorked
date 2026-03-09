const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const jwt = require('@fastify/jwt');
const fastifyStatic = require('@fastify/static');
const { Server } = require('socket.io');
const path = require('path');
const { initializeDatabase } = require('./db/init');

// Shared IO reference — accessible by routes via fastify.io
const ioRef = { instance: null };

// Initialize database
const db = initializeDatabase();

// Make db available to routes
fastify.decorate('db', db);

// Decorate io with a getter (before server starts, so Fastify allows it)
fastify.decorate('io', {
    getter() { return ioRef.instance; }
});

// Register plugins
fastify.register(cors, {
    origin: true,
    credentials: true,
});

fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'yorked-v2-secret-change-in-production',
    sign: { expiresIn: '7d' },
});

// Auth decorator
fastify.decorate('authenticate', async function (request, reply) {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.status(401).send({ error: 'Unauthorized' });
    }
});

// Register routes
fastify.register(require('./routes/auth'), { prefix: '/api/auth' });
fastify.register(require('./routes/players'), { prefix: '/api/players' });
fastify.register(require('./routes/teams'), { prefix: '/api/teams' });
fastify.register(require('./routes/matches'), { prefix: '/api/matches' });
fastify.register(require('./routes/feed'), { prefix: '/api/feed' });

// Serve countries endpoint
fastify.get('/api/countries', async (request, reply) => {
    const countries = db.prepare('SELECT * FROM countries ORDER BY name').all();
    return countries;
});

// Serve team logos endpoint
fastify.get('/api/logos', async (request, reply) => {
    const logos = db.prepare('SELECT * FROM team_logos ORDER BY name').all();
    return logos;
});

// In production, serve the built React app
if (process.env.NODE_ENV === 'production') {
    fastify.register(fastifyStatic, {
        root: path.join(__dirname, '../client/dist'),
        prefix: '/',
    });

    // SPA fallback
    fastify.setNotFoundHandler((request, reply) => {
        if (request.url.startsWith('/api/')) {
            reply.status(404).send({ error: 'Not found' });
        } else {
            reply.sendFile('index.html');
        }
    });
}

// Start server
const start = async () => {
    try {
        const server = await fastify.listen({
            port: process.env.PORT || 3001,
            host: '0.0.0.0'
        });

        // Attach Socket.IO after server starts
        const io = new Server(fastify.server, {
            cors: { origin: '*', methods: ['GET', 'POST'] }
        });

        // Store io reference so routes can access it via fastify.io
        ioRef.instance = io;

        io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            socket.on('join_user', (userId) => {
                socket.join(`user_${userId}`);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });

        console.log(`Server listening on ${server}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
