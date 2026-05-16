# TaskFlow — Project Task Management System

**Final Year Project | Black Grapes Softech, Indore**
**Enrolled: 28/03/2026**

---

## 📋 Project Overview

TaskFlow is a full-stack web-based application for tracking and managing project tasks. It provides project managers with an intuitive interface to input, monitor, and update tasks, assign work to team members, track deadlines, and view project progress through milestones.

---

## 🎯 Project Objectives

- Create a user-friendly interface for project managers to input, update, and monitor project tasks
- Implement features such as task assignment, status tracking, and deadline reminders
- Integrate with a robust backend for seamless workflow management
- Provide real-time dashboard analytics and activity tracking

---

## 🛠️ Tech Stack

| Layer       | Technology                              |
|-------------|-----------------------------------------|
| Frontend    | HTML5, CSS3, Vanilla JavaScript (ES6+)  |
| Backend     | Node.js v18+ with Express.js v4         |
| Database    | SQLite (via better-sqlite3)             |
| Auth        | JSON Web Tokens (JWT) + bcryptjs        |
| Styling     | Custom CSS Design System (Dark Theme)   |
| Fonts       | DM Sans + JetBrains Mono (Google Fonts) |

---

## 📁 Project Structure

```
task-manager/
├── server.js                    ← Express application entry point
├── package.json                 ← Dependencies and scripts
├── .gitignore
├── README.md
│
├── database/
│   ├── db.js                    ← SQLite connection, schema init, seed data
│   └── schema.sql               ← All table definitions
│
├── routes/
│   ├── auth.js                  ← POST /api/auth/login, /register, GET /me
│   ├── projects.js              ← CRUD /api/projects + milestones
│   ├── tasks.js                 ← CRUD /api/tasks + comments + status patch
│   └── users.js                 ← GET /api/users, stats, notifications
│
├── middleware/
│   └── auth.js                  ← JWT authentication middleware
│
└── public/                      ← Static frontend (served by Express)
    ├── index.html               ← Login / Register
    ├── dashboard.html           ← Overview, stats, activity feed
    ├── projects.html            ← All projects, filterable grid
    ├── project-detail.html      ← Milestones, tasks table, members
    ├── tasks.html               ← Kanban board + list view
    ├── users.html               ← Team members management
    │
    ├── css/
    │   └── style.css            ← Complete design system (800+ lines)
    │
    └── js/
        └── api.js               ← API client, toast, date helpers, shared utils
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js v18 or higher
- npm v9 or higher

### Step 1 — Clone / Download the project
```bash
cd task-manager
```

### Step 2 — Install dependencies
```bash
npm install
```

### Step 3 — Start the server
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### Step 4 — Open in browser
```
http://localhost:3000
```

> The SQLite database (`taskmanager.db`) is created automatically on first run with demo data.

---

## 🔐 Demo Accounts

| Email                  | Password    | Role    |
|------------------------|-------------|---------|
| admin@bgsoft.com       | admin123    | Admin   |
| riya@bgsoft.com        | manager123  | Manager |
| arjun@bgsoft.com       | dev123      | Member  |
| priya@bgsoft.com       | dev123      | Member  |
| rahul@bgsoft.com       | dev123      | Member  |

---

## 🔌 API Reference

### Authentication
| Method | Endpoint             | Description          |
|--------|----------------------|----------------------|
| POST   | /api/auth/login      | Login, get JWT token |
| POST   | /api/auth/register   | Create new account   |
| GET    | /api/auth/me         | Get current user     |
| PUT    | /api/auth/me         | Update profile       |

### Projects
| Method | Endpoint                              | Description                  |
|--------|---------------------------------------|------------------------------|
| GET    | /api/projects                         | List all projects             |
| POST   | /api/projects                         | Create project                |
| GET    | /api/projects/:id                     | Get project with milestones   |
| PUT    | /api/projects/:id                     | Update project                |
| DELETE | /api/projects/:id                     | Delete project                |
| GET    | /api/projects/:id/milestones          | List milestones               |
| POST   | /api/projects/:id/milestones          | Add milestone                 |
| PUT    | /api/projects/:pid/milestones/:mid    | Update milestone              |
| DELETE | /api/projects/:pid/milestones/:mid    | Delete milestone              |

### Tasks
| Method | Endpoint                       | Description                        |
|--------|--------------------------------|------------------------------------|
| GET    | /api/tasks                     | List tasks (filterable by query)   |
| POST   | /api/tasks                     | Create task                        |
| GET    | /api/tasks/:id                 | Get task with comments             |
| PUT    | /api/tasks/:id                 | Update full task                   |
| PATCH  | /api/tasks/:id/status          | Quick status update (Kanban drag)  |
| DELETE | /api/tasks/:id                 | Delete task                        |
| POST   | /api/tasks/:id/comments        | Add comment                        |
| DELETE | /api/tasks/:tid/comments/:cid  | Delete comment                     |

### Users
| Method | Endpoint                          | Description                 |
|--------|-----------------------------------|-----------------------------|
| GET    | /api/users                        | List all users              |
| GET    | /api/users/stats                  | Dashboard statistics        |
| GET    | /api/users/notifications          | Get notifications           |
| PATCH  | /api/users/notifications/:id/read | Mark notification as read   |
| PATCH  | /api/users/notifications/read-all | Mark all as read            |

---

## 🗄️ Database Schema

### Tables
- **users** — Authentication + profile data
- **projects** — Project master records
- **project_members** — Many-to-many project ↔ user membership
- **milestones** — Project phase milestones with status tracking
- **tasks** — Individual task records with priority, status, assignment
- **comments** — Task comments thread
- **activity_log** — Audit trail for all entity changes
- **notifications** — User-specific in-app notifications

---

## ✨ Key Features

### Dashboard
- Real-time statistics (total projects, tasks, overdue count, team size)
- Task status bar chart visualization
- Project progress tracker with completion percentages
- Recent activity feed
- Upcoming deadlines panel (next 7 days)
- My assigned tasks quick view

### Projects
- Create, edit, delete projects with full metadata
- Filter by status (Active / On Hold / Completed / Cancelled) and priority
- Search projects by name/description
- At-a-glance progress bars and milestone counts
- Project detail with member roster

### Milestones
- Timeline view with visual status indicators
- Per-milestone task completion progress
- Quick status update inline (Pending → In Progress → Completed)
- Audit logging on status changes

### Tasks
- **Kanban Board** — 4-column board (To Do / In Progress / Review / Done)
- **Drag-and-Drop** — HTML5 native drag API to move tasks between columns
- **List View** — Sortable/filterable table view with search
- Task assignment to team members
- Priority levels: Low / Medium / High / Critical
- Due dates with overdue highlighting
- Tag system (JSON-stored, rendered as chips)
- Estimated vs actual hours tracking

### Team Management
- View all team members with their task statistics
- Invite new members with role assignment (Member / Manager / Admin)

### Notifications
- In-app notification panel (bell icon in topbar)
- Auto-generated on task assignment, milestone completion, deadlines
- Mark as read individually or all at once

### Security
- JWT-based stateless authentication (7-day expiry)
- Password hashing with bcrypt (salt rounds: 10)
- Protected API routes via middleware
- Role-based access control (Admin / Manager / Member)

---

## 🎨 Design System

- **Theme:** Dark corporate-industrial
- **Primary Accent:** Amber (`#f5a623`) for CTAs and active states
- **Status Colors:** Semantic (Blue=active, Green=done, Purple=review, Gray=todo, Red=critical/overdue)
- **Typography:** DM Sans (UI text) + JetBrains Mono (code/IDs/counts)
- **Responsive:** Grid adapts at 768px and 1100px breakpoints
- **Animations:** CSS transitions + keyframe animations for modals, toasts, cards

---

## 📈 Project Milestones (Academic)

| # | Milestone                   | Status      | Due Date   |
|---|-----------------------------|-------------|------------|
| 1 | Requirements & Research     | ✅ Completed | 10/04/2026 |
| 2 | UI/UX Design                | ✅ Completed | 25/04/2026 |
| 3 | Frontend Development        | 🔄 In Progress | 20/05/2026 |
| 4 | Backend Development         | 🔄 In Progress | 10/06/2026 |
| 5 | Testing & QA                | ⏳ Pending  | 01/07/2026 |
| 6 | Deployment & Documentation  | ⏳ Pending  | 30/07/2026 |

---

## 👨‍💻 Author

**Black Grapes Softech, Indore**
Final Year Project — BCA/MCA 2026
Enrolled Date: 28/03/2026
#   t a s k - m a n a g e r  
 #   t a s k - m a n a g e r  
 