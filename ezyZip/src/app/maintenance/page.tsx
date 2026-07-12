"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import Modal from "@/components/Modal";
import Badge from "@/components/Badge";
import { Plus, Wrench, MoreVertical, GripVertical } from "lucide-react";
import { format } from "date-fns";

export default function MaintenancePage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const canManageWorkflow = role === "Admin" || role === "AssetManager";
  const [requests, setRequests] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const columns = ["Pending", "Approved", "TechnicianAssigned", "InProgress", "Resolved", "Rejected"];
  const columnLabels = {
    Pending: "Pending Approval",
    Approved: "Approved",
    TechnicianAssigned: "Tech Assigned",
    InProgress: "In Progress",
    Resolved: "Resolved",
    Rejected: "Rejected"
  };

  const fetchData = async () => {
    try {
      const [reqRes, assetRes] = await Promise.all([
        fetch("/api/maintenance"),
        fetch("/api/assets")
      ]);
      setRequests(await reqRes.json());
      setAssets(await assetRes.json());
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDragStart = (e: any, requestId: string) => {
    e.dataTransfer.setData("requestId", requestId);
  };

  const handleDragOver = (e: any) => {
    e.preventDefault();
  };

  const handleDrop = async (e: any, status: string) => {
    const requestId = e.dataTransfer.getData("requestId");
    
    // Optimistic UI update
    setRequests((prev: any) => 
      prev.map((r: any) => r._id === requestId ? { ...r, status } : r)
    );

    // Call API
    await fetch("/api/maintenance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: requestId, status })
    });
    
    // Refresh to ensure correctness
    fetchData();
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Maintenance Workflows</h1>
          <p className="text-[var(--text-secondary)]">Track repair and maintenance requests via Kanban board.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary whitespace-nowrap">
          <Plus size={16} className="mr-2" /> Report Issue
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar items-start min-h-[600px]">
        {columns.map(col => (
          <div 
            key={col} 
            className="flex-shrink-0 w-80 glass-elevated rounded-2xl flex flex-col max-h-[80vh]"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col)}
          >
            <div className="p-4 border-b border-[var(--border)] font-semibold text-white flex justify-between items-center bg-[var(--elevated)] rounded-t-2xl">
              <span>{columnLabels[col as keyof typeof columnLabels]}</span>
              <span className="w-6 h-6 rounded-md bg-[var(--background)] flex items-center justify-center text-xs text-[var(--text-secondary)]">
                {requests.filter((r: any) => r.status === col).length}
              </span>
            </div>
            
            <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-3 custom-scrollbar">
              {requests.filter((r: any) => r.status === col).map((req: any) => (
                <div 
                  key={req._id}
                  draggable={canManageWorkflow}
                  onDragStart={(e) => canManageWorkflow && handleDragStart(e, req._id)}
                  className={`bg-[var(--card)] border border-[var(--border)] p-4 rounded-xl ${canManageWorkflow ? "cursor-grab active:cursor-grabbing" : "cursor-default"} hover:border-indigo-500/30 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all group`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={
                      req.priority === "Critical" ? "danger" : 
                      req.priority === "High" ? "warning" : 
                      req.priority === "Low" ? "neutral" : "primary"
                    }>
                      {req.priority}
                    </Badge>
                    <GripVertical size={16} className="text-[var(--text-secondary)] opacity-0 group-hover:opacity-100" />
                  </div>
                  
                  <h4 className="text-white font-medium mb-1 line-clamp-1">{req.asset?.name}</h4>
                  <p className="text-xs text-indigo-400 font-mono mb-3">{req.asset?.assetTag}</p>
                  
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">
                    {req.description}
                  </p>
                  
                  <div className="flex justify-between items-center text-xs text-[var(--text-secondary)] mt-auto pt-3 border-t border-[var(--border)]">
                    <span>{format(new Date(req.createdAt), 'MMM d, yyyy')}</span>
                    <span className="truncate max-w-[100px]">{req.raisedBy?.name}</span>
                  </div>
                </div>
              ))}
              {requests.filter((r: any) => r.status === col).length === 0 && (
                <div className="border-2 border-dashed border-[var(--border)] rounded-xl h-24 flex items-center justify-center text-[var(--text-secondary)] text-sm">
                  Drop here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <MaintenanceModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        assets={assets}
        onSave={fetchData}
      />
    </DashboardLayout>
  );
}

function MaintenanceModal({ isOpen, onClose, assets, onSave }: any) {
  const [assetId, setAssetId] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset: assetId, description, priority })
    });
    onSave();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report Maintenance Issue">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Asset</label>
          <select value={assetId} onChange={e => setAssetId(e.target.value)} required className="input-field">
            <option value="">Select an asset...</option>
            {assets.map((a: any) => <option key={a._id} value={a._id}>{a.assetTag} - {a.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Issue Description</label>
          <textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            required 
            className="input-field" 
            rows={4} 
            placeholder="Describe the problem in detail..." 
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Priority</label>
          <select value={priority} onChange={e => setPriority(e.target.value)} required className="input-field">
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={onClose} className="btn bg-[var(--card)] border border-[var(--border)]">Cancel</button>
          <button type="submit" className="btn btn-primary">Submit Report</button>
        </div>
      </form>
    </Modal>
  );
}
