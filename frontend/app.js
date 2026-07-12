const API_BASE = localStorage.getItem('assetflow_api_base') || 'http://localhost:5001/api';

const state = {
  token: localStorage.getItem('assetflow_token') || '',
  user: JSON.parse(localStorage.getItem('assetflow_user') || 'null'),
  page: 'dashboard',
  authMode: 'login',
  error: '',
  ok: '',
};

const root = document.getElementById('app');

function clearNotice() {
  state.error = '';
  state.ok = '';
}

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = payload.message || payload.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return payload;
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('assetflow_token', token);
  localStorage.setItem('assetflow_user', JSON.stringify(user));
}

function logout() {
  state.token = '';
  state.user = null;
  localStorage.removeItem('assetflow_token');
  localStorage.removeItem('assetflow_user');
  state.page = 'dashboard';
  render();
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  clearNotice();
  const form = new FormData(event.target);

  try {
    if (state.authMode === 'login') {
      const { token, user } = await api('/auth/login', {
        method: 'POST',
        body: {
          email: form.get('email'),
          password: form.get('password'),
        },
      });
      setSession(token, user);
      state.page = 'dashboard';
      state.ok = `Welcome ${user.name}`;
      render();
      return;
    }

    const { token, user } = await api('/auth/signup', {
      method: 'POST',
      body: {
        name: form.get('name'),
        email: form.get('email'),
        password: form.get('password'),
      },
    });
    setSession(token, user);
    state.page = 'dashboard';
    state.ok = 'Account created';
    render();
  } catch (err) {
    state.error = err.message;
    render();
  }
}

function authView() {
  return `
    <div class="auth-wrap">
      <div class="auth-card">
        <h2>AssetFlow Login</h2>
        <p class="kicker">Enterprise asset and resource management</p>
        <p class="kicker">API: ${escapeHtml(API_BASE)}</p>
        <div class="auth-tabs">
          <button class="${state.authMode === 'login' ? 'primary' : 'ghost'}" data-auth-tab="login">Login</button>
          <button class="${state.authMode === 'signup' ? 'primary' : 'ghost'}" data-auth-tab="signup">Create Account</button>
        </div>
        ${state.error ? `<div class="notice error">${escapeHtml(state.error)}</div>` : ''}
        ${state.ok ? `<div class="notice ok">${escapeHtml(state.ok)}</div>` : ''}
        <form class="form" id="auth-form">
          ${state.authMode === 'signup' ? '<input name="name" placeholder="Full name" required />' : ''}
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required minlength="6" />
          <button class="primary" type="submit">${state.authMode === 'login' ? 'Sign In' : 'Create Account'}</button>
        </form>
      </div>
    </div>
  `;
}

function layout(content) {
  const user = state.user || {};
  const menu = [
    ['dashboard', 'Dashboard'],
    ['org', 'Organization Setup'],
    ['assets', 'Assets'],
    ['allocation', 'Allocation & Transfer'],
  ];

  return `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand">AssetFlow</div>
        <div class="kicker">${escapeHtml(user.name || '')} (${escapeHtml(user.role || '')})</div>
        <div class="menu" style="margin-top:14px;">
          ${menu
            .map(
              ([id, label]) =>
                `<button class="${state.page === id ? 'active' : ''}" data-nav="${id}">${label}</button>`
            )
            .join('')}
          <button data-nav="logout">Logout</button>
        </div>
      </aside>
      <main class="main">
        <div class="topbar">
          <h2 style="margin:0;">${escapeHtml(menu.find((m) => m[0] === state.page)?.[1] || 'Workspace')}</h2>
          <span class="kicker">Connected to API</span>
        </div>
        ${state.error ? `<div class="notice error">${escapeHtml(state.error)}</div>` : ''}
        ${state.ok ? `<div class="notice ok">${escapeHtml(state.ok)}</div>` : ''}
        ${content}
      </main>
    </div>
  `;
}

async function dashboardView() {
  const data = await api('/dashboard');
  const k = data.kpis || {};
  return `
    <div class="grid cards">
      <div class="card"><h4>Available</h4><div class="stat">${k.available || 0}</div></div>
      <div class="card"><h4>Allocated</h4><div class="stat">${k.allocated || 0}</div></div>
      <div class="card"><h4>Maintenance</h4><div class="stat">${k.maintenanceToday || 0}</div></div>
      <div class="card"><h4>Active Bookings</h4><div class="stat">${k.activeBookings || 0}</div></div>
      <div class="card"><h4>Pending Transfers</h4><div class="stat">${k.pendingTransfers || 0}</div></div>
      <div class="card"><h4>Upcoming Returns</h4><div class="stat">${k.upcomingReturns || 0}</div></div>
    </div>

    <div class="grid" style="grid-template-columns: 1fr 1fr; margin-top: 12px;">
      <div class="card">
        <h3>Maintenance Board</h3>
        <p class="kicker">Pipeline status</p>
        <div class="grid cards" style="margin-top:8px;">
          <div class="card"><h4>Pending</h4><div class="stat">${data.maintenanceBoard?.pending || 0}</div></div>
          <div class="card"><h4>Approved</h4><div class="stat">${data.maintenanceBoard?.approved || 0}</div></div>
          <div class="card"><h4>Tech Assigned</h4><div class="stat">${data.maintenanceBoard?.technicianAssigned || 0}</div></div>
          <div class="card"><h4>In Progress</h4><div class="stat">${data.maintenanceBoard?.inProgress || 0}</div></div>
          <div class="card"><h4>Resolved</h4><div class="stat">${data.maintenanceBoard?.resolved || 0}</div></div>
        </div>
      </div>
      <div class="card">
        <h3>Audit Signal</h3>
        <p class="kicker">Open cycle discrepancies</p>
        <div class="stat">${data.openAuditDiscrepancies || 0}</div>
      </div>
    </div>

    <div class="card" style="margin-top: 12px;">
      <h3>Recent Activity</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Message</th><th>Actor</th><th>Time</th></tr></thead>
          <tbody>
            ${(data.recentActivity || [])
              .map(
                (a) =>
                  `<tr><td>${escapeHtml(a.message)}</td><td>${escapeHtml(a.actor)}</td><td>${new Date(a.at).toLocaleString()}</td></tr>`
              )
              .join('') || '<tr><td colspan="3">No activity yet</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function orgView() {
  const [departments, categories, employees] = await Promise.all([
    api('/org/departments'),
    api('/org/categories'),
    api('/org/employees'),
  ]);

  return `
    <div class="grid" style="grid-template-columns: 1fr 1fr;">
      <div class="card">
        <h3>Create Department</h3>
        <form class="form" id="create-department-form">
          <input name="name" placeholder="Department name" required />
          <button class="primary" type="submit">Add Department</button>
        </form>
      </div>

      <div class="card">
        <h3>Create Category</h3>
        <form class="form" id="create-category-form">
          <input name="name" placeholder="Category name" required />
          <button class="primary" type="submit">Add Category</button>
        </form>
      </div>
    </div>

    <div class="card" style="margin-top:12px;">
      <h3>Departments</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Head</th><th>Status</th></tr></thead>
          <tbody>
            ${(departments.departments || [])
              .map((d) => `<tr><td>${escapeHtml(d.name)}</td><td>${escapeHtml(d.head?.name || '-')}</td><td>${escapeHtml(d.status)}</td></tr>`)
              .join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-top:12px;">
      <h3>Categories</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Status</th></tr></thead>
          <tbody>
            ${(categories.categories || [])
              .map((c) => `<tr><td>${escapeHtml(c.name)}</td><td>${escapeHtml(c.status)}</td></tr>`)
              .join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-top:12px;">
      <h3>Employees</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th></tr></thead>
          <tbody>
            ${(employees.employees || [])
              .map(
                (u) =>
                  `<tr><td>${escapeHtml(u.name)}</td><td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.role)}</td><td>${escapeHtml(u.department?.name || '-')}</td></tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function assetsView() {
  const [assets, categories] = await Promise.all([api('/assets'), api('/org/categories')]);

  return `
    <div class="card">
      <h3>Register Asset</h3>
      <form class="form" id="create-asset-form">
        <div class="form-row">
          <input name="name" placeholder="Asset name" required />
          <select name="category" required>
            <option value="">Select category</option>
            ${(categories.categories || []).map((c) => `<option value="${c._id}">${escapeHtml(c.name)}</option>`).join('')}
          </select>
          <input name="serialNumber" placeholder="Serial number" />
        </div>
        <div class="form-row">
          <input name="location" placeholder="Location" />
          <select name="condition">
            <option>Good</option><option>New</option><option>Fair</option><option>Poor</option><option>Damaged</option>
          </select>
          <label style="display:flex; align-items:center; gap:8px;">
            <input style="width:auto" type="checkbox" name="bookable" /> Bookable Resource
          </label>
        </div>
        <button class="primary" type="submit">Register Asset</button>
      </form>
    </div>

    <div class="card" style="margin-top:12px;">
      <h3>Asset Directory</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Tag</th><th>Name</th><th>Category</th><th>Status</th><th>Location</th></tr></thead>
          <tbody>
            ${(assets.assets || [])
              .map(
                (a) =>
                  `<tr><td>${escapeHtml(a.tag)}</td><td>${escapeHtml(a.name)}</td><td>${escapeHtml(a.category?.name || '-')}</td><td>${escapeHtml(a.status)}</td><td>${escapeHtml(a.location || '-')}</td></tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function allocationView() {
  const [assets, employees, transfers] = await Promise.all([
    api('/assets'),
    api('/org/employees'),
    api('/transfers'),
  ]);

  const allocatableAssets = (assets.assets || []).filter((a) => a.status !== 'Disposed');

  return `
    <div class="grid" style="grid-template-columns: 1fr 1fr;">
      <div class="card">
        <h3>Allocate Asset</h3>
        <form class="form" id="allocate-form">
          <select name="assetId" required>
            <option value="">Select asset</option>
            ${allocatableAssets.map((a) => `<option value="${a._id}">${escapeHtml(a.tag)} - ${escapeHtml(a.name)}</option>`).join('')}
          </select>
          <select name="employeeId" required>
            <option value="">Select employee</option>
            ${(employees.employees || []).map((u) => `<option value="${u.id}">${escapeHtml(u.name)} (${escapeHtml(u.role)})</option>`).join('')}
          </select>
          <input type="date" name="expectedReturnDate" />
          <button class="primary" type="submit">Allocate</button>
        </form>
      </div>

      <div class="card">
        <h3>Request Transfer</h3>
        <form class="form" id="transfer-form">
          <select name="assetId" required>
            <option value="">Select asset</option>
            ${allocatableAssets.map((a) => `<option value="${a._id}">${escapeHtml(a.tag)} - ${escapeHtml(a.name)}</option>`).join('')}
          </select>
          <select name="toUserId" required>
            <option value="">Transfer to employee</option>
            ${(employees.employees || []).map((u) => `<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('')}
          </select>
          <textarea name="reason" placeholder="Reason"></textarea>
          <button class="primary" type="submit">Raise Transfer Request</button>
        </form>
      </div>
    </div>

    <div class="card" style="margin-top:12px;">
      <h3>Transfers</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Asset</th><th>From</th><th>To</th><th>Status</th><th>Requested By</th></tr></thead>
          <tbody>
            ${(transfers.transfers || [])
              .map(
                (t) =>
                  `<tr><td>${escapeHtml(t.asset?.tag || '')} ${escapeHtml(t.asset?.name || '')}</td><td>${escapeHtml(t.fromUser?.name || '-')}</td><td>${escapeHtml(t.toUser?.name || t.toDepartment?.name || '-')}</td><td>${escapeHtml(t.status)}</td><td>${escapeHtml(t.requestedBy?.name || '-')}</td></tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function renderPage() {
  clearNotice();
  try {
    if (state.page === 'dashboard') return await dashboardView();
    if (state.page === 'org') return await orgView();
    if (state.page === 'assets') return await assetsView();
    if (state.page === 'allocation') return await allocationView();
    return '<div class="card">Unknown page</div>';
  } catch (err) {
    state.error = err.message;
    return '<div class="card">Failed to load page data.</div>';
  }
}

async function render() {
  if (!state.token || !state.user) {
    root.innerHTML = authView();
    bindAuth();
    return;
  }

  const content = await renderPage();
  root.innerHTML = layout(content);
  bindShell();
}

function bindAuth() {
  const form = document.getElementById('auth-form');
  if (form) form.addEventListener('submit', handleAuthSubmit);

  root.querySelectorAll('[data-auth-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      state.authMode = button.getAttribute('data-auth-tab');
      clearNotice();
      render();
    });
  });
}

function bindShell() {
  root.querySelectorAll('[data-nav]').forEach((button) => {
    button.addEventListener('click', async () => {
      const next = button.getAttribute('data-nav');
      if (next === 'logout') {
        logout();
        return;
      }
      state.page = next;
      await render();
    });
  });

  const deptForm = document.getElementById('create-department-form');
  if (deptForm) {
    deptForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(deptForm);
      try {
        await api('/org/departments', { method: 'POST', body: { name: form.get('name') } });
        state.ok = 'Department created';
        await render();
      } catch (err) {
        state.error = err.message;
        await render();
      }
    });
  }

  const catForm = document.getElementById('create-category-form');
  if (catForm) {
    catForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(catForm);
      try {
        await api('/org/categories', { method: 'POST', body: { name: form.get('name') } });
        state.ok = 'Category created';
        await render();
      } catch (err) {
        state.error = err.message;
        await render();
      }
    });
  }

  const assetForm = document.getElementById('create-asset-form');
  if (assetForm) {
    assetForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(assetForm);
      try {
        await api('/assets', {
          method: 'POST',
          body: {
            name: form.get('name'),
            category: form.get('category'),
            serialNumber: form.get('serialNumber'),
            location: form.get('location'),
            condition: form.get('condition'),
            bookable: form.get('bookable') === 'on',
          },
        });
        state.ok = 'Asset registered';
        await render();
      } catch (err) {
        state.error = err.message;
        await render();
      }
    });
  }

  const allocForm = document.getElementById('allocate-form');
  if (allocForm) {
    allocForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(allocForm);
      const date = form.get('expectedReturnDate');
      try {
        await api('/allocations', {
          method: 'POST',
          body: {
            assetId: form.get('assetId'),
            employeeId: form.get('employeeId'),
            ...(date ? { expectedReturnDate: date } : {}),
          },
        });
        state.ok = 'Asset allocated';
        await render();
      } catch (err) {
        state.error = err.message;
        await render();
      }
    });
  }

  const transferForm = document.getElementById('transfer-form');
  if (transferForm) {
    transferForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(transferForm);
      try {
        await api('/transfers', {
          method: 'POST',
          body: {
            assetId: form.get('assetId'),
            toUserId: form.get('toUserId'),
            reason: form.get('reason'),
          },
        });
        state.ok = 'Transfer request submitted';
        await render();
      } catch (err) {
        state.error = err.message;
        await render();
      }
    });
  }
}

render();
