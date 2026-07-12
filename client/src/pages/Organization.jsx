import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { PageHead, Card, Loading, Notice, Empty, Pill, Modal, Field } from '../components/ui.jsx';
import { ASSIGNABLE_ROLES, ROLE_LABEL } from '../lib/constants.js';

const TABS = ['Employees', 'Departments', 'Categories'];

export default function Organization() {
  const [tab, setTab] = useState('Employees');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const notify = (m) => { setOk(m); setError(''); };
  const fail = (m) => { setError(m); setOk(''); };

  return (
    <>
      <PageHead title="Organization" subtitle="Manage employees, departments and asset categories." />
      <Notice error={error} ok={ok} />

      <div className="toolbar">
        {TABS.map((t) => (
          <button key={t} className={`btn ${tab === t ? '' : 'ghost'} sm`} onClick={() => { setTab(t); setError(''); setOk(''); }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Employees' && <Employees onOk={notify} onErr={fail} />}
      {tab === 'Departments' && <Departments onOk={notify} onErr={fail} />}
      {tab === 'Categories' && <Categories onOk={notify} onErr={fail} />}
    </>
  );
}

/* ------------------------------- Employees ------------------------------- */
function Employees({ onOk, onErr }) {
  const { user, refresh } = useAuth();
  const [rows, setRows] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    api('/org/employees', { params: { q } }).then((r) => setRows(r.employees)).catch((e) => onErr(e.message));
  }, [q, onErr]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api('/org/departments').then((r) => setDepartments(r.departments)).catch(() => {}); }, []);

  return (
    <>
      <div className="toolbar">
        <input placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!rows ? <Loading /> : rows.length === 0 ? <Card><Empty>No employees.</Empty></Card> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td className="muted">{u.email}</td>
                  <td><Pill color="blue">{ROLE_LABEL[u.role] || u.role}</Pill></td>
                  <td>{u.department?.name || '—'}</td>
                  <td><Pill>{u.status}</Pill></td>
                  <td><button className="btn ghost sm" onClick={() => setEditing(u)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditEmployee employee={editing} departments={departments}
          onClose={() => setEditing(null)}
          onDone={async () => {
            const changedSelf = String(editing._id) === String(user?._id);
            setEditing(null);
            onOk('Employee updated.');
            load();
            if (changedSelf) await refresh();
          }} />
      )}
    </>
  );
}

function EditEmployee({ employee, departments, onClose, onDone }) {
  const [form, setForm] = useState({
    name: employee.name,
    role: employee.role,
    department: employee.department?._id || '',
    status: employee.status || 'Active',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  // Admin role isn't self-assignable in the list, but keep an existing admin's option.
  const roleOptions = employee.role === 'admin' ? ['admin', ...ASSIGNABLE_ROLES] : ASSIGNABLE_ROLES;

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api(`/org/employees/${employee._id}`, {
        method: 'PATCH',
        body: { name: form.name, role: form.role, department: form.department || null, status: form.status },
      });
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <Modal title={`Edit ${employee.name}`} onClose={onClose}>
      <form onSubmit={submit}>
        <Notice error={error} />
        <Field label="Name"><input value={form.name} onChange={set('name')} required /></Field>
        <Field label="Role">
          <select value={form.role} onChange={set('role')}>
            {roleOptions.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </Field>
        <Field label="Department">
          <select value={form.department} onChange={set('department')}>
            <option value="">Unassigned</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={set('status')}>
            <option>Active</option><option>Inactive</option>
          </select>
        </Field>
        <button className="btn full" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </form>
    </Modal>
  );
}

/* ------------------------------ Departments ------------------------------ */
function Departments({ onOk, onErr }) {
  const [rows, setRows] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [editing, setEditing] = useState(null); // object or 'new'

  const load = useCallback(() => {
    api('/org/departments').then((r) => setRows(r.departments)).catch((e) => onErr(e.message));
  }, [onErr]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api('/org/employees').then((r) => setEmployees(r.employees)).catch(() => {}); }, []);

  return (
    <>
      <div className="toolbar"><button className="btn" onClick={() => setEditing('new')}>+ Department</button></div>
      {!rows ? <Loading /> : rows.length === 0 ? <Card><Empty>No departments.</Empty></Card> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Head</th><th>Parent</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d._id}>
                  <td>{d.name}</td>
                  <td>{d.head?.name || '—'}</td>
                  <td>{d.parent?.name || '—'}</td>
                  <td><Pill>{d.status}</Pill></td>
                  <td><button className="btn ghost sm" onClick={() => setEditing(d)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <DeptModal dept={editing === 'new' ? null : editing} employees={employees} departments={rows || []}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); onOk('Department saved.'); load(); }} />
      )}
    </>
  );
}

function DeptModal({ dept, employees, departments, onClose, onDone }) {
  const [form, setForm] = useState({
    name: dept?.name || '',
    head: dept?.head?._id || '',
    parent: dept?.parent?._id || '',
    status: dept?.status || 'Active',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const body = { name: form.name, head: form.head || null, parent: form.parent || null, status: form.status };
    try {
      if (dept) await api(`/org/departments/${dept._id}`, { method: 'PATCH', body });
      else await api('/org/departments', { method: 'POST', body });
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <Modal title={dept ? `Edit ${dept.name}` : 'New Department'} onClose={onClose}>
      <form onSubmit={submit}>
        <Notice error={error} />
        <Field label="Name"><input value={form.name} onChange={set('name')} required /></Field>
        <Field label="Head">
          <select value={form.head} onChange={set('head')}>
            <option value="">Unassigned</option>
            {employees.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </Field>
        <Field label="Parent department">
          <select value={form.parent} onChange={set('parent')}>
            <option value="">None</option>
            {departments.filter((d) => d._id !== dept?._id).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={set('status')}><option>Active</option><option>Inactive</option></select>
        </Field>
        <button className="btn full" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </form>
    </Modal>
  );
}

/* ------------------------------ Categories ------------------------------- */
function Categories({ onOk, onErr }) {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(() => {
    api('/org/categories').then((r) => setRows(r.categories)).catch((e) => onErr(e.message));
  }, [onErr]);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <div className="toolbar"><button className="btn" onClick={() => setEditing('new')}>+ Category</button></div>
      {!rows ? <Loading /> : rows.length === 0 ? <Card><Empty>No categories.</Empty></Card> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Description</th><th>Custom Fields</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c._id}>
                  <td>{c.name}</td>
                  <td className="muted" style={{ whiteSpace: 'normal', maxWidth: 260 }}>{c.description || '—'}</td>
                  <td>{c.customFields?.length ? c.customFields.map((f) => f.name || f).join(', ') : '—'}</td>
                  <td><Pill>{c.status}</Pill></td>
                  <td><button className="btn ghost sm" onClick={() => setEditing(c)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <CatModal cat={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); onOk('Category saved.'); load(); }} />
      )}
    </>
  );
}

function CatModal({ cat, onClose, onDone }) {
  const [form, setForm] = useState({
    name: cat?.name || '',
    description: cat?.description || '',
    status: cat?.status || 'Active',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      if (cat) await api(`/org/categories/${cat._id}`, { method: 'PATCH', body: form });
      else await api('/org/categories', { method: 'POST', body: form });
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <Modal title={cat ? `Edit ${cat.name}` : 'New Category'} onClose={onClose}>
      <form onSubmit={submit}>
        <Notice error={error} />
        <Field label="Name"><input value={form.name} onChange={set('name')} required /></Field>
        <Field label="Description"><textarea value={form.description} onChange={set('description')} /></Field>
        <Field label="Status">
          <select value={form.status} onChange={set('status')}><option>Active</option><option>Inactive</option></select>
        </Field>
        <button className="btn full" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
      </form>
    </Modal>
  );
}