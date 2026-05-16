// routes/tasks.js
const express          = require('express');
const { query }        = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
    try {
        const { project_id, status, assigned_to, priority, milestone_id } = req.query;
        let sql = `
            SELECT t.*,
                   u.name  AS assigned_name,
                   cb.name AS created_by_name,
                   p.title AS project_title,
                   m.title AS milestone_title
            FROM tasks t
            LEFT JOIN users u  ON u.id  = t.assigned_to
            LEFT JOIN users cb ON cb.id = t.created_by
            LEFT JOIN projects p ON p.id = t.project_id
            LEFT JOIN milestones m ON m.id = t.milestone_id
            WHERE 1=1
        `;
        const params = [];
        let i = 1;
        if (project_id)  { sql += ` AND t.project_id  = $${i++}`; params.push(project_id); }
        if (status)       { sql += ` AND t.status       = $${i++}`; params.push(status); }
        if (assigned_to)  { sql += ` AND t.assigned_to  = $${i++}`; params.push(assigned_to); }
        if (priority)     { sql += ` AND t.priority     = $${i++}`; params.push(priority); }
        if (milestone_id) { sql += ` AND t.milestone_id = $${i++}`; params.push(milestone_id); }
        sql += ' ORDER BY t.created_at DESC';

        const { rows } = await query(sql, params);
        rows.forEach(t => { try { t.tags = JSON.parse(t.tags || '[]'); } catch { t.tags = []; } });
        res.json(rows);
    } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
    try {
        const { rows } = await query(`
            SELECT t.*,
                   u.name  AS assigned_name,
                   cb.name AS created_by_name,
                   p.title AS project_title,
                   m.title AS milestone_title
            FROM tasks t
            LEFT JOIN users u  ON u.id  = t.assigned_to
            LEFT JOIN users cb ON cb.id = t.created_by
            LEFT JOIN projects p ON p.id = t.project_id
            LEFT JOIN milestones m ON m.id = t.milestone_id
            WHERE t.id = $1
        `, [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Task not found.' });

        const task = rows[0];
        try { task.tags = JSON.parse(task.tags || '[]'); } catch { task.tags = []; }

        const { rows: comments } = await query(`
            SELECT c.*, u.name AS user_name FROM comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.task_id = $1 ORDER BY c.created_at ASC
        `, [task.id]);
        task.comments = comments;
        res.json(task);
    } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
    try {
        const {
            project_id, milestone_id = null, title, description = null,
            status = 'todo', priority = 'medium', assigned_to = null,
            due_date = null, estimated_hrs = 0, tags = []
        } = req.body;
        if (!project_id || !title)
            return res.status(400).json({ error: 'project_id and title are required.' });

        const { rows } = await query(`
            INSERT INTO tasks (project_id,milestone_id,title,description,status,priority,assigned_to,created_by,due_date,estimated_hrs,tags)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id
        `, [project_id, milestone_id, title, description, status, priority, assigned_to, req.user.id, due_date, estimated_hrs, JSON.stringify(tags)]);

        const id = rows[0].id;
        const ops = [
            query("INSERT INTO activity_log (user_id,entity_type,entity_id,action,meta) VALUES ($1,'task',$2,'created',$3)",
                [req.user.id, id, JSON.stringify({ title })]),
        ];
        if (assigned_to && assigned_to !== req.user.id) {
            ops.push(query("INSERT INTO notifications (user_id,title,message,type,entity_type,entity_id) VALUES ($1,$2,$3,'info','task',$4)",
                [assigned_to, 'Task Assigned', `You have been assigned "${title}".`, id]));
        }
        await Promise.all(ops);
        res.status(201).json({ id, message: 'Task created.' });
    } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
    try {
        const { rows: existing } = await query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
        if (!existing.length) return res.status(404).json({ error: 'Task not found.' });
        const prev = existing[0];

        const {
            title         = prev.title,
            description   = prev.description,
            status        = prev.status,
            priority      = prev.priority,
            assigned_to   = prev.assigned_to,
            due_date      = prev.due_date,
            estimated_hrs = prev.estimated_hrs,
            actual_hrs    = prev.actual_hrs,
            milestone_id  = prev.milestone_id,
            tags          = []
        } = req.body;

        await query(`
            UPDATE tasks SET title=$1,description=$2,status=$3,priority=$4,
                assigned_to=$5,due_date=$6,estimated_hrs=$7,actual_hrs=$8,
                milestone_id=$9,tags=$10,updated_at=NOW()
            WHERE id=$11
        `, [title, description, status, priority, assigned_to, due_date, estimated_hrs, actual_hrs, milestone_id, JSON.stringify(tags), req.params.id]);

        if (status !== prev.status) {
            await query("INSERT INTO activity_log (user_id,entity_type,entity_id,action,meta) VALUES ($1,'task',$2,'status_changed',$3)",
                [req.user.id, req.params.id, JSON.stringify({ from: prev.status, to: status, title })]);
        }
        res.json({ message: 'Task updated.' });
    } catch (err) { next(err); }
});

router.patch('/:id/status', async (req, res, next) => {
    try {
        const { status } = req.body;
        const valid = ['todo', 'in-progress', 'review', 'done'];
        if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

        const { rows } = await query('SELECT title,status FROM tasks WHERE id = $1', [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Task not found.' });
        const prev = rows[0];

        await query("UPDATE tasks SET status=$1,updated_at=NOW() WHERE id=$2", [status, req.params.id]);
        await query("INSERT INTO activity_log (user_id,entity_type,entity_id,action,meta) VALUES ($1,'task',$2,'status_changed',$3)",
            [req.user.id, req.params.id, JSON.stringify({ from: prev.status, to: status, title: prev.title })]);
        res.json({ message: 'Status updated.' });
    } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
    try {
        await query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
        res.json({ message: 'Task deleted.' });
    } catch (err) { next(err); }
});

router.post('/:id/comments', async (req, res, next) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: 'Content is required.' });
        const { rows } = await query(
            'INSERT INTO comments (task_id,user_id,content) VALUES ($1,$2,$3) RETURNING id',
            [req.params.id, req.user.id, content]
        );
        res.status(201).json({ id: rows[0].id, message: 'Comment added.' });
    } catch (err) { next(err); }
});

router.delete('/:tid/comments/:cid', async (req, res, next) => {
    try {
        await query('DELETE FROM comments WHERE id=$1 AND task_id=$2', [req.params.cid, req.params.tid]);
        res.json({ message: 'Comment deleted.' });
    } catch (err) { next(err); }
});

module.exports = router;
