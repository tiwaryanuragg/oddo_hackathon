import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { PageHead, Card, Loading, Notice, Empty, Pill } from '../components/ui.jsx';
import { ROLE_LABEL } from '../lib/constants.js';
import { fmtDateTime } from '../lib/format.js';

export default function Activity() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/activity').then((r) => setRows(r.activity)).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <PageHead title="Activity Log" subtitle="Full audit trail of system actions." />
      <Notice error={error} />

      {!rows ? (
        <Loading />
      ) : rows.length === 0 ? (
        <Card><Empty>No activity recorded.</Empty></Card>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Message</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td className="muted">{fmtDateTime(r.createdAt)}</td>
                  <td>{r.actor?.name || 'System'}<div className="muted" style={{ fontSize: '0.75rem' }}>{ROLE_LABEL[r.actor?.role] || ''}</div></td>
                  <td><Pill color="grey">{r.action}</Pill></td>
                  <td style={{ whiteSpace: 'normal' }}>{r.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}