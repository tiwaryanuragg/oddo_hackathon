import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { PageHead, Card, Loading, Notice, Empty, Pill, Modal, Field } from '../components/ui.jsx';
import { fmtDateTime } from '../lib/format.js';

export default function Audits() {
  const navigate = useNavigate();
  const [audits, setAudits] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [showStart, setShowStart] = useState(false);

  const load = useCallback(() => {
    api('/audits').then((r) => setAudits(r.audits)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api('/org/departments').then((r) => setDepartments(r.departments)).catch(() => {});
  }, []);

  return (
    <>
      <PageHead title="Audits" subtitle="Run physical verification cycles and track discrepancies.">
        <button className="btn" onClick={() => setShowStart(true)}>+ Start Audit</button>
      </PageHead>

      <Notice error={error} />

      {!audits ? (
        <Loading />
      ) : audits.length === 0 ? (
        <Card><Empty>No audit cycles yet.</Empty></Card>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Title</th><th>Department</th><th>Assets</th><th>Started By</th><th>Started</th><th>Discrepancies</th><th>Status</th></tr>
            </thead>
            <tbody>
              {audits.map((a) => (
                <tr key={a._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/audits/${a._id}`)}>
                  <td>{a.title}</td>
                  <td>{a.department?.name || 'All'}</td>
                  <td className="mono">{a.entries?.length ?? 0}</td>
                  <td>{a.startedBy?.name || '—'}</td>
                  <td>{fmtDateTime(a.createdAt)}</td>
                  <td className="mono">{a.discrepancyCount ?? 0}</td>
                  <td><Pill>{a.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showStart && (
        <StartAudit departments={departments}
          onClose={() => setShowStart(false)}
          onDone={(id) => { setShowStart(false); navigate(`/audits/${id}`); }} />
      )}
    </>
  );
}

function StartAudit({ departments, onClose, onDone }) {
  const [form, setForm] = useState({ title: '', departmentId: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await api('/audits/start', {
        method: 'POST',
        body: { title: form.title, departmentId: form.departmentId || undefined },
      });
      onDone(res.audit._id);
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <Modal title="Start Audit Cycle" onClose={onClose}>
      <form onSubmit={submit}>
        <Notice error={error} />
        <Field label="Title"><input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="Q3 Engineering Audit" /></Field>
        <Field label="Scope">
          <select value={form.departmentId} onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}>
            <option value="">All assets</option>
            {departments.map((d) => <option key={d._id} value={d._id}>{d.name} department</option>)}
          </select>
        </Field>
        <button className="btn full" disabled={busy}>{busy ? 'Starting…' : 'Start Audit'}</button>
      </form>
    </Modal>
  );
}