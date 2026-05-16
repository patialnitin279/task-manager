// routes/auth.js
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query }                    = require('../database/db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res, next) => {
    try {
        const { name, email, password, role = 'member' } = req.body;
        if (!name || !email || !password)
            return res.status(400).json({ error: 'Name, email and password are required.' });

        const { rows: existing } = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.length) return res.status(409).json({ error: 'Email already registered.' });

        const hashed = bcrypt.hashSync(password, 10);
        const { rows } = await query(
            'INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,$4) RETURNING id',
            [name, email, hashed, role]
        );
        const id = rows[0].id;
        const token = jwt.sign({ id, email, name, role }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id, name, email, role } });
    } catch (err) { next(err); }
});

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'Email and password are required.' });

        const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
        const user = rows[0];
        if (!user || !bcrypt.compareSync(password, user.password))
            return res.status(401).json({ error: 'Invalid credentials.' });

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
    } catch (err) { next(err); }
});

router.get('/me', authenticate, async (req, res, next) => {
    try {
        const { rows } = await query(
            'SELECT id,name,email,role,avatar,created_at FROM users WHERE id = $1', [req.user.id]
        );
        if (!rows.length) return res.status(404).json({ error: 'User not found.' });
        res.json(rows[0]);
    } catch (err) { next(err); }
});

router.put('/me', authenticate, async (req, res, next) => {
    try {
        const { name, avatar } = req.body;
        await query(
            'UPDATE users SET name=$1,avatar=$2,updated_at=NOW() WHERE id=$3',
            [name || req.user.name, avatar || null, req.user.id]
        );
        res.json({ message: 'Profile updated.' });
    } catch (err) { next(err); }
});

module.exports = router;
