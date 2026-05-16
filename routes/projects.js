// routes/projects.js
const express          = require('express');
const { query }        = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
    try {
        const { rows } = await query(`
            SELECT p.*,
                   u.name AS owner_name,
                   (SELECT COUNT(*) FROM tasks     t WHERE t.project_id = p.id)                         AS task_count,
                   (SELECT COUNT(*) FROM tasks     t WHERE t.project_id = p.id AND t.status = 'done')   AS done_count,
                   (SELECT COUNT(*) FROM milestones m WHERE m.project_id = p.id)                        AS milestone_count,
                   (SELECT COUNT(*) FROM milestones m WHERE m.project_id = p.id AND m.status = 'completed') AS milestone_done
            FROM projects p
            JOIN users u ON u.id = p.owner_id
            ORDER BY p.created_at DESC
        `);
        res.json(rows);
    } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
    try {
        const { rows } = await query(`
            SELECT p.*, u.name AS owner_name
            FROM projects p JOIN users u ON u.id = p.owner_id
            WHERE p.id = $1
        `, [req.params.id]);
        if (!rows.length) return res.status(404).json({ error: 'Project not found.' });

        const project = rows[0];
        const [membersRes, milestonesRes] = await Promise.all([
            query(`
                SELECT u.id, u.name, u.email, u.role AS system_role, pm.role AS project_role, pm.joined_at
                FROM project_members pm JOIN users u ON u.id = pm.user_id
                WHERE pm.project_id = $1
            `, [project.id]),
            query(`
                SELECT m.*,
                       (SELECT COUNT(*) FROM tasks t WHERE t.milestone_id = m.id)                    AS task_count,
                       (SELECT COUNT(*) FROM tasks t WHERE t.milestone_id = m.id AND t.status='done') AS done_count
                FROM milestones m WHERE m.project_id = $1
                ORDER BY m.due_date ASC
            `, [project.id]),
        ]);
        project.members    = membersRes.rows;
        project.milestones = milestonesRes.rows;
        res.json(project);
    } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
    try {
        const { title, description, priority = 'medium', start_date, end_date } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required.' });

        const { rows } = await query(`
            INSERT INTO projects (title,description,priority,start_date,end_date,owner_id)
            VALUES ($1,$2,$3,$4,$5,$6) RETURNING id
        `, [title, description || null, priority, start_date || null, end_date || null, req.user.id]);

        const id = rows[0].id;
        await Promise.all([
            query('INSERT INTO project_members (project_id,user_id,role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
                [id, req.user.id, 'manager']),
            query("INSERT INTO activity_log (user_id,entity_type,entity_id,action,meta) VALUES ($1,'project',$2,'created',$3)",
                [req.user.id, id, JSON.stringify({ title })]),
        ]);
        res.status(201).json({ id, message: 'Project created.' });
    } catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
    try {
        const { title, description, status, priority, start_date, end_date } = req.body;
        await query(`
            UPDATE projects SET title=$1,description=$2,status=$3,priority=$4,start_date=$5,end_date=$6,updated_at=NOW()
            WHERE id=$7
        `, [title, description, status, priority, start_date, end_date, req.params.id]);
        res.json({ message: 'Project updated.' });
    } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
    try {
        await query('DELETE FROM projects WHERE id = $1', [req.params.id]);
        res.json({ message: 'Project deleted.' });
    } catch (err) { next(err); }
});

// ── Milestones ────────────────────────────────────────────────

router.get('/:id/milestones', async (req, res, next) => {
    try {
        const { rows } = await query(`
            SELECT m.*,
                   (SELECT COUNT(*) FROM tasks t WHERE t.milestone_id = m.id)                    AS task_count,
                   (SELECT COUNT(*) FROM tasks t WHERE t.milestone_id = m.id AND t.status='done') AS done_count
            FROM milestones m WHERE m.project_id = $1
            ORDER BY m.due_date ASC
        `, [req.params.id]);
        res.json(rows);
    } catch (err) { next(err); }
});

router.post('/:id/milestones', async (req, res, next) => {
    try {
        const { title, description, due_date } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required.' });
        const { rows } = await query(
            'INSERT INTO milestones (project_id,title,description,due_date) VALUES ($1,$2,$3,$4) RETURNING id',
            [req.params.id, title, description || null, due_date || null]
        );
        res.status(201).json({ id: rows[0].id, message: 'Milestone created.' });
    } catch (err) { next(err); }
});

router.put('/:pid/milestones/:mid', async (req, res, next) => {
    try {
        const { rows: existing } = await query('SELECT * FROM milestones WHERE id=$1 AND project_id=$2', [req.params.mid, req.params.pid]);
        if (!existing.length) return res.status(404).json({ error: 'Milestone not found.' });
        const prev = existing[0];

        const { title = prev.title, description = prev.description, due_date = prev.due_date, status = prev.status } = req.body;
        await query(`
            UPDATE milestones SET title=$1,description=$2,due_date=$3,status=$4,updated_at=NOW()
            WHERE id=$5 AND project_id=$6
        `, [title, description, due_date, status, req.params.mid, req.params.pid]);

        if (status === 'completed') {
            await query("INSERT INTO activity_log (user_id,entity_type,entity_id,action,meta) VALUES ($1,'milestone',$2,'status_changed',$3)",
                [req.user.id, req.params.mid, JSON.stringify({ to: 'completed', title })]);
        }
        res.json({ message: 'Milestone updated.' });
    } catch (err) { next(err); }
});

router.delete('/:pid/milestones/:mid', async (req, res, next) => {
    try {
        await query('DELETE FROM milestones WHERE id=$1 AND project_id=$2', [req.params.mid, req.params.pid]);
        res.json({ message: 'Milestone deleted.' });
    } catch (err) { next(err); }
});

router.get('/:id/activity', async (req, res, next) => {
    try {
        const { rows } = await query(`
            SELECT al.*, u.name AS user_name
            FROM activity_log al
            LEFT JOIN users u ON u.id = al.user_id
            WHERE (al.entity_type = 'project'   AND al.entity_id = $1)
               OR (al.entity_type = 'task'      AND al.entity_id IN (SELECT id FROM tasks      WHERE project_id = $1))
               OR (al.entity_type = 'milestone' AND al.entity_id IN (SELECT id FROM milestones WHERE project_id = $1))
            ORDER BY al.created_at DESC LIMIT 30
        `, [req.params.id]);
        res.json(rows);
    } catch (err) { next(err); }
});

module.exports = router;
