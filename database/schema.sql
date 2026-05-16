-- ============================================================
-- Task Manager Database Schema — PostgreSQL
-- Black Grapes Softech, Indore
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        TEXT        NOT NULL,
    email       TEXT        NOT NULL UNIQUE,
    password    TEXT        NOT NULL,
    role        TEXT        NOT NULL DEFAULT 'member',
    avatar      TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
    id          SERIAL PRIMARY KEY,
    title       TEXT        NOT NULL,
    description TEXT,
    status      TEXT        NOT NULL DEFAULT 'active',
    priority    TEXT        NOT NULL DEFAULT 'medium',
    start_date  DATE,
    end_date    DATE,
    owner_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
    project_id  INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        TEXT        NOT NULL DEFAULT 'member',
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

CREATE TABLE IF NOT EXISTS milestones (
    id          SERIAL PRIMARY KEY,
    project_id  INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    description TEXT,
    due_date    DATE,
    status      TEXT        NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id            SERIAL PRIMARY KEY,
    project_id    INTEGER     NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id  INTEGER     REFERENCES milestones(id) ON DELETE SET NULL,
    title         TEXT        NOT NULL,
    description   TEXT,
    status        TEXT        NOT NULL DEFAULT 'todo',
    priority      TEXT        NOT NULL DEFAULT 'medium',
    assigned_to   INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    created_by    INTEGER     NOT NULL REFERENCES users(id),
    due_date      DATE,
    estimated_hrs NUMERIC     DEFAULT 0,
    actual_hrs    NUMERIC     DEFAULT 0,
    tags          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
    id          SERIAL PRIMARY KEY,
    task_id     INTEGER     NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id     INTEGER     NOT NULL REFERENCES users(id),
    content     TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER     REFERENCES users(id) ON DELETE SET NULL,
    entity_type TEXT        NOT NULL,
    entity_id   INTEGER     NOT NULL,
    action      TEXT        NOT NULL,
    meta        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    message     TEXT        NOT NULL,
    type        TEXT        NOT NULL DEFAULT 'info',
    is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
    entity_type TEXT,
    entity_id   INTEGER,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
