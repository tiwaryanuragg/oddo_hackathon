import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, hasRole } from '../lib/auth.jsx';
import { PageHead, Card, Loading, Notice, Empty, Pill } from '../components/ui.jsx';
import { APPROVER_ROLES } from '../lib/constants.js';
import { fmtDateTime } from '../lib/format.js';

export default function Allocations() {
  const { user } = useAuth();
  const canDecide = hasRole(user, APPROVER_ROLES);
  const [transfers, setTransfers] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(() => {
    api('/transfers', { params: { status: statusFilter } })
      .then((r) => setTransfers(r.transfers))
      .catch((e) => setError(e.message));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function decide(id, decision) {
    setBusyId(id); setError(''); setOk('');
    try {
      await api(`/transfers/${id}`, { method: 'PATCH', body: { decision } });
      setOk(`Transfer ${decision === 'approve' ? 'approved' : 'rejected'}.`);
      load();
    } catch (e) { setError(e.message); }
    finally { setBusyId(''); }
  }

  return (
    <>
      <PageHead title="Allocation & Transfer" subtitle="Transfer request queue and approvals.">
        <Link className="btn ghost" to="/assets">Allocate from Assets →</Link>
      </PageHead>

      <Notice error={error} ok={ok} />

      <div className="toolbar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['Requested', 'Approved', 'Completed', 'Rejected'].map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {!transfers ? (
        <Loading />
      ) : transfers.length === 0 ? (
        <Card><Empty>No transfer requests.</Empty></Card>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Asset</th><th>From</th><th>To</th><th>Requested By</th><th>Reason</th><th>When</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t._id}>
                  <td className="mono">{t.asset?.tag}<div className="muted" style={{ fontSize: '0.78rem' }}>{t.asset?.name}</div></td>
                  <td>{t.fromUser?.name || '—'}</td>
                  <td>{t.toUser?.name || t.toDepartment?.name || '—'}</td>
                  <td>{t.requestedBy?.name || '—'}</td>
                  <td style={{ whiteSpace: 'normal', maxWidth: 220 }}>{t.reason || '—'}</td>
                  <td>{fmtDateTime(t.createdAt)}</td>
                  <td><Pill>{t.status}</Pill></td>
                  <td>
                    {canDecide && t.status === 'Requested' ? (
                      <div className="btn-row">
                        <button className="btn sm" disabled={busyId === t._id} onClick={() => decide(t._id, 'approve')}>Approve</button>
                        <button className="btn ghost sm" disabled={busyId === t._id} onClick={() => decide(t._id, 'reject')}>Reject</button>
                      </div>
                    ) : <span className="muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}