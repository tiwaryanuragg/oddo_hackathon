import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { PageHead, Card, Loading, Notice, Empty, Pill, Modal, Field } from '../components/ui.jsx';
import { fmtDateTime, todayISO, toLocalInput } from '../lib/format.js';

export default function Bookings() {
  const { user } = useAuth();
  const [assets, setAssets] = useState([]);
  const [date, setDate] = useState(todayISO());
  const [assetId, setAssetId] = useState('');
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Only bookable assets participate in the resource calendar.
  useEffect(() => {
    api('/assets', { params: { bookable: 'true' } })
      .then((r) => setAssets(r.assets))
      .catch((e) => setError(e.message));
  }, []);

  const load = useCallback(() => {
    api('/bookings', { params: { date, assetId } })
      .then((r) => setBookings(r.bookings))
      .catch((e) => setError(e.message));
  }, [date, assetId]);

  useEffect(() => { load(); }, [load]);

  async function cancel(id) {
    setError(''); setOk('');
    try {
      await api(`/bookings/${id}/cancel`, { method: 'PATCH' });
      setOk('Booking cancelled.');
      load();
    } catch (e) { setError(e.message); }
  }

  return (
    <>
      <PageHead title="Resource Booking" subtitle="Reserve shared, bookable assets by time slot.">
        <button className="btn" disabled={!assets.length} onClick={() => setShowCreate(true)}>+ New Booking</button>
      </PageHead>

      <Notice error={error} ok={ok} />

      {!assets.length && <Card><Empty>No bookable assets yet. Mark an asset as bookable to reserve it.</Empty></Card>}

      <div className="toolbar">
        <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Asset">
          <select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
            <option value="">All bookable assets</option>
            {assets.map((a) => <option key={a._id} value={a._id}>{a.tag} — {a.name}</option>)}
          </select>
        </Field>
      </div>

      {!bookings ? (
        <Loading />
      ) : bookings.length === 0 ? (
        <Card><Empty>No bookings for this day.</Empty></Card>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Asset</th><th>Start</th><th>End</th><th>Purpose</th><th>By</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const mine = String(b.requestedBy?._id) === String(user?._id);
                return (
                  <tr key={b._id}>
                    <td className="mono">{b.asset?.tag}<div className="muted" style={{ fontSize: '0.78rem' }}>{b.asset?.name}</div></td>
                    <td>{fmtDateTime(b.startAt)}</td>
                    <td>{fmtDateTime(b.endAt)}</td>
                    <td style={{ whiteSpace: 'normal', maxWidth: 220 }}>{b.purpose || '—'}</td>
                    <td>{b.requestedBy?.name || '—'}{mine && <span className="muted"> (you)</span>}</td>
                    <td><Pill>{b.status}</Pill></td>
                    <td>
                      {b.status === 'Confirmed' && (
                        <button className="btn ghost sm" onClick={() => cancel(b._id)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateBooking assets={assets} defaultDate={date}
          onClose={() => setShowCreate(false)}
          onDone={() => { setShowCreate(false); setOk('Booking confirmed.'); load(); }} />
      )}
    </>
  );
}

function CreateBooking({ assets, defaultDate, onClose, onDone }) {
  const base = `${defaultDate}T09:00`;
  const [form, setForm] = useState({
    assetId: assets[0]?._id || '',
    startAt: base,
    endAt: `${defaultDate}T10:00`,
    purpose: '',
  });
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(''); setConflicts([]);
    try {
      await api('/bookings', {
        method: 'POST',
        body: {
          assetId: form.assetId,
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          purpose: form.purpose,
        },
      });
      onDone();
    } catch (err) {
      setError(err.message);
      if (err.body?.conflicts) setConflicts(err.body.conflicts);
      setBusy(false);
    }
  }

  return (
    <Modal title="New Booking" onClose={onClose}>
      <form onSubmit={submit}>
        <Notice error={error} />
        {conflicts.length > 0 && (
          <div className="notice error">
            Conflicts with:
            <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
              {conflicts.map((c) => (
                <li key={c._id}>{fmtDateTime(c.startAt)} → {fmtDateTime(c.endAt)}</li>
              ))}
            </ul>
          </div>
        )}
        <Field label="Asset">
          <select value={form.assetId} onChange={set('assetId')} required>
            {assets.map((a) => <option key={a._id} value={a._id}>{a.tag} — {a.name}</option>)}
          </select>
        </Field>
        <div className="form-row">
          <Field label="Start"><input type="datetime-local" value={form.startAt} onChange={set('startAt')} required /></Field>
          <Field label="End"><input type="datetime-local" value={form.endAt} onChange={set('endAt')} required /></Field>
        </div>
        <Field label="Purpose"><textarea value={form.purpose} onChange={set('purpose')} /></Field>
        <button className="btn full" disabled={busy}>{busy ? 'Booking…' : 'Confirm Booking'}</button>
      </form>
    </Modal>
  );
}