const bcrypt = require('bcrypt');

async function authRoutes(fastify, options) {
    const db = fastify.db;

    // REGISTER
    fastify.post('/register', async (request, reply) => {
        const { username, displayName, password } = request.body;

        if (!username || !displayName || !password) {
            return reply.status(400).send({ error: 'All fields are required' });
        }

        if (username.length < 3 || username.length > 20) {
            return reply.status(400).send({ error: 'Username must be 3-20 characters' });
        }

        if (password.length < 6) {
            return reply.status(400).send({ error: 'Password must be at least 6 characters' });
        }

        // Check if username exists
        const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.toLowerCase());
        if (existing) {
            return reply.status(409).send({ error: 'Username already taken' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = db.prepare(
            'INSERT INTO users (username, display_name, password_hash) VALUES (?, ?, ?)'
        ).run(username.toLowerCase(), displayName, passwordHash);

        const token = fastify.jwt.sign({ id: result.lastInsertRowid, username: username.toLowerCase() });

        return {
            token,
            user: {
                id: result.lastInsertRowid,
                username: username.toLowerCase(),
                displayName
            }
        };
    });

    // LOGIN
    fastify.post('/login', async (request, reply) => {
        const { username, password } = request.body;

        if (!username || !password) {
            return reply.status(400).send({ error: 'Username and password are required' });
        }

        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.toLowerCase());

        if (!user) {
            return reply.status(401).send({ error: 'Invalid username or password' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return reply.status(401).send({ error: 'Invalid username or password' });
        }

        // Update last login
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        const token = fastify.jwt.sign({ id: user.id, username: user.username });

        return {
            token,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.display_name
            }
        };
    });

    // GET CURRENT USER
    fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
        const user = db.prepare('SELECT id, username, display_name, created_at FROM users WHERE id = ?')
            .get(request.user.id);

        if (!user) {
            return reply.status(404).send({ error: 'User not found' });
        }

        return {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            createdAt: user.created_at
        };
    });
}

module.exports = authRoutes;
