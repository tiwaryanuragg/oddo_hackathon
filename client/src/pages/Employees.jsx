import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import api from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";
import { PageHeader, Spinner, EmptyState, Badge } from "../components/ui.jsx";
import { ROLE_LABELS, STATUS_STYLES } from "../lib/constants.js";

const ROLE_OPTIONS = ["Employee", "DepartmentHead", "AssetManager", "Admin"];

export default function Employees() {
  const toast = useToast();
  const [employees, setEmployees] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [q, setQ] = useState("");

  const load = async () => {
    try {
      const [emp, dep] = await Promise.all([
        api.get("/employees"),
        api.get("/departments").catch(() => ({ data: { departments: [] } })),
      ]);
      setEmployees(emp.data.employees);
      setDepartments(dep.data.departments);
    } catch (err) {
      toast.error(err.message);
      setEmployees([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeRole = async (id, role) => {
    try {
      await api.patch(`/employees/${id}/role`, { role });
      toast.success("Role updated");
      setEmployees((list) => list.map((u) => (u.id === id ? { ...u, role } : u)));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const changeDept = async (id, departmentId) => {
    try {
      const { data } = await api.patch(`/employees/${id}/department`, {
        departmentId: departmentId || null,
      });
      toast.success("Department updated");
      setEmployees((list) => list.map((u) => (u.id === id ? data.employee : u)));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleStatus = async (u) => {
    const status = u.status === "Active" ? "Inactive" : "Active";
    try {
      await api.patch(`/employees/${u.id}/status`, { status });
      toast.success(`Employee ${status.toLowerCase()}`);
      setEmployees((list) => list.map((x) => (x.id === u.id ? { ...x, status } : x)));
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (!employees) return <Spinner />;

  const filtered = employees.filter(
    (u) =>
      !q ||
      u.name.toLowerCase().includes(q.toLowerCase()) ||
      u.email.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Employee Directory" subtitle="Assign roles and departments" />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search by name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No employees found" />
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Email</th>
                <th className="table-th">Role</th>
                <th className="table-th">Department</th>
                <th className="table-th">Status</th>
                <th className="table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="table-td font-medium text-slate-800">{u.name}</td>
                  <td className="table-td text-slate-500">{u.email}</td>
                  <td className="table-td">
                    <select
                      className="input !py-1 !w-40"
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="table-td">
                    <select
                      className="input !py-1 !w-44"
                      value={u.departmentId || ""}
                      onChange={(e) => changeDept(u.id, e.target.value)}
                    >
                      <option value="">— None —</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="table-td">
                    <Badge className={STATUS_STYLES[u.status]}>{u.status}</Badge>
                  </td>
                  <td className="table-td text-right">
                    <button className="btn-secondary" onClick={() => toggleStatus(u)}>
                      {u.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
