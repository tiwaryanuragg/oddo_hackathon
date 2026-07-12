import { useEffect, useState } from "react";
import { Building2, Tags, Users, Boxes } from "lucide-react";
import api from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { PageHeader, Spinner } from "../components/ui.jsx";
import { ROLE_LABELS } from "../lib/constants.js";

function StatCard({ icon: Icon, label, value, tint }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tint}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-sm text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, role } = useAuth();
  const [stats, setStats] = useState(null);
  const isAdmin = role === "Admin";

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([api.get("/departments"), api.get("/categories"), api.get("/employees")])
      .then(([d, c, e]) => {
        setStats({
          departments: d.data.departments.length,
          categories: c.data.categories.length,
          employees: e.data.employees.length,
        });
      })
      .catch(() => setStats({ departments: 0, categories: 0, employees: 0 }));
  }, [isAdmin]);

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name?.split(" ")[0] || "there"}`}
        subtitle={`You are signed in as ${ROLE_LABELS[role] || role}.`}
      />

      {isAdmin ? (
        stats ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Building2} label="Departments" value={stats.departments} tint="bg-brand-100 text-brand-700" />
            <StatCard icon={Tags} label="Categories" value={stats.categories} tint="bg-amber-100 text-amber-700" />
            <StatCard icon={Users} label="Employees" value={stats.employees} tint="bg-green-100 text-green-700" />
            <StatCard icon={Boxes} label="Assets" value="—" tint="bg-slate-100 text-slate-600" />
          </div>
        ) : (
          <Spinner />
        )
      ) : (
        <div className="card p-6 text-sm text-slate-600">
          Your workspace is ready. Use the navigation to browse assets and resources available to you.
        </div>
      )}
    </div>
  );
}
