import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import api from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";
import { PageHeader, Modal, Spinner, EmptyState } from "../components/ui.jsx";

const FIELD_TYPES = ["text", "number", "date", "select", "boolean"];

export default function Categories() {
  const toast = useToast();
  const [categories, setCategories] = useState(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [fields, setFields] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get("/categories");
      setCategories(data.categories);
    } catch (err) {
      toast.error(err.message);
      setCategories([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setFields([]);
    setModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setName(c.name);
    setFields(Array.isArray(c.customFields) ? c.customFields : []);
    setModal(true);
  };

  const addField = () =>
    setFields((f) => [...f, { key: "", label: "", type: "text", required: false, options: [] }]);

  const updateField = (i, patch) =>
    setFields((f) => f.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const removeField = (i) => setFields((f) => f.filter((_, idx) => idx !== i));

  const save = async (e) => {
    e.preventDefault();
    // Derive key from label when omitted.
    const clean = fields
      .filter((f) => f.label.trim())
      .map((f) => ({
        ...f,
        key: (f.key || f.label).trim().toLowerCase().replace(/\s+/g, "_"),
        options:
          f.type === "select"
            ? (Array.isArray(f.options) ? f.options : String(f.options || "").split(",").map((s) => s.trim()).filter(Boolean))
            : [],
      }));
    setBusy(true);
    try {
      if (editing) {
        await api.patch(`/categories/${editing.id}`, { name, customFields: clean });
        toast.success("Category updated");
      } else {
        await api.post("/categories", { name, customFields: clean });
        toast.success("Category created");
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c) => {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    try {
      await api.delete(`/categories/${c.id}`);
      toast.success("Category deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (!categories) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Asset Categories"
        subtitle="Define categories and their custom fields"
        action={
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Category
          </button>
        }
      />

      {categories.length === 0 ? (
        <EmptyState title="No categories yet" subtitle="Create categories like Laptop, Monitor, Vehicle." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">{c.name}</h3>
                  <p className="text-xs text-slate-500">{c._count?.assets ?? 0} asset(s)</p>
                </div>
                <div className="flex gap-1">
                  <button className="btn-secondary !px-2 !py-1" onClick={() => openEdit(c)}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn-danger !px-2 !py-1" onClick={() => remove(c)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {Array.isArray(c.customFields) && c.customFields.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {c.customFields.map((f) => (
                    <span key={f.key} className="badge bg-slate-100 text-slate-600">
                      {f.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Edit Category" : "New Category"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={save} disabled={busy}>
              {editing ? "Save changes" : "Create"}
            </button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Category name</label>
            <input
              className="input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Laptop"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label mb-0">Custom fields</label>
              <button type="button" className="btn-secondary !px-2 !py-1 text-xs" onClick={addField}>
                <Plus size={14} /> Add field
              </button>
            </div>
            <div className="space-y-2">
              {fields.length === 0 && (
                <p className="text-xs text-slate-400">No custom fields. These capture category-specific attributes.</p>
              )}
              {fields.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2">
                  <input
                    className="input !py-1"
                    placeholder="Label"
                    value={f.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                  />
                  <select
                    className="input !py-1 !w-32"
                    value={f.type}
                    onChange={(e) => updateField(i, { type: e.target.value })}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={f.required}
                      onChange={(e) => updateField(i, { required: e.target.checked })}
                    />
                    req
                  </label>
                  <button type="button" onClick={() => removeField(i)} className="text-slate-400 hover:text-red-500">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
