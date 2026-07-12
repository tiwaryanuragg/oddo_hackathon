import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { PageHead, Card, Loading, Notice, Empty } from '../components/ui.jsx';
import { fmtDate, fmtDateTime } from '../lib/format.js';

const KPIS = [
  { key: 'available', label: 'Available' },
  { key: 'allocated', label: 'Allocated' },
  { key: 'maintenanceToday', label: 'Under Maintenance' },
  { key: 'activeBookings', label: 'Active Bookings' },
  { key: 'pendingTransfers', label: 'Pending Transfers' },
  { key: 'upcomingReturns', label: 'Upcoming Returns' },
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/dashboard').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <Notice error={error} />;
  if (!data) return <Loading />;

  const board = data.maintenanceBoard || {};

  return (
    <>
      <PageHead title="Dashboard" subtitle="Live snapshot of your asset operations." />

      <div className="grid kpi-grid" style={{ marginBottom: 18 }}>
        {KPIS.map((k) => (
          <div className="kpi" key={k.key}>
            <div className="label">{k.label}</div>
            <div className="value">{data.kpis?.[k.key] ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="grid cols-2" style={{ marginBottom: 18 }}>
        <Card title="Overdue Returns">
          {data.overdue?.length ? (
            <div className="stack">
              {data.overdue.map((o) => (
                <div className="list-item" key={o.id}>
                  <div>
                    <strong>{o.asset?.tag}</strong> — {o.asset?.name}
                    <div className="muted" style={{ fontSize: '0.8rem' }}>
                      {o.holder || 'Department'}
                    </div>
                  </div>
                  <span className="when" style={{ color: 'var(--danger)' }}>
                    due {fmtDate(o.expectedReturnDate)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty>No overdue returns. </Empty>
          )}
        </Card>

        <Card title="Upcoming Returns (7 days)">
          {data.upcoming?.length ? (
            <div className="stack">
              {data.upcoming.map((o) => (
                <div className="list-item" key={o.id}>
                  <div>
                    <strong>{o.asset?.tag}</strong> — {o.asset?.name}
                    <div className="muted" style={{ fontSize: '0.8rem' }}>{o.holder || 'Department'}</div>
                  </div>
                  <span className="when">{fmtDate(o.expectedReturnDate)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty>No returns coming up.</Empty>
          )}
        </Card>
      </div>

      <div className="grid cols-2">
        <Card title="Maintenance Board">
          <div className="grid kpi-grid">
            {[
              ['Pending', board.pending],
              ['Approved', board.approved],
              ['Tech Assigned', board.technicianAssigned],
              ['In Progress', board.inProgress],
              ['Resolved', board.resolved],
            ].map(([label, val]) => (
              <div key={label}>
                <div className="muted" style={{ fontSize: '0.78rem' }}>{label}</div>
                <div className="mono" style={{ fontSize: '1.5rem' }}>{val ?? 0}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14 }} className="muted">
            Open audit discrepancies: <strong style={{ color: 'var(--warn)' }}>{data.openAuditDiscrepancies ?? 0}</strong>
          </div>
        </Card>

        <Card title="Recent Activity" action={<Link className="btn ghost sm" to="/activity">All</Link>}>
          {data.recentActivity?.length ? (
            <div className="stack">
              {data.recentActivity.map((r) => (
                <div className="list-item" key={r.id}>
                  <div>
                    {r.message}
                    <div className="muted" style={{ fontSize: '0.78rem' }}>{r.actor}</div>
                  </div>
                  <span className="when">{fmtDateTime(r.at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty>No activity yet.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}