import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, hasRole } from '../lib/auth.jsx';
import { PageHead, Card, Loading, Notice, Empty, Pill, Modal, Field } from '../components/ui.jsx';
import { ASSET_CONDITION, APPROVER_ROLES } from '../lib/constants.js';
import { fmtDate, fmtMoney } from '../lib/format.js';

export default function AssetDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canApprove = hasRole(user, APPROVER_ROLES);

  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [modal, setModal] = useState(null); // 'allocate' | 'return' | 'transfer' | 'maintenance'

  const load = useCallback(() => {
    api(`/assets/${id}`).then(setData).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api('/org/employees').then((r) => setEmployees(r.employees)).catch(() => {});
    api('/org/departments').then((r) => setDepartments(r.departments)).catch(() => {});
  }, []);

  if (error) return <Notice error={error} />;
  if (!data) return <Loading />;

  const { asset, allocationHistory } = data;
  const isAllocated = asset.status === 'Allocated';

  const done = (msg) => {
    setModal(null);
    setOk(msg);
    load();
  };

  return (
    <>
      <PageHead title={`${asset.tag} — ${asset.name}`} subtitle={asset.category?.name}>
        <Link className="btn ghost" to="/assets">← Back</Link>
      </PageHead>

      <Notice error={error} ok={ok} />

      <div className="grid cols-2" style={{ marginBottom: 18 }}>
        <Card title="Details">
          <div className="stack">
            <Row label="Status"><Pill>{asset.status}</Pill></Row>
            <Row label="Condition">{asset.condition || '—'}</Row>
            <Row label="Serial">{asset.serialNumber || '—'}</Row>
            <Row label="Location">{asset.location || '—'}</Row>
            <Row label="Holder">{asset.currentHolder?.name || asset.currentDepartment?.name || '—'}</Row>
            <Row label="Acquired">{fmtDate(asset.acquisitionDate)}</Row>
            <Row label="Cost">{fmtMoney(asset.acquisitionCost)}</Row>
            <Row label="Bookable">{asset.bookable ? 'Yes' : 'No'}</Row>
          </div>
        </Card>

        <Card title="Actions">
          <div className="btn-row">
            {canApprove && !isAllocated && asset.status === 'Available' && (
              <button className="btn" onClick={() => setModal('allocate')}>Allocate</button>
            )}
            {canApprove && isAllocated && (
              <button className="btn ghost" onClick={() => setModal('return')}>Return</button>
            )}
            <button className="btn ghost" onClick={() => setModal('transfer')}>Request Transfer</button>
            <button className="btn ghost" onClick={() => setModal('maintenance')}>Report Issue</button>
          </div>
          <p className="muted" style={{ marginTop: 12, fontSize: '0.82rem' }}>
            Allocation and returns require an approver role. Anyone can request a transfer or report a maintenance issue.
          </p>
        </Card>
      </div>

      <Card title="Allocation History">
        {allocationHistory?.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Holder</th><th>Allocated</th><th>By</th><th>Returned</th><th>Check-in</th><th>Status</th></tr>
              </thead>
              <tbody>
                {allocationHistory.map((h) => (
                  <tr key={h._id}>
                    <td>{h.employee?.name || h.department?.name || '—'}</td>
                    <td>{fmtDate(h.createdAt)}</td>
                    <td>{h.allocatedBy?.name || '—'}</td>
                    <td>{h.returnedAt ? fmtDate(h.returnedAt) : '—'}</td>
                    <td>{h.checkInCondition || '—'}</td>
                    <td><Pill>{h.status}</Pill></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No allocation history.</Empty>
        )}
      </Card>

      {modal === 'allocate' && (
        <AllocateModal asset={asset} employees={employees} departments={departments}
          onClose={() => setModal(null)} onDone={() => done('Asset allocated.')} />
      )}
      {modal === 'return' && (
        <ReturnModal asset={asset} onClose={() => setModal(null)} onDone={() => done('Asset returned.')} />
      )}
      {modal === 'transfer' && (
        <TransferModal asset={asset} employees={employees} departments={departments}
          onClose={() => setModal(null)} onDone={() => done('Transfer request submitted.')} />
      )}
      {modal === 'maintenance' && (
        <MaintenanceModal asset={asset} onClose={() => setModal(null)} onDone={() => done('Maintenance request submitted.')} />
      )}
    </>
  );
}

function Row({ label, children }) {
  return (
    <div className="row-between">
      <span className="muted">{label}</span>
      <span>{children}</span>
    </div>
  );
}

function AllocateModal({ asset, employees, departments, onClose, onDone }) {
  const [form, setForm] = useState({ target: 'employee', employeeId: '', departmentId: '', expectedReturnDate: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/allocations', {
        method: 'POST',
        body: {
          assetId: asset._id,
          employeeId: form.target === 'employee' ? form.employeeId : undefined,
          departmentId: form.target === 'department' ? form.departmentId : undefined,
          expectedReturnDate: form.expectedReturnDate || undefined,
        },
      });
      onDone();
    } catch (err) {
      setError(err.body?.hint ? `${err.message} — ${err.body.hint}` : err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title={`Allocate ${asset.tag}`} onClose={onClose}>
      <form onSubmit={submit}>
        <Notice error={error} />
        <Field label="Allocate to">
          <select value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}>
            <option value="employee">Employee</option>
            <option value="department">Department</option>
          </select>
        </Field>
        {form.target === 'employee' ? (
          <Field label="Employee">
            <select value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} required>
              <option value="">Select…</option>
              {employees.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </Field>
        ) : (
          <Field label="Department">
            <select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))} required>
              <option value="">Select…</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Expected return date">
          <input type="date" value={form.expectedReturnDate} onChange={(e) => setForm((f) => ({ ...f, expectedReturnDate: e.target.value }))} />
        </Field>
        <button className="btn full" disabled={busy}>{busy ? 'Allocating…' : 'Allocate'}</button>
      </form>
    </Modal>
  );
}

function ReturnModal({ asset, onClose, onDone }) {
  const [form, setForm] = useState({ condition: asset.condition || 'Good', notes: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api(`/allocations/${asset._id}/return`, { method: 'POST', body: form });
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <Modal title={`Return ${asset.tag}`} onClose={onClose}>
      <form onSubmit={submit}>
        <Notice error={error} />
        <Field label="Check-in condition">
          <select value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}>
            {ASSET_CONDITION.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Notes"><textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></Field>
        <button className="btn full" disabled={busy}>{busy ? 'Returning…' : 'Confirm Return'}</button>
      </form>
    </Modal>
  );
}

function TransferModal({ asset, employees, departments, onClose, onDone }) {
  const [form, setForm] = useState({ target: 'employee', toUserId: '', toDepartmentId: '', reason: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/transfers', {
        method: 'POST',
        body: {
          assetId: asset._id,
          toUserId: form.target === 'employee' ? form.toUserId : undefined,
          toDepartmentId: form.target === 'department' ? form.toDepartmentId : undefined,
          reason: form.reason,
        },
      });
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <Modal title={`Request Transfer — ${asset.tag}`} onClose={onClose}>
      <form onSubmit={submit}>
        <Notice error={error} />
        <Field label="Transfer to">
          <select value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}>
            <option value="employee">Employee</option>
            <option value="department">Department</option>
          </select>
        </Field>
        {form.target === 'employee' ? (
          <Field label="Employee">
            <select value={form.toUserId} onChange={(e) => setForm((f) => ({ ...f, toUserId: e.target.value }))} required>
              <option value="">Select…</option>
              {employees.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </Field>
        ) : (
          <Field label="Department">
            <select value={form.toDepartmentId} onChange={(e) => setForm((f) => ({ ...f, toDepartmentId: e.target.value }))} required>
              <option value="">Select…</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Reason"><textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} /></Field>
        <button className="btn full" disabled={busy}>{busy ? 'Submitting…' : 'Submit Request'}</button>
      </form>
    </Modal>
  );
}

function MaintenanceModal({ asset, onClose, onDone }) {
  const [issue, setIssue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/maintenance', { method: 'POST', body: { assetId: asset._id, issue } });
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <Modal title={`Report Issue — ${asset.tag}`} onClose={onClose}>
      <form onSubmit={submit}>
        <Notice error={error} />
        <Field label="Describe the issue"><textarea value={issue} onChange={(e) => setIssue(e.target.value)} required /></Field>
        <button className="btn full" disabled={busy}>{busy ? 'Submitting…' : 'Submit'}</button>
      </form>
    </Modal>
  );
}