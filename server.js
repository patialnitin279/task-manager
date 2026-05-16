// server.js — Entry point
require('dotenv').config();
const express = require('express');
const path    = require('path');
const cors    = require('cors');
const { initDb } = require('./database/db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth',     require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks',    require('./routes/tasks'));
app.use('/api/users',    require('./routes/users'));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
});

initDb()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`\n🚀 Task Manager running at http://localhost:${PORT}`);
            console.log(`   Company : Black Grapes Softech, Indore`);
            console.log(`   Env     : ${process.env.NODE_ENV || 'development'}\n`);
        });
    })
    .catch(err => {
        console.error('[FATAL] Failed to initialise database:', err.message);
        process.exit(1);
    });
