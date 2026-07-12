import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth, hasRole } from '../lib/auth.jsx';
import { PageHead, Card, Loading, Notice, Empty, Pill, Modal, Field } from '../components/ui.jsx';
import { ASSET_STATUS, ASSET_CONDITION, MANAGER_ROLES } from '../lib/constants.js';
import { fmtMoney } from '../lib/format.js';

export default function Assets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = hasRole(user, MANAGER_ROLES);

  const [assets, setAssets] = useState(null);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ q: '', category: '', status: '', bookable: '' });
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    api('/assets', { params: filters })
      .then((res) => setAssets(res.assets))
      .catch((e) => setError(e.message));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api('/org/categories').then((res) => setCategories(res.categories)).catch(() => {});
  }, []);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <PageHead title="Assets" subtitle="Search, filter and register organization assets.">
        {canManage && <button className="btn" onClick={() => setShowCreate(true)}>+ Register Asset</button>}
      </PageHead>

      <Notice error={error} />

      <div className="toolbar">
        <input placeholder="Search tag, serial, name…" value={filters.q} onChange={set('q')} />
        <select value={filters.category} onChange={set('category')}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select value={filters.status} onChange={set('status')}>
          <option value="">All statuses</option>
          {ASSET_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.bookable} onChange={set('bookable')}>
          <option value="">Bookable: any</option>
          <option value="true">Bookable</option>
          <option value="false">Not bookable</option>
        </select>
      </div>

      {!assets ? (
        <Loading />
      ) : assets.length === 0 ? (
        <Card><Empty>No assets match your filters.</Empty></Card>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tag</th><th>Name</th><th>Category</th><th>Status</th>
                <th>Condition</th><th>Holder</th><th>Location</th><th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr key={a._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/assets/${a._id}`)}>
                  <td className="mono">{a.tag}</td>
                  <td>{a.name}{a.bookable && <span className="pill blue" style={{ marginLeft: 6 }}>bookable</span>}</td>
                  <td>{a.category?.name || '—'}</td>
                  <td><Pill>{a.status}</Pill></td>
                  <td>{a.condition || '—'}</td>
                  <td>{a.currentHolder?.name || a.currentDepartment?.name || '—'}</td>
                  <td>{a.location || '—'}</td>
                  <td className="mono">{fmtMoney(a.acquisitionCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateAsset
          categories={categories}
          onClose={() => setShowCreate(false)}
          onDone={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </>
  );
}

function CreateAsset({ categories, onClose, onDone }) {
  const [form, setForm] = useState({
    name: '', category: '', serialNumber: '', acquisitionDate: '',
    acquisitionCost: '', condition: 'Good', location: '', bookable: false,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/assets', {
        method: 'POST',
        body: {
          ...form,
          acquisitionCost: Number(form.acquisitionCost) || 0,
          acquisitionDate: form.acquisitionDate || null,
        },
      });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Register Asset" onClose={onClose}>
      <form onSubmit={submit}>
        <Notice error={error} />
        <Field label="Name"><input value={form.name} onChange={set('name')} required /></Field>
        <Field label="Category">
          <select value={form.category} onChange={set('category')} required>
            <option value="">Select category…</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </Field>
        <div className="form-row">
          <Field label="Serial number"><input value={form.serialNumber} onChange={set('serialNumber')} /></Field>
          <Field label="Condition">
            <select value={form.condition} onChange={set('condition')}>
              {ASSET_CONDITION.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="Acquisition date"><input type="date" value={form.acquisitionDate} onChange={set('acquisitionDate')} /></Field>
          <Field label="Acquisition cost"><input type="number" min="0" value={form.acquisitionCost} onChange={set('acquisitionCost')} /></Field>
        </div>
        <Field label="Location"><input value={form.location} onChange={set('location')} /></Field>
        <Field>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={form.bookable} onChange={(e) => setForm((f) => ({ ...f, bookable: e.target.checked }))} />
            <span>Bookable as a shared resource</span>
          </label>
        </Field>
        <button className="btn full" disabled={busy}>{busy ? 'Saving…' : 'Register Asset'}</button>
      </form>
    </Modal>
  );
}