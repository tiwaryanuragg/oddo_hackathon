import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { PageHead, Card, Loading, Notice, Empty, Pill } from '../components/ui.jsx';
import { fmtDate } from '../lib/format.js';

export default function Reports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/reports/summary').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <Notice error={error} />;
  if (!data) return <Loading />;

  const maxHeat = Math.max(1, ...data.bookingHeatmap.map((h) => h.bookings));

  return (
    <>
      <PageHead title="Reports" subtitle="Utilization, maintenance and lifecycle analytics." />

      <div className="grid cols-2" style={{ marginBottom: 18 }}>
        <Card title="Utilization by Department">
          <MiniTable
            rows={data.utilizationByDepartment}
            empty="No departments."
            render={(d) => [d.department, <span key="v" className="mono">{d.activeAllocations}</span>]}
            head={['Department', 'Active']}
          />
        </Card>

        <Card title="Most Used Assets">
          <MiniTable
            rows={data.mostUsedAssets}
            empty="No allocations yet."
            render={(a) => [<span key="t"><span className="mono">{a.tag}</span> — {a.name}</span>, <span key="v" className="mono">{a.allocations}</span>]}
            head={['Asset', 'Allocations']}
          />
        </Card>

        <Card title="Maintenance Frequency">
          <MiniTable
            rows={data.maintenanceFrequency}
            empty="No maintenance recorded."
            render={(a) => [<span key="t"><span className="mono">{a.tag}</span> — {a.name}</span>, <span key="v" className="mono">{a.requests}</span>]}
            head={['Asset', 'Requests']}
          />
        </Card>

        <Card title="Idle Assets">
          <MiniTable
            rows={data.idleAssets}
            empty="No idle assets."
            render={(a) => [<span key="t"><span className="mono">{a.tag}</span> — {a.name}</span>, <span key="v" className="mono">{a.idleDays}d</span>]}
            head={['Asset', 'Idle']}
          />
        </Card>
      </div>

      <div className="grid cols-2" style={{ marginBottom: 18 }}>
        <Card title="Near Retirement (4+ years)">
          <MiniTable
            rows={data.nearRetirement}
            empty="No aging assets."
            render={(a) => [<span key="t"><span className="mono">{a.tag}</span> — {a.name}</span>, <span key="v" className="mono">{a.yearsInService}y</span>]}
            head={['Asset', 'In service']}
          />
        </Card>

        <Card title="Booking Heatmap (by hour)">
          <div className="stack" style={{ gap: 4 }}>
            {data.bookingHeatmap.filter((h) => h.bookings > 0).length === 0 ? (
              <Empty>No bookings recorded.</Empty>
            ) : (
              data.bookingHeatmap.map((h) => (
                <div className="heat-row" key={h.hour}>
                  <span className="mono muted" style={{ width: 46 }}>{String(h.hour).padStart(2, '0')}:00</span>
                  <div className="heat-bar" style={{ width: `${(h.bookings / maxHeat) * 100}%`, opacity: h.bookings ? 1 : 0.15 }} />
                  <span className="mono muted">{h.bookings}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card title="Recent Audit Discrepancies">
        {data.recentAuditDiscrepancies?.length ? (
          <div className="stack">
            {data.recentAuditDiscrepancies.map((a) => (
              <div key={a.auditId}>
                <div className="row-between" style={{ marginBottom: 6 }}>
                  <strong>{a.title}</strong>
                  <span className="muted">{a.closedAt ? fmtDate(a.closedAt) : 'open'} · {a.discrepancyCount} issues</span>
                </div>
                {a.items?.length > 0 && (
                  <div className="btn-row">
                    {a.items.map((it) => (
                      <span key={it.assetId} className="pill grey">
                        {it.tag} <Pill>{it.status}</Pill>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <Empty>No audits closed yet.</Empty>
        )}
      </Card>
    </>
  );
}

function MiniTable({ rows, render, head, empty }) {
  if (!rows?.length) return <Empty>{empty}</Empty>;
  return (
    <table>
      <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => {
          const cells = render(r);
          return <tr key={i}>{cells.map((c, j) => <td key={j}>{c}</td>)}</tr>;
        })}
      </tbody>
    </table>
  );
}