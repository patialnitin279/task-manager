// routes/users.js
const express          = require('express');
const { query }        = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
    try {
        const { rows } = await query('SELECT id,name,email,role,avatar FROM users ORDER BY name ASC');
        res.json(rows);
    } catch (err) { next(err); }
});

router.get('/stats', async (req, res, next) => {
    try {
        const [
            { rows: r1 }, { rows: r2 }, { rows: r3 },
            { rows: r4 }, { rows: r5 }, { rows: r6 },
            { rows: r7 }, { rows: r8 },
            { rows: tasksByStatus },
            { rows: tasksByPriority },
            { rows: recentActivity },
            { rows: projectProgress },
            { rows: upcomingDeadlines },
        ] = await Promise.all([
            query("SELECT COUNT(*) AS c FROM projects"),
            query("SELECT COUNT(*) AS c FROM projects WHERE status='active'"),
            query("SELECT COUNT(*) AS c FROM projects WHERE status='completed'"),
            query("SELECT COUNT(*) AS c FROM tasks"),
            query("SELECT COUNT(*) AS c FROM tasks WHERE assigned_to=$1", [req.user.id]),
            query("SELECT COUNT(*) AS c FROM tasks WHERE status='done'"),
            query("SELECT COUNT(*) AS c FROM tasks WHERE due_date < CURRENT_DATE AND status NOT IN ('done')"),
            query("SELECT COUNT(*) AS c FROM users"),
            query("SELECT status, COUNT(*) AS count FROM tasks GROUP BY status"),
            query("SELECT priority, COUNT(*) AS count FROM tasks GROUP BY priority"),
            query(`
                SELECT al.*, u.name AS user_name
                FROM activity_log al
                LEFT JOIN users u ON u.id = al.user_id
                ORDER BY al.created_at DESC LIMIT 10
            `),
            query(`
                SELECT p.id, p.title, p.status, p.priority,
                       COUNT(t.id) AS total_tasks,
                       COALESCE(SUM(CASE WHEN t.status='done' THEN 1 ELSE 0 END), 0) AS done_tasks
                FROM projects p
                LEFT JOIN tasks t ON t.project_id = p.id
                GROUP BY p.id
                ORDER BY p.updated_at DESC LIMIT 5
            `),
            query(`
                SELECT id, title, due_date, priority, status, project_id
                FROM tasks
                WHERE due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
                  AND status NOT IN ('done')
                ORDER BY due_date ASC LIMIT 8
            `),
        ]);

        recentActivity.forEach(a => { try { a.meta = JSON.parse(a.meta || '{}'); } catch { a.meta = {}; } });

        res.json({
            totalProjects:     parseInt(r1[0].c),
            activeProjects:    parseInt(r2[0].c),
            completedProjects: parseInt(r3[0].c),
            totalTasks:        parseInt(r4[0].c),
            myTasks:           parseInt(r5[0].c),
            doneTasks:         parseInt(r6[0].c),
            overdueTasks:      parseInt(r7[0].c),
            totalUsers:        parseInt(r8[0].c),
            tasksByStatus, tasksByPriority,
            recentActivity, projectProgress, upcomingDeadlines,
        });
    } catch (err) { next(err); }
});

router.get('/notifications', async (req, res, next) => {
    try {
        const [{ rows: notifications }, { rows: unreadRows }] = await Promise.all([
            query("SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20", [req.user.id]),
            query("SELECT COUNT(*) AS c FROM notifications WHERE user_id=$1 AND is_read=FALSE", [req.user.id]),
        ]);
        res.json({ notifications, unread: parseInt(unreadRows[0].c) });
    } catch (err) { next(err); }
});

router.patch('/notifications/:id/read', async (req, res, next) => {
    try {
        await query('UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
        res.json({ message: 'Marked as read.' });
    } catch (err) { next(err); }
});

router.patch('/notifications/read-all', async (req, res, next) => {
    try {
        await query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user.id]);
        res.json({ message: 'All marked as read.' });
    } catch (err) { next(err); }
});

module.exports = router;
