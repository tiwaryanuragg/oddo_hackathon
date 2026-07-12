import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { PageHead, Card, Loading, Notice, Pill } from '../components/ui.jsx';
import { AUDIT_ENTRY_STATUS } from '../lib/constants.js';
import { fmtDateTime } from '../lib/format.js';

export default function AuditDetail() {
  const { id } = useParams();
  const [audit, setAudit] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    api(`/audits/${id}`).then((r) => setAudit(r.audit)).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (error) return <Notice error={error} />;
  if (!audit) return <Loading />;

  const closed = audit.status === 'Closed';
  const counts = audit.entries.reduce((acc, e) => {
    acc[e.verificationStatus] = (acc[e.verificationStatus] || 0) + 1;
    return acc;
  }, {});
  const verifiedCount = audit.entries.length - (counts.Pending || 0);

  async function verify(assetId, status) {
    setBusy(assetId); setError(''); setOk('');
    try {
      const res = await api(`/audits/${id}/assets/${assetId}`, { method: 'PATCH', body: { status } });
      setAudit(res.audit);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  async function close() {
    setBusy('close'); setError(''); setOk('');
    try {
      const res = await api(`/audits/${id}/close`, { method: 'POST' });
      setAudit(res.audit);
      setOk(`Audit closed with ${res.audit.discrepancyCount} discrepancies.`);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }

  return (
    <>
      <PageHead title={audit.title} subtitle={`${audit.department?.name || 'All'} · ${audit.entries.length} assets`}>
        <Link className="btn ghost" to="/audits">← Back</Link>
        {!closed && (
          <button className="btn" disabled={busy === 'close'} onClick={close}>
            {busy === 'close' ? 'Closing…' : 'Close Audit'}
          </button>
        )}
      </PageHead>

      <Notice error={error} ok={ok} />

      <div className="grid kpi-grid" style={{ marginBottom: 18 }}>
        <div className="kpi"><div className="label">Status</div><div style={{ marginTop: 8 }}><Pill>{audit.status}</Pill></div></div>
        <div className="kpi"><div className="label">Verified</div><div className="value">{verifiedCount}/{audit.entries.length}</div></div>
        <div className="kpi"><div className="label">Missing</div><div className="value" style={{ color: 'var(--danger)' }}>{counts.Missing || 0}</div></div>
        <div className="kpi"><div className="label">Damaged</div><div className="value" style={{ color: 'var(--warn)' }}>{counts.Damaged || 0}</div></div>
      </div>

      <Card title="Asset Verification">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Tag</th><th>Name</th><th>Expected Location</th><th>Verification</th><th>By</th>{!closed && <th>Set</th>}</tr>
            </thead>
            <tbody>
              {audit.entries.map((e) => (
                <tr key={e.asset?._id || e._id}>
                  <td className="mono">{e.asset?.tag}</td>
                  <td>{e.asset?.name}</td>
                  <td>{e.expectedLocation || '—'}</td>
                  <td><Pill>{e.verificationStatus}</Pill></td>
                  <td>{e.verifiedBy?.name || '—'}<div className="muted" style={{ fontSize: '0.75rem' }}>{e.verifiedAt ? fmtDateTime(e.verifiedAt) : ''}</div></td>
                  {!closed && (
                    <td>
                      <select
                        value={e.verificationStatus}
                        disabled={busy === e.asset?._id}
                        onChange={(ev) => verify(e.asset._id, ev.target.value)}
                      >
                        {AUDIT_ENTRY_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}