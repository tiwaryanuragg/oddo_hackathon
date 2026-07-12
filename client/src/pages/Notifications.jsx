import { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../lib/api.js';
import { PageHead, Card, Loading, Notice, Empty, Pill } from '../components/ui.jsx';
import { fmtDateTime } from '../lib/format.js';

const CATEGORIES = ['All', 'Info', 'Approval', 'Alert'];

export default function Notifications() {
  const ctx = useOutletContext();
  const [items, setItems] = useState(null);
  const [category, setCategory] = useState('All');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api('/notifications', { params: { category } })
      .then((r) => setItems(r.notifications))
      .catch((e) => setError(e.message));
  }, [category]);

  useEffect(() => { load(); }, [load]);

  async function markRead(id) {
    try {
      await api(`/notifications/${id}/read`, { method: 'PATCH' });
      load();
      ctx?.refreshUnread?.();
    } catch (e) { setError(e.message); }
  }

  async function markAll() {
    try {
      await api('/notifications/read-all', { method: 'POST' });
      load();
      ctx?.refreshUnread?.();
    } catch (e) { setError(e.message); }
  }

  return (
    <>
      <PageHead title="Notifications" subtitle="Your alerts and approvals.">
        <button className="btn ghost" onClick={markAll}>Mark all read</button>
      </PageHead>

      <Notice error={error} />

      <div className="toolbar">
        {CATEGORIES.map((c) => (
          <button key={c} className={`btn ${category === c ? '' : 'ghost'} sm`} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      {!items ? (
        <Loading />
      ) : items.length === 0 ? (
        <Card><Empty>You’re all caught up.</Empty></Card>
      ) : (
        <Card>
          <div className="stack">
            {items.map((n) => (
              <div className="list-item" key={n._id} style={{ alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  {!n.read && <span className="unread-dot" />}
                  <div>
                    <div style={{ marginBottom: 4 }}>
                      <Pill color={n.category === 'Alert' ? 'red' : n.category === 'Approval' ? 'green' : 'blue'}>{n.type}</Pill>
                    </div>
                    {n.message}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="when">{fmtDateTime(n.createdAt)}</div>
                  {!n.read && <button className="btn ghost sm" style={{ marginTop: 6 }} onClick={() => markRead(n._id)}>Mark read</button>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}