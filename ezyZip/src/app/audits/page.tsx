"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import DataTable from "@/components/DataTable";
import Modal from "@/components/Modal";
import Badge from "@/components/Badge";
import { Plus, CheckCircle, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export default function AuditsPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const canManageAudits = role === "Admin";
  const [cycles, setCycles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [auditItems, setAuditItems] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCycles = async () => {
    try {
      const [cycRes, deptRes] = await Promise.all([
        fetch("/api/audits/cycles"),
        fetch("/api/departments")
      ]);
      setCycles(await cycRes.json());
      setDepartments(await deptRes.json());
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAuditItems = async (cycleId: string) => {
    try {
      const res = await fetch(`/api/audits/items?cycleId=${cycleId}`);
      setAuditItems(await res.json());
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  const handleCycleSelect = (cycle: any) => {
    setSelectedCycle(cycle);
    fetchAuditItems(cycle._id);
  };

  const handleCloseCycle = async (id: string) => {
    await fetch("/api/audits/cycles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: id, status: "Closed" })
    });
    fetchCycles();
    if (selectedCycle?._id === id) {
      setSelectedCycle({ ...selectedCycle, status: "Closed" });
    }
  };

  const handleVerify = async (itemId: string, verification: string) => {
    await fetch("/api/audits/items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: itemId, verification })
    });
    fetchAuditItems(selectedCycle._id);
  };

  if (selectedCycle) {
    const stats = {
      total: auditItems.length,
      verified: auditItems.filter((i: any) => i.verification === "Verified").length,
      missing: auditItems.filter((i: any) => i.verification === "Missing").length,
      damaged: auditItems.filter((i: any) => i.verification === "Damaged").length,
      pending: auditItems.filter((i: any) => i.verification === "Pending").length,
    };
    const progress = stats.total === 0 ? 0 : Math.round(((stats.total - stats.pending) / stats.total) * 100);

    return (
      <DashboardLayout>
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setSelectedCycle(null)} className="p-2 rounded-lg hover:bg-[var(--card)] text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{selectedCycle.name}</h1>
            <p className="text-[var(--text-secondary)] flex gap-2 items-center">
              Scope: {selectedCycle.scope === "Department" ? selectedCycle.scopeDepartment?.name : selectedCycle.scopeLocation}
              <Badge variant={selectedCycle.status === "Open" ? "success" : "neutral"}>{selectedCycle.status}</Badge>
            </p>
          </div>
          {canManageAudits && selectedCycle.status === "Open" && (
            <button onClick={() => handleCloseCycle(selectedCycle._id)} className="ml-auto btn bg-[var(--card)] border border-[var(--border)]">
              Mark Cycle Complete
            </button>
          )}
        </div>

        {/* Progress Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="glass-elevated p-4 rounded-xl flex flex-col justify-center items-center">
            <span className="text-3xl font-bold text-indigo-400 mb-1">{progress}%</span>
            <span className="text-xs text-[var(--text-secondary)]">Completion</span>
          </div>
          <div className="glass-elevated p-4 rounded-xl flex flex-col justify-center items-center">
            <span className="text-2xl font-bold text-white mb-1">{stats.total}</span>
            <span className="text-xs text-[var(--text-secondary)]">Total Items</span>
          </div>
          <div className="glass-elevated p-4 rounded-xl flex flex-col justify-center items-center">
            <span className="text-2xl font-bold text-emerald-400 mb-1">{stats.verified}</span>
            <span className="text-xs text-[var(--text-secondary)]">Verified</span>
          </div>
          <div className="glass-elevated p-4 rounded-xl flex flex-col justify-center items-center">
            <span className="text-2xl font-bold text-red-400 mb-1">{stats.missing}</span>
            <span className="text-xs text-[var(--text-secondary)]">Missing</span>
          </div>
          <div className="glass-elevated p-4 rounded-xl flex flex-col justify-center items-center">
            <span className="text-2xl font-bold text-amber-400 mb-1">{stats.damaged}</span>
            <span className="text-xs text-[var(--text-secondary)]">Damaged</span>
          </div>
        </div>

        <DataTable
          data={auditItems}
          keyExtractor={(item) => item._id}
          columns={[
            { header: "Asset", accessor: "asset", render: (item) => (
              <div>
                <div className="font-medium text-white">{item.asset?.name}</div>
                <div className="text-xs text-indigo-400 font-mono">{item.asset?.assetTag}</div>
              </div>
            )},
            { header: "Expected Location", accessor: "expectedLocation", render: (item) => item.expectedLocation || "-" },
            { header: "Status", accessor: "verification", render: (item) => {
              let variant: any = "neutral";
              if (item.verification === "Verified") variant = "success";
              if (item.verification === "Missing") variant = "danger";
              if (item.verification === "Damaged") variant = "warning";
              return <Badge variant={variant}>{item.verification}</Badge>;
            }},
            { header: "Verified By", accessor: "verifiedBy", render: (item) => item.verifiedBy?.name ? (
              <span className="text-xs text-[var(--text-secondary)]">
                {item.verifiedBy.name}<br/>{format(new Date(item.verifiedAt), 'MMM d, h:mm a')}
              </span>
            ) : "-" },
            { header: "Actions", accessor: "_id", render: (item) => (
              selectedCycle.status === "Open" ? (
                <div className="flex gap-2">
                  <button onClick={() => handleVerify(item._id, "Verified")} className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors" title="Verified"><CheckCircle size={16} /></button>
                  <button onClick={() => handleVerify(item._id, "Damaged")} className="p-1.5 rounded bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors" title="Damaged"><AlertTriangle size={16} /></button>
                  <button onClick={() => handleVerify(item._id, "Missing")} className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors" title="Missing"><XCircle size={16} /></button>
                </div>
              ) : "-"
            )}
          ]}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Physical Audits</h1>
          <p className="text-[var(--text-secondary)]">Run scheduled verification cycles and track discrepancies.</p>
        </div>
        {canManageAudits && (
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary whitespace-nowrap">
            <Plus size={16} className="mr-2" /> Start Audit Cycle
          </button>
        )}
      </div>

      <DataTable
        data={cycles}
        keyExtractor={(item) => item._id}
        onRowClick={handleCycleSelect}
        columns={[
          { header: "Audit Name", accessor: "name", render: (item) => <span className="font-medium text-white">{item.name}</span> },
          { header: "Scope", accessor: "scope", render: (item) => (
            item.scope === "Department" ? `Dept: ${item.scopeDepartment?.name || "?"}` : `Loc: ${item.scopeLocation}`
          )},
          { header: "Timeline", accessor: "startDate", render: (item) => (
            <span className="text-sm">
              {format(new Date(item.startDate), 'MMM d, yyyy')} - {format(new Date(item.endDate), 'MMM d, yyyy')}
            </span>
          )},
          { header: "Status", accessor: "status", render: (item) => (
            <Badge variant={item.status === "Open" ? "success" : "neutral"}>{item.status}</Badge>
          )}
        ]}
      />

      <AuditModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        departments={departments}
        onSave={fetchCycles}
      />
    </DashboardLayout>
  );
}

function AuditModal({ isOpen, onClose, departments, onSave }: any) {
  const [name, setName] = useState("");
  const [scope, setScope] = useState("Department");
  const [scopeDepartment, setScopeDepartment] = useState("");
  const [scopeLocation, setScopeLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await fetch("/api/audits/cycles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        name, 
        scope, 
        scopeDepartment: scope === "Department" ? scopeDepartment : undefined,
        scopeLocation: scope === "Location" ? scopeLocation : undefined,
        startDate, 
        endDate 
      })
    });
    onSave();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Audit Cycle">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Audit Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required className="input-field" placeholder="e.g., Q3 HQ IT Audit" />
        </div>

        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Scope</label>
          <select value={scope} onChange={e => setScope(e.target.value)} className="input-field">
            <option value="Department">Department</option>
            <option value="Location">Location</option>
          </select>
        </div>

        {scope === "Department" ? (
          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">Target Department</label>
            <select value={scopeDepartment} onChange={e => setScopeDepartment(e.target.value)} required className="input-field">
              <option value="">Select a department...</option>
              {departments.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">Target Location</label>
            <input type="text" value={scopeLocation} onChange={e => setScopeLocation(e.target.value)} required className="input-field" placeholder="e.g., Building A" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="input-field" />
          </div>
          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="input-field" />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--border)]">
          <button type="button" onClick={onClose} className="btn bg-[var(--card)] border border-[var(--border)]">Cancel</button>
          <button type="submit" className="btn btn-primary">Create & Generate Items</button>
        </div>
      </form>
    </Modal>
  );
}
