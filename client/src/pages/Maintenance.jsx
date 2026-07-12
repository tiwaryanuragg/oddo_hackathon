import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useAuth, hasRole } from '../lib/auth.jsx';
import { PageHead, Card, Loading, Notice, Empty, Pill, Modal, Field } from '../components/ui.jsx';
import { MAINTENANCE_STATUS, APPROVER_ROLES } from '../lib/constants.js';
import { fmtDateTime } from '../lib/format.js';

export default function Maintenance() {
  const { user } = useAuth();
  const canApprove = hasRole(user, APPROVER_ROLES);
  const [requests, setRequests] = useState(null);
  const [assets, setAssets] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busyId, setBusyId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [assignFor, setAssignFor] = useState(null);

  const load = useCallback(() => {
    api('/maintenance', { params: { status: statusFilter } })
      .then((r) => setRequests(r.requests))
      .catch((e) => setError(e.message));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api('/assets').then((r) => setAssets(r.assets)).catch(() => {});
  }, []);

  async function act(id, fn, msg) {
    setBusyId(id); setError(''); setOk('');
    try { await fn(); setOk(msg); load(); }
    catch (e) { setError(e.message); }
    finally { setBusyId(''); }
  }

  const decide = (id, decision) =>
    act(id, () => api(`/maintenance/${id}/decision`, { method: 'PATCH', body: { decision } }),
      `Request ${decision}d.`);

  const setStatus = (id, status) =>
    act(id, () => api(`/maintenance/${id}/status`, { method: 'PATCH', body: { status } }),
      `Moved to ${status}.`);

  return (
    <>
      <PageHead title="Maintenance" subtitle="Track repair requests through the full workflow.">
        <button className="btn" onClick={() => setShowCreate(true)}>+ New Request</button>
      </PageHead>

      <Notice error={error} ok={ok} />

      <div className="toolbar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {MAINTENANCE_STATUS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {!requests ? (
        <Loading />
      ) : requests.length === 0 ? (
        <Card><Empty>No maintenance requests.</Empty></Card>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Asset</th><th>Issue</th><th>By</th><th>Technician</th><th>When</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id}>
                  <td className="mono">{r.asset?.tag}<div className="muted" style={{ fontSize: '0.78rem' }}>{r.asset?.name}</div></td>
                  <td style={{ whiteSpace: 'normal', maxWidth: 220 }}>{r.issue}</td>
                  <td>{r.requestedBy?.name || '—'}</td>
                  <td>{r.assignedTechnician || '—'}</td>
                  <td>{fmtDateTime(r.createdAt)}</td>
                  <td><Pill>{r.status}</Pill></td>
                  <td>
                    {canApprove ? (
                      <div className="btn-row">
                        {r.status === 'Pending' && (
                          <>
                            <button className="btn sm" disabled={busyId === r._id} onClick={() => decide(r._id, 'approve')}>Approve</button>
                            <button className="btn ghost sm" disabled={busyId === r._id} onClick={() => decide(r._id, 'reject')}>Reject</button>
                          </>
                        )}
                        {['Approved', 'Technician Assigned'].includes(r.status) && (
                          <button className="btn ghost sm" onClick={() => setAssignFor(r)}>
                            {r.assignedTechnician ? 'Reassign' : 'Assign Tech'}
                          </button>
                        )}
                        {r.status === 'Technician Assigned' && (
                          <button className="btn sm" disabled={busyId === r._id} onClick={() => setStatus(r._id, 'In Progress')}>Start</button>
                        )}
                        {r.status === 'In Progress' && (
                          <button className="btn sm" disabled={busyId === r._id} onClick={() => setStatus(r._id, 'Resolved')}>Resolve</button>
                        )}
                        {['Resolved', 'Rejected'].includes(r.status) && <span className="muted">Closed</span>}
                      </div>
                    ) : <span className="muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateRequest assets={assets}
          onClose={() => setShowCreate(false)}
          onDone={() => { setShowCreate(false); setOk('Request submitted.'); load(); }} />
      )}

      {assignFor && (
        <AssignTech request={assignFor}
          onClose={() => setAssignFor(null)}
          onDone={() => { setAssignFor(null); setOk('Technician assigned.'); load(); }} />
      )}
    </>
  );
}

function CreateRequest({ assets, onClose, onDone }) {
  const [form, setForm] = useState({ assetId: '', issue: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api('/maintenance', { method: 'POST', body: form });
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <Modal title="New Maintenance Request" onClose={onClose}>
      <form onSubmit={submit}>
        <Notice error={error} />
        <Field label="Asset">
          <select value={form.assetId} onChange={(e) => setForm((f) => ({ ...f, assetId: e.target.value }))} required>
            <option value="">Select asset…</option>
            {assets.map((a) => <option key={a._id} value={a._id}>{a.tag} — {a.name}</option>)}
          </select>
        </Field>
        <Field label="Issue"><textarea value={form.issue} onChange={(e) => setForm((f) => ({ ...f, issue: e.target.value }))} required /></Field>
        <button className="btn full" disabled={busy}>{busy ? 'Submitting…' : 'Submit'}</button>
      </form>
    </Modal>
  );
}

function AssignTech({ request, onClose, onDone }) {
  const [technician, setTechnician] = useState(request.assignedTechnician || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      await api(`/maintenance/${request._id}/assign`, { method: 'PATCH', body: { technician } });
      onDone();
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <Modal title={`Assign Technician — ${request.asset?.tag}`} onClose={onClose}>
      <form onSubmit={submit}>
        <Notice error={error} />
        <Field label="Technician name"><input value={technician} onChange={(e) => setTechnician(e.target.value)} required /></Field>
        <button className="btn full" disabled={busy}>{busy ? 'Saving…' : 'Assign'}</button>
      </form>
    </Modal>
  );
}