import { useEffect, useState } from "react";
import { Plus, Pencil, Ban } from "lucide-react";
import api from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";
import { PageHeader, Modal, Spinner, EmptyState, Badge } from "../components/ui.jsx";
import { STATUS_STYLES } from "../lib/constants.js";

const empty = { name: "", headUserId: "", parentDepartmentId: "" };

export default function Departments() {
  const toast = useToast();
  const [departments, setDepartments] = useState(null);
  const [heads, setHeads] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [{ data }, emp] = await Promise.all([
        api.get("/departments"),
        api.get("/employees").catch(() => ({ data: { employees: [] } })),
      ]);
      setDepartments(data.departments);
      setHeads(emp.data.employees);
    } catch (err) {
      toast.error(err.message);
      setDepartments([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setModal(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({
      name: d.name,
      headUserId: d.headUserId || "",
      parentDepartmentId: d.parentDepartmentId || "",
    });
    setModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    const payload = {
      name: form.name,
      headUserId: form.headUserId || null,
      parentDepartmentId: form.parentDepartmentId || null,
    };
    try {
      if (editing) {
        await api.patch(`/departments/${editing.id}`, payload);
        toast.success("Department updated");
      } else {
        await api.post("/departments", payload);
        toast.success("Department created");
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (d) => {
    if (!confirm(`Deactivate department "${d.name}"?`)) return;
    try {
      await api.delete(`/departments/${d.id}`);
      toast.success("Department deactivated");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (!departments) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Organization structure and reporting lines"
        action={
          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Department
          </button>
        }
      />

      {departments.length === 0 ? (
        <EmptyState title="No departments yet" subtitle="Create your first department to get started." />
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Head</th>
                <th className="table-th">Parent</th>
                <th className="table-th">Members</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="table-td font-medium text-slate-800">{d.name}</td>
                  <td className="table-td">{d.head?.name || <span className="text-slate-400">—</span>}</td>
                  <td className="table-td">{d.parentDepartment?.name || <span className="text-slate-400">—</span>}</td>
                  <td className="table-td">{d._count?.members ?? 0}</td>
                  <td className="table-td">
                    <Badge className={STATUS_STYLES[d.status]}>{d.status}</Badge>
                  </td>
                  <td className="table-td">
                    <div className="flex justify-end gap-2">
                      <button className="btn-secondary" onClick={() => openEdit(d)}>
                        <Pencil size={14} />
                      </button>
                      {d.status === "Active" && (
                        <button className="btn-danger" onClick={() => deactivate(d)}>
                          <Ban size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? "Edit Department" : "New Department"}
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
            <label className="label">Name</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Engineering"
            />
          </div>
          <div>
            <label className="label">Department Head</label>
            <select
              className="input"
              value={form.headUserId}
              onChange={(e) => setForm({ ...form, headUserId: e.target.value })}
            >
              <option value="">— None —</option>
              {heads.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">Assigning a head promotes them to Department Head.</p>
          </div>
          <div>
            <label className="label">Parent Department</label>
            <select
              className="input"
              value={form.parentDepartmentId}
              onChange={(e) => setForm({ ...form, parentDepartmentId: e.target.value })}
            >
              <option value="">— None (top level) —</option>
              {departments
                .filter((d) => !editing || d.id !== editing.id)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
