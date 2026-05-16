// database/db.js — PostgreSQL connection, schema init, and seed data
require('dotenv').config();
const { Pool } = require('pg');
const fs       = require('fs');
const path     = require('path');
const bcrypt   = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function query(sql, params = []) {
    return pool.query(sql, params);
}

async function initDb() {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    await pool.query(schema);

    const { rows } = await pool.query('SELECT COUNT(*) AS c FROM users');
    if (parseInt(rows[0].c) === 0) {
        await seedDemoData();
    }

    console.log('[DB] PostgreSQL database initialised.');
}

async function seedDemoData() {
    const hash = (p) => bcrypt.hashSync(p, 10);

    // ── Users ─────────────────────────────────────────────────────
    const uq = (name, email, password, role) =>
        pool.query('INSERT INTO users (name,email,password,role) VALUES ($1,$2,$3,$4) RETURNING id',
            [name, email, hash(password), role]);

    const adminId   = (await uq('Admin User',    'admin@bgsoft.com',  'admin123',   'admin')).rows[0].id;
    const managerId = (await uq('Riya Sharma',   'riya@bgsoft.com',   'manager123', 'manager')).rows[0].id;
    const dev1Id    = (await uq('Arjun Mehta',   'arjun@bgsoft.com',  'dev123',     'member')).rows[0].id;
    const dev2Id    = (await uq('Priya Patel',   'priya@bgsoft.com',  'dev123',     'member')).rows[0].id;
    const dev3Id    = (await uq('Rahul Gupta',   'rahul@bgsoft.com',  'dev123',     'member')).rows[0].id;

    // ── Projects ──────────────────────────────────────────────────
    const pq = (title, desc, status, priority, start, end, owner) =>
        pool.query(
            'INSERT INTO projects (title,description,status,priority,start_date,end_date,owner_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
            [title, desc, status, priority, start, end, owner]
        );

    const p1Id = (await pq('Task Management Web App',
        'A web-based application for tracking and managing project tasks with real-time collaboration features.',
        'active', 'high', '2026-03-28', '2026-07-30', adminId)).rows[0].id;

    const p2Id = (await pq('E-Commerce Platform',
        'Full-stack online store with payment gateway, inventory management, and analytics dashboard.',
        'active', 'critical', '2026-02-01', '2026-06-30', managerId)).rows[0].id;

    const p3Id = (await pq('HR Management System',
        'Internal HR portal for employee onboarding, leave management, and payroll processing.',
        'on-hold', 'medium', '2026-01-15', '2026-08-15', adminId)).rows[0].id;

    const p4Id = (await pq('Mobile Banking App',
        'Cross-platform mobile app for retail banking with biometric authentication and UPI support.',
        'completed', 'high', '2025-10-01', '2026-03-15', managerId)).rows[0].id;

    // ── Project Members ───────────────────────────────────────────
    const mem = (pid, uid, role) =>
        pool.query('INSERT INTO project_members (project_id,user_id,role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [pid, uid, role]);

    await mem(p1Id, managerId, 'manager');  await mem(p1Id, dev1Id, 'member');   await mem(p1Id, dev2Id, 'member');
    await mem(p2Id, adminId,   'manager');  await mem(p2Id, dev1Id, 'member');   await mem(p2Id, dev3Id, 'member');
    await mem(p3Id, managerId, 'manager');  await mem(p3Id, dev2Id, 'member');   await mem(p3Id, dev3Id, 'member');
    await mem(p4Id, adminId,   'manager');  await mem(p4Id, dev1Id, 'member');   await mem(p4Id, dev3Id, 'member');

    // ── Milestones ────────────────────────────────────────────────
    const mq = (pid, title, desc, due, status) =>
        pool.query('INSERT INTO milestones (project_id,title,description,due_date,status) VALUES ($1,$2,$3,$4,$5) RETURNING id',
            [pid, title, desc, due, status]);

    // Project 1 milestones
    const m1 = (await mq(p1Id, 'Requirements & Research',    'Gather requirements, research tools, and define system scope.',   '2026-04-10', 'completed')).rows[0].id;
    const m2 = (await mq(p1Id, 'UI/UX Design',              'Design all wireframes and finalize the component design system.',  '2026-04-25', 'completed')).rows[0].id;
    const m3 = (await mq(p1Id, 'Frontend Development',       'Implement all frontend pages and interactive components.',        '2026-05-25', 'in-progress')).rows[0].id;
    const m4 = (await mq(p1Id, 'Backend Development',        'Build REST API, database schema, and auth layer.',               '2026-06-15', 'in-progress')).rows[0].id;
    const m5 = (await mq(p1Id, 'Testing & QA',              'Unit, integration, and user acceptance testing.',                 '2026-07-05', 'pending')).rows[0].id;
    const m6 = (await mq(p1Id, 'Deployment & Documentation', 'Deploy to production, write API docs, and onboarding guide.',    '2026-07-30', 'pending')).rows[0].id;

    // Project 2 milestones
    const m7  = (await mq(p2Id, 'Product Catalogue',         'Design and implement product listing and detail pages.',         '2026-03-20', 'completed')).rows[0].id;
    const m8  = (await mq(p2Id, 'Checkout & Payments',       'Shopping cart, order flow, and Razorpay integration.',           '2026-05-10', 'in-progress')).rows[0].id;
    const m9  = (await mq(p2Id, 'Admin Panel',               'Inventory management, order tracking, and analytics for admins.','2026-06-15', 'pending')).rows[0].id;

    // Project 3 milestones
    const m10 = (await mq(p3Id, 'Employee Onboarding Module','Digital forms, document uploads, and welcome workflow.',         '2026-04-30', 'in-progress')).rows[0].id;
    const m11 = (await mq(p3Id, 'Leave Management',          'Leave request, approval workflow, and leave calendar.',          '2026-06-30', 'pending')).rows[0].id;

    // ── Tasks ─────────────────────────────────────────────────────
    const tq = (pid, mid, title, desc, status, priority, assignee, creator, due, hrs, tags) =>
        pool.query(
            'INSERT INTO tasks (project_id,milestone_id,title,description,status,priority,assigned_to,created_by,due_date,estimated_hrs,tags) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id',
            [pid, mid, title, desc, status, priority, assignee, creator, due, hrs, tags]
        );

    // --- Project 1 Tasks (all 4 statuses represented) ---
    const t1  = (await tq(p1Id,m1,'Research task management tools','Survey Jira, Trello, Asana and document findings.','done','medium',dev1Id,adminId,'2026-04-05',8,'["research","documentation"]')).rows[0].id;
    const t2  = (await tq(p1Id,m1,'Define system requirements document','Write SRS with functional and non-functional requirements.','done','high',dev2Id,adminId,'2026-04-09',12,'["documentation"]')).rows[0].id;
    const t3  = (await tq(p1Id,m2,'Create wireframes for all pages','Use Figma to design dashboard, kanban, and project pages.','done','high',dev2Id,managerId,'2026-04-20',16,'["design","figma"]')).rows[0].id;
    const t4  = (await tq(p1Id,m2,'Design component library','Build reusable button, card, modal, and badge components in Figma.','done','medium',dev2Id,managerId,'2026-04-24',10,'["design","figma"]')).rows[0].id;
    const t5  = (await tq(p1Id,m3,'Build login and registration pages','Auth UI with form validation and error states.','done','high',dev1Id,managerId,'2026-05-05',8,'["frontend","auth"]')).rows[0].id;
    const t6  = (await tq(p1Id,m3,'Develop dashboard page','Stats cards, progress charts, activity feed, and deadline widgets.','in-progress','high',dev1Id,managerId,'2026-05-22',14,'["frontend","dashboard"]')).rows[0].id;
    const t7  = (await tq(p1Id,m3,'Implement kanban board','Drag-and-drop kanban with real-time status updates.','in-progress','high',dev2Id,managerId,'2026-05-20',20,'["frontend","kanban"]')).rows[0].id;
    const t8  = (await tq(p1Id,m3,'Add notification system UI','Notification bell, panel, and toast component.','review','medium',dev1Id,managerId,'2026-05-23',6,'["frontend","notifications"]')).rows[0].id;
    const t9  = (await tq(p1Id,m3,'Build project detail page','Project overview, member list, milestone tracker, and activity feed.','review','high',dev2Id,managerId,'2026-05-24',12,'["frontend","projects"]')).rows[0].id;
    const t10 = (await tq(p1Id,m4,'Set up Express server and routing','Configure Express with CORS, body parser, and error handler.','done','high',dev3Id,adminId,'2026-04-28',8,'["backend","nodejs"]')).rows[0].id;
    const t11 = (await tq(p1Id,m4,'Implement JWT authentication','Login, register, and token verification middleware.','done','critical',dev3Id,adminId,'2026-05-08',12,'["backend","auth","security"]')).rows[0].id;
    const t12 = (await tq(p1Id,m4,'Build CRUD APIs for tasks and projects','REST endpoints with filters, pagination, and validation.','in-progress','high',dev3Id,adminId,'2026-06-05',20,'["backend","api","rest"]')).rows[0].id;
    const t13 = (await tq(p1Id,m4,'Integrate PostgreSQL with pg driver','Replace SQLite with cloud PostgreSQL, update all queries.','done','high',dev3Id,adminId,'2026-05-15',10,'["backend","database","postgresql"]')).rows[0].id;
    const t14 = (await tq(p1Id,m5,'Write unit tests for API endpoints','Jest + supertest for all route handlers.','todo','high',dev3Id,adminId,'2026-06-20',16,'["testing","jest"]')).rows[0].id;
    const t15 = (await tq(p1Id,m5,'Perform user acceptance testing','UAT sessions with 3 stakeholders from BG Softech.','todo','high',dev2Id,managerId,'2026-06-28',8,'["testing","uat"]')).rows[0].id;
    const t16 = (await tq(p1Id,m6,'Deploy to Render / Railway','Configure env vars, run migrations on production DB.','todo','critical',dev3Id,adminId,'2026-07-20',8,'["devops","deployment"]')).rows[0].id;
    const t17 = (await tq(p1Id,m6,'Write API documentation','Swagger/OpenAPI docs for all endpoints with examples.','todo','medium',dev1Id,adminId,'2026-07-28',6,'["documentation","api"]')).rows[0].id;

    // --- Project 2 Tasks ---
    const t18 = (await tq(p2Id,m7,'Set up project scaffolding','Initialise repo, configure ESLint, Prettier, and folder structure.','done','high',dev1Id,managerId,'2026-02-10',4,'["setup","tooling"]')).rows[0].id;
    const t19 = (await tq(p2Id,m7,'Design product catalogue UI','Product grid with filter sidebar, search bar, and sort options.','done','high',dev3Id,managerId,'2026-03-15',18,'["frontend","ecommerce","design"]')).rows[0].id;
    const t20 = (await tq(p2Id,m7,'Build product listing API','REST endpoint with category filter, price range, and pagination.','done','high',dev1Id,adminId,'2026-03-18',12,'["backend","api","ecommerce"]')).rows[0].id;
    const t21 = (await tq(p2Id,m8,'Implement shopping cart','Add/remove items, quantity update, and persistent cart via localStorage.','in-progress','critical',dev1Id,managerId,'2026-05-20',20,'["frontend","cart","ecommerce"]')).rows[0].id;
    const t22 = (await tq(p2Id,m8,'Integrate Razorpay payment gateway','Checkout flow, order creation, and webhook handler.','in-progress','critical',dev3Id,managerId,'2026-05-28',24,'["backend","payments","razorpay"]')).rows[0].id;
    const t23 = (await tq(p2Id,m8,'Build order confirmation page','Order summary, payment status, and email receipt trigger.','review','high',dev3Id,adminId,'2026-05-22',10,'["frontend","orders"]')).rows[0].id;
    const t24 = (await tq(p2Id,m9,'Build inventory management module','Stock tracking, low-stock alerts, and bulk import via CSV.','todo','high',dev3Id,adminId,'2026-06-10',20,'["backend","inventory"]')).rows[0].id;
    const t25 = (await tq(p2Id,m9,'Admin analytics dashboard','Sales charts, top products, revenue trends, and export to PDF.','todo','medium',dev1Id,managerId,'2026-06-25',16,'["frontend","analytics","dashboard"]')).rows[0].id;

    // --- Project 3 Tasks ---
    const t26 = (await tq(p3Id,m10,'Design onboarding form flows','Multi-step forms for employee details, documents, and equipment request.','done','medium',dev2Id,managerId,'2026-04-10',10,'["design","hr","forms"]')).rows[0].id;
    const t27 = (await tq(p3Id,m10,'Build employee profile API','CRUD for employee records, department assignment, and reporting manager.','in-progress','high',dev3Id,adminId,'2026-05-20',14,'["backend","hr","api"]')).rows[0].id;
    const t28 = (await tq(p3Id,m10,'Document upload and verification','S3-compatible storage for Aadhaar, PAN, and degree certificates.','review','medium',dev2Id,managerId,'2026-05-25',12,'["backend","storage","hr"]')).rows[0].id;
    const t29 = (await tq(p3Id,m11,'Leave request and approval workflow','Employee submits leave, manager approves/rejects with email notification.','todo','high',dev2Id,managerId,'2026-06-20',16,'["backend","workflow","hr"]')).rows[0].id;
    const t30 = (await tq(p3Id,m11,'Leave calendar view','Monthly calendar showing approved leaves, holidays, and team availability.','todo','medium',dev3Id,adminId,'2026-06-28',10,'["frontend","calendar","hr"]')).rows[0].id;

    // --- Project 4 Tasks (completed project — all done) ---
    const t31 = (await tq(p4Id,null,'Biometric authentication module','Fingerprint and face ID login via device APIs.','done','critical',dev1Id,adminId,'2025-12-15',20,'["mobile","security","auth"]')).rows[0].id;
    const t32 = (await tq(p4Id,null,'UPI payment integration','BHIM UPI, PhonePe, and Google Pay deep-link support.','done','critical',dev3Id,managerId,'2026-01-20',24,'["mobile","payments","upi"]')).rows[0].id;
    const t33 = (await tq(p4Id,null,'Account statement and mini statement','PDF download and in-app viewer for last 90 days.','done','high',dev1Id,adminId,'2026-02-10',12,'["mobile","reports"]')).rows[0].id;
    const t34 = (await tq(p4Id,null,'Push notification system','FCM-based alerts for transactions, OTPs, and offers.','done','medium',dev3Id,adminId,'2026-03-01',8,'["mobile","notifications","fcm"]')).rows[0].id;

    // ── Comments ──────────────────────────────────────────────────
    const cq = (tid, uid, content) =>
        pool.query('INSERT INTO comments (task_id,user_id,content) VALUES ($1,$2,$3)', [tid, uid, content]);

    await cq(t6,  managerId, 'Dashboard is looking good so far. Make sure the chart library is lightweight — avoid Chart.js, prefer a canvas-based solution.');
    await cq(t6,  dev1Id,    'Using a custom SVG bar chart to keep bundle size down. Will share a preview by EOD.');
    await cq(t6,  adminId,   'Great call. Also add a skeleton loader so the page does not flash empty content on slow connections.');
    await cq(t7,  dev2Id,    'Drag-and-drop is working across all 4 columns. Need to handle the edge case where a card is dropped in the same column.');
    await cq(t7,  managerId, 'Also make sure status change is debounced — we don\'t want to fire an API call for every mid-drag hover.');
    await cq(t8,  dev1Id,    'Notification panel complete. Unread count badge is live. Marking individual items as read works. Sending for review.');
    await cq(t8,  managerId, 'LGTM. One nit — the panel should close when clicking outside it, not just on the bell icon again.');
    await cq(t8,  dev1Id,    'Fixed. Added a document click listener to close on outside click.');
    await cq(t11, dev3Id,    'JWT middleware done. Tokens expire in 7 days. Should we add refresh token support or keep it simple for now?');
    await cq(t11, adminId,   'Keep it simple for now — out of scope for v1. We can add refresh tokens in the next sprint.');
    await cq(t12, dev3Id,    'Working on the tasks API. PostgreSQL subqueries for counts are much cleaner than SQLite. Almost done.');
    await cq(t12, adminId,   'Reminder: all filter params should be sanitised before building the dynamic query. No raw string interpolation.');
    await cq(t21, dev1Id,    'Cart persistence via localStorage is done. Should we sync cart to server for logged-in users?');
    await cq(t21, managerId, 'Yes, add a cart_items table. Guest cart stays in localStorage, logged-in cart syncs on login.');
    await cq(t22, dev3Id,    'Razorpay test keys are in the .env. Checkout flow works end-to-end in test mode. Going live needs KYC approval.');
    await cq(t22, adminId,   'KYC already submitted last week. Should be approved by May 25. Proceed with the webhook handler in parallel.');
    await cq(t27, dev3Id,    'Employee API is 80% done. Stuck on the reporting-manager circular reference — a manager can\'t report to their own reportee.');
    await cq(t27, adminId,   'Add a CHECK constraint at DB level and validate in the API before insert. Throw a 400 if the chain is circular.');
    await cq(t28, dev2Id,    'Document upload working with presigned S3 URLs. Files are scanned by ClamAV before being marked as verified.');
    await cq(t28, managerId, 'Perfect. Make sure we store the file size and MIME type in the DB for the verification audit trail.');

    // ── Activity Log ──────────────────────────────────────────────
    const aq = (uid, type, eid, action, meta) =>
        pool.query('INSERT INTO activity_log (user_id,entity_type,entity_id,action,meta) VALUES ($1,$2,$3,$4,$5)',
            [uid, type, eid, action, JSON.stringify(meta)]);

    await aq(adminId,   'project', p1Id, 'created',        { title: 'Task Management Web App' });
    await aq(managerId, 'project', p2Id, 'created',        { title: 'E-Commerce Platform' });
    await aq(adminId,   'project', p3Id, 'created',        { title: 'HR Management System' });
    await aq(managerId, 'project', p4Id, 'created',        { title: 'Mobile Banking App' });
    await aq(managerId, 'milestone', m2, 'status_changed', { from: 'in-progress', to: 'completed', title: 'UI/UX Design' });
    await aq(managerId, 'milestone', m1, 'status_changed', { from: 'in-progress', to: 'completed', title: 'Requirements & Research' });
    await aq(managerId, 'milestone', m7, 'status_changed', { from: 'in-progress', to: 'completed', title: 'Product Catalogue' });
    await aq(dev1Id,    'task', t5,  'status_changed',     { from: 'todo', to: 'done', title: 'Build login and registration pages' });
    await aq(dev3Id,    'task', t10, 'status_changed',     { from: 'todo', to: 'done', title: 'Set up Express server and routing' });
    await aq(dev3Id,    'task', t11, 'status_changed',     { from: 'in-progress', to: 'done', title: 'Implement JWT authentication' });
    await aq(dev3Id,    'task', t13, 'status_changed',     { from: 'in-progress', to: 'done', title: 'Integrate PostgreSQL with pg driver' });
    await aq(dev2Id,    'task', t7,  'status_changed',     { from: 'todo', to: 'in-progress', title: 'Implement kanban board' });
    await aq(dev1Id,    'task', t8,  'status_changed',     { from: 'in-progress', to: 'review', title: 'Add notification system UI' });
    await aq(dev2Id,    'task', t9,  'status_changed',     { from: 'in-progress', to: 'review', title: 'Build project detail page' });
    await aq(dev3Id,    'task', t23, 'status_changed',     { from: 'in-progress', to: 'review', title: 'Build order confirmation page' });
    await aq(dev1Id,    'task', t18, 'status_changed',     { from: 'todo', to: 'done', title: 'Set up project scaffolding' });
    await aq(adminId,   'task', t16, 'created',            { title: 'Deploy to Render / Railway' });
    await aq(managerId, 'task', t24, 'created',            { title: 'Build inventory management module' });
    await aq(dev2Id,    'task', t28, 'status_changed',     { from: 'in-progress', to: 'review', title: 'Document upload and verification' });

    // ── Notifications ─────────────────────────────────────────────
    const nq = (uid, title, message, type, etype, eid) =>
        pool.query('INSERT INTO notifications (user_id,title,message,type,entity_type,entity_id) VALUES ($1,$2,$3,$4,$5,$6)',
            [uid, title, message, type, etype, eid]);

    // Admin notifications
    await nq(adminId, 'Milestone Completed',   'UI/UX Design milestone on Task Management Web App is complete.', 'success',  'milestone', m2);
    await nq(adminId, 'Milestone Completed',   'Requirements & Research milestone has been marked complete.',    'success',  'milestone', m1);
    await nq(adminId, 'Review Required',       'Notification system UI is ready for your review.',              'warning',  'task',      t8);
    await nq(adminId, 'Review Required',       'Project detail page build is ready for review.',                'warning',  'task',      t9);
    await nq(adminId, 'Task Overdue',          'Dashboard page development has passed its due date.',           'deadline', 'task',      t6);
    await nq(adminId, 'New Comment',           'Rahul commented on "Integrate Razorpay payment gateway".',      'info',     'task',      t22);
    await nq(adminId, 'Payment KYC Update',    'Razorpay KYC approved — live keys will be available soon.',    'success',  'task',      t22);

    // Manager (Riya) notifications
    await nq(managerId, 'Task In Review',     'Arjun submitted "Add notification system UI" for review.',      'info',    'task',      t8);
    await nq(managerId, 'Task In Review',     'Priya submitted "Build project detail page" for review.',       'info',    'task',      t9);
    await nq(managerId, 'Task In Review',     'Rahul submitted "Build order confirmation page" for review.',   'info',    'task',      t23);
    await nq(managerId, 'Task In Review',     'Priya submitted "Document upload and verification" for review.','info',    'task',      t28);
    await nq(managerId, 'Deadline Approaching','Shopping cart implementation is due in 4 days.',               'deadline','task',      t21);
    await nq(managerId, 'New Comment',        'Arjun added a question on "Shopping cart" about server sync.',  'info',    'task',      t21);

    // Dev 1 (Arjun) notifications
    await nq(dev1Id, 'Task Assigned',         'You have been assigned "Build API documentation".',             'info',    'task', t17);
    await nq(dev1Id, 'Task Assigned',         'You have been assigned "Admin analytics dashboard".',           'info',    'task', t25);
    await nq(dev1Id, 'Comment on your task',  'Admin commented on "Dashboard page" asking for skeleton loaders.','info', 'task', t6);
    await nq(dev1Id, 'Deadline Tomorrow',     '"Implement kanban board" is due tomorrow — May 20.',            'deadline','task', t7);

    // Dev 2 (Priya) notifications
    await nq(dev2Id, 'Review Feedback',       'Manager reviewed your notification UI — one fix requested.',    'warning', 'task', t8);
    await nq(dev2Id, 'Task Assigned',         'You have been assigned "Perform user acceptance testing".',     'info',    'task', t15);
    await nq(dev2Id, 'Task Assigned',         'You have been assigned "Leave request and approval workflow".', 'info',    'task', t29);

    // Dev 3 (Rahul) notifications
    await nq(dev3Id, 'Task Assigned',         'You have been assigned "Deploy to Render / Railway".',          'info',    'task', t16);
    await nq(dev3Id, 'Comment on your task',  'Admin replied on "Build CRUD APIs" about query sanitisation.',  'info',    'task', t12);
    await nq(dev3Id, 'Deadline Approaching',  'Razorpay integration is due in 12 days — May 28.',             'deadline','task', t22);

    console.log('[DB] Demo data seeded successfully.');
    console.log('[DB] Accounts: admin@bgsoft.com / riya@bgsoft.com / arjun@bgsoft.com (password same as username prefix + 123)');
}

module.exports = { query, initDb };
