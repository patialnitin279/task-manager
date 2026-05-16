// public/js/api.js — Shared API client + utilities

const API_BASE = '/api';

// ── Token helpers ─────────────────────────────────────────
const Auth = {
    getToken() { return localStorage.getItem('tm_token'); },
    getUser()  {
        try { return JSON.parse(localStorage.getItem('tm_user')); }
        catch { return null; }
    },
    set(token, user) {
        localStorage.setItem('tm_token', token);
        localStorage.setItem('tm_user', JSON.stringify(user));
    },
    clear() {
        localStorage.removeItem('tm_token');
        localStorage.removeItem('tm_user');
    },
    isLoggedIn() { return !!this.getToken(); },
    requireAuth() {
        if (!this.isLoggedIn()) { window.location.href = '/index.html'; }
    }
};

// ── Fetch wrapper ─────────────────────────────────────────
async function api(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    try {
        const res  = await fetch(API_BASE + path, opts);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
    } catch (err) {
        if (err.message === 'Invalid or expired token.') {
            Auth.clear();
            window.location.href = '/index.html';
        }
        throw err;
    }
}

const GET    = (path)         => api('GET',    path);
const POST   = (path, body)   => api('POST',   path, body);
const PUT    = (path, body)   => api('PUT',    path, body);
const PATCH  = (path, body)   => api('PATCH',  path, body);
const DELETE = (path)         => api('DELETE', path);

// ── Toast ─────────────────────────────────────────────────
function toast(title, message = '', type = 'info', duration = 3500) {
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const container = document.getElementById('toast-container') || (() => {
        const el = document.createElement('div');
        el.id = 'toast-container';
        document.body.appendChild(el);
        return el;
    })();

    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <div class="toast-text">
            <div class="toast-title">${title}</div>
            ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
    `;
    container.appendChild(t);
    setTimeout(() => {
        t.style.animation = 'toastIn 0.2s reverse forwards';
        setTimeout(() => t.remove(), 200);
    }, duration);
}

// ── Date & time helpers ───────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function relativeTime(dateStr) {
    if (!dateStr) return '';
    const now  = new Date();
    const then = new Date(dateStr);
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60)     return 'just now';
    if (diff < 3600)   return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400)  return `${Math.floor(diff/3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
    return formatDate(dateStr);
}

function isOverdue(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
}

function daysUntil(dateStr) {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
    return diff;
}

// ── Badge helpers ─────────────────────────────────────────
function statusBadge(status) {
    const labels = { 'todo': 'To Do', 'in-progress': 'In Progress', 'review': 'Review', 'done': 'Done', 'active': 'Active', 'on-hold': 'On Hold', 'completed': 'Completed', 'cancelled': 'Cancelled', 'pending': 'Pending' };
    return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
}

function priorityBadge(priority) {
    const icons = { low: '▼', medium: '●', high: '▲', critical: '🔥' };
    const labels = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
    return `<span class="badge badge-${priority}">${icons[priority] || ''} ${labels[priority] || priority}</span>`;
}

// ── Avatar initials ───────────────────────────────────────
function initials(name = '') {
    return name.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase();
}

function avatarEl(name, size = 32) {
    return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${size*0.3}px" title="${name}">${initials(name)}</div>`;
}

// ── Progress % ────────────────────────────────────────────
function calcProgress(done, total) {
    if (!total) return 0;
    return Math.round((done / total) * 100);
}

function progressBar(pct, cls = '') {
    const color = pct === 100 ? 'done' : pct > 66 ? 'blue' : pct > 33 ? '' : 'danger';
    return `
        <div class="flex items-center gap-8">
            <div class="progress" style="flex:1">
                <div class="progress-bar ${color}" style="width:${pct}%"></div>
            </div>
            <span class="text-xs text-muted" style="min-width:32px;text-align:right">${pct}%</span>
        </div>
    `;
}

// ── Render sidebar ────────────────────────────────────────
function renderSidebar(activePage) {
    const user = Auth.getUser();
    if (!user) return;

    const nav = [
        { href: 'dashboard.html', icon: '⊞', label: 'Dashboard', key: 'dashboard' },
        { href: 'projects.html',  icon: '◈', label: 'Projects',  key: 'projects' },
        { href: 'tasks.html',     icon: '✓', label: 'All Tasks', key: 'tasks' },
        { section: 'My Work' },
        { href: 'tasks.html?assigned=me', icon: '◎', label: 'My Tasks',  key: 'mytasks' },
        { section: 'Management' },
        { href: 'users.html',     icon: '⊕', label: 'Team',      key: 'team' },
    ];

    const navHtml = nav.map(item => {
        if (item.section) return `<div class="nav-section-label">${item.section}</div>`;
        return `
            <a href="${item.href}" class="nav-link ${activePage === item.key ? 'active' : ''}">
                <span class="nav-icon">${item.icon}</span>
                ${item.label}
            </a>
        `;
    }).join('');

    return `
        <div class="sidebar">
            <div class="sidebar-brand">
                <div class="brand-icon">⊞</div>
                <div class="brand-text">
                    <div class="brand-name">TaskFlow</div>
                    <div class="brand-sub">BG Softech</div>
                </div>
            </div>
            <nav class="sidebar-nav">${navHtml}</nav>
            <div class="sidebar-footer">
                <div class="user-card" id="user-card-btn">
                    <div class="avatar">${initials(user.name)}</div>
                    <div class="user-info">
                        <div class="user-name">${user.name}</div>
                        <div class="user-role">${user.role}</div>
                    </div>
                    <span style="color:var(--text-muted);font-size:0.8rem">⋮</span>
                </div>
            </div>
        </div>
    `;
}

// ── Close dropdowns on outside click ─────────────────────
document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
    }
    if (!e.target.closest('.notif-wrap')) {
        document.querySelectorAll('.notif-panel.open').forEach(p => p.classList.remove('open'));
    }
});

// ── Modal helpers ─────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('open');
    }
});
