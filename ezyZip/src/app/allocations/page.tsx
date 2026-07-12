"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import DataTable from "@/components/DataTable";
import Modal from "@/components/Modal";
import Badge from "@/components/Badge";
import Timeline from "@/components/Timeline";
import { Plus, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { format, isPast } from "date-fns";

export default function AllocationsPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const canAllocate = role === "Admin" || role === "AssetManager" || role === "DepartmentHead";
  const canApproveTransfer = role === "Admin" || role === "AssetManager" || role === "DepartmentHead";
  const [allocations, setAllocations] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState("allocations");
  
  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  
  const [selectedAllocation, setSelectedAllocation] = useState<any>(null);
  const [selectedAssetForTransfer, setSelectedAssetForTransfer] = useState<any>(null);
  const [conflictMessage, setConflictMessage] = useState("");

  const fetchData = async () => {
    try {
      const [allocRes, transRes, assetsRes, usersRes] = await Promise.all([
        fetch("/api/allocations"),
        fetch("/api/transfers"),
        fetch("/api/assets"),
        fetch("/api/employees")
      ]);
      setAllocations(await allocRes.json());
      setTransfers(await transRes.json());
      setAssets(await assetsRes.json());
      setUsers(await usersRes.json());
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openReturnModal = (alloc: any) => {
    setSelectedAllocation(alloc);
    setIsReturnModalOpen(true);
  };

  const handleApproveTransfer = async (id: string, status: string) => {
    await fetch("/api/transfers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: id, status })
    });
    fetchData();
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Allocations & Transfers</h1>
          <p className="text-[var(--text-secondary)]">Manage who holds what asset, and approve transfer requests.</p>
        </div>
        {canAllocate && (
          <button onClick={() => setIsAllocModalOpen(true)} className="btn btn-primary whitespace-nowrap">
            <Plus size={16} className="mr-2" /> Allocate Asset
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--elevated)] border border-[var(--border)] rounded-lg mb-6 w-max">
        <button
          onClick={() => setActiveTab("allocations")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "allocations" ? "bg-[var(--card)] text-white shadow" : "text-[var(--text-secondary)] hover:text-white"
          }`}
        >
          Active Allocations
        </button>
        <button
          onClick={() => setActiveTab("transfers")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "transfers" ? "bg-[var(--card)] text-white shadow" : "text-[var(--text-secondary)] hover:text-white"
          }`}
        >
          Transfer Requests
          {transfers.filter((t: any) => t.status === "Requested").length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xs">
              {transfers.filter((t: any) => t.status === "Requested").length}
            </span>
          )}
        </button>
      </div>

      {/* Data */}
      <div className="animate-in fade-in duration-300">
        {activeTab === "allocations" && (
          <DataTable
            data={allocations}
            keyExtractor={(item) => item._id}
            columns={[
              { header: "Asset", accessor: "asset", render: (item) => (
                <div>
                  <div className="font-medium">{item.asset?.name}</div>
                  <div className="text-xs text-indigo-400 font-mono">{item.asset?.assetTag}</div>
                </div>
              )},
              { header: "Allocated To", accessor: "allocatedTo", render: (item) => item.allocatedTo?.name || "-" },
              { header: "Allocated By", accessor: "allocatedBy", render: (item) => item.allocatedBy?.name || "-" },
              { header: "Expected Return", accessor: "expectedReturnDate", render: (item) => {
                if (!item.expectedReturnDate) return "-";
                const date = new Date(item.expectedReturnDate);
                const isOverdue = isPast(date) && item.status === "Active";
                return (
                  <span className={isOverdue ? "text-red-400 font-medium flex items-center gap-1" : "text-[var(--text-secondary)]"}>
                    {isOverdue && <AlertTriangle size={14} />}
                    {format(date, 'MMM d, yyyy')}
                  </span>
                );
              }},
              { header: "Status", accessor: "status", render: (item) => {
                let variant: any = "neutral";
                if (item.status === "Active") variant = "success";
                if (item.status === "Returned") variant = "neutral";
                if (item.status === "Overdue") variant = "danger";
                if (item.status === "TransferPending") variant = "warning";
                
                const isOverdue = item.status === "Active" && item.expectedReturnDate && isPast(new Date(item.expectedReturnDate));
                if (isOverdue) variant = "danger";

                return <Badge variant={variant}>{isOverdue ? "Overdue" : item.status}</Badge>;
              }},
              { header: "Actions", accessor: "_id", render: (item) => (
                item.status === "Active" ? (
                  <button onClick={(e) => { e.stopPropagation(); openReturnModal(item); }} className="text-xs text-indigo-400 hover:text-indigo-300">
                    Return Asset
                  </button>
                ) : "-"
              )}
            ]}
          />
        )}

        {activeTab === "transfers" && (
          <DataTable
            data={transfers}
            keyExtractor={(item) => item._id}
            columns={[
              { header: "Asset", accessor: "asset", render: (item) => item.asset?.name },
              { header: "From", accessor: "fromUser", render: (item) => item.fromUser ? item.fromUser.name : <span className="text-indigo-400 font-medium text-xs">Available Pool</span> },
              { header: "To", accessor: "toUser", render: (item) => item.toUser?.name },
              { header: "Reason", accessor: "reason", render: (item) => <span className="text-[var(--text-secondary)] truncate max-w-[200px] block">{item.reason || "-"}</span> },
              { header: "Status", accessor: "status", render: (item) => {
                let variant: any = "neutral";
                if (item.status === "Requested") variant = "warning";
                if (item.status === "Approved") variant = "success";
                if (item.status === "Rejected") variant = "danger";
                return <Badge variant={variant}>{item.status}</Badge>;
              }},
              { header: "Actions", accessor: "_id", render: (item) => (
                item.status === "Requested" && canApproveTransfer ? (
                  <div className="flex gap-2">
                    <button onClick={() => handleApproveTransfer(item._id, "Approved")} className="text-xs text-emerald-400 hover:text-emerald-300">Approve</button>
                    <button onClick={() => handleApproveTransfer(item._id, "Rejected")} className="text-xs text-red-400 hover:text-red-300">Reject</button>
                  </div>
                ) : item.status === "Requested" ? (
                  <span className="text-xs text-amber-400">Awaiting Approval</span>
                ) : (
                  <span className="text-xs text-[var(--text-secondary)]">By {item.approvedBy?.name || "-"}</span>
                )
              )}
            ]}
          />
        )}
      </div>

      {/* Allocate Modal */}
      <AllocateModal 
        isOpen={isAllocModalOpen}
        onClose={() => { setIsAllocModalOpen(false); setConflictMessage(""); }}
        assets={assets}
        users={users}
        onSave={fetchData}
        conflictMessage={conflictMessage}
        setConflictMessage={setConflictMessage}
        onRequestTransfer={(assetId: string) => {
          setIsAllocModalOpen(false);
          setSelectedAssetForTransfer(assets.find((a: any) => a._id === assetId));
          setIsTransferModalOpen(true);
        }}
      />

      {/* Transfer Request Modal */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        asset={selectedAssetForTransfer}
        users={users}
        onSave={fetchData}
      />

      {/* Return Modal */}
      <ReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        allocation={selectedAllocation}
        onSave={fetchData}
      />
    </DashboardLayout>
  );
}

// --- Subcomponents ---

function AllocateModal({ isOpen, onClose, assets, users, onSave, conflictMessage, setConflictMessage, onRequestTransfer }: any) {
  const [assetId, setAssetId] = useState("");
  const [userId, setUserId] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setConflictMessage("");
    
    const res = await fetch("/api/allocations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asset: assetId,
        allocatedTo: userId,
        expectedReturnDate: expectedReturnDate || undefined
      })
    });
    
    const data = await res.json();
    
    if (res.status === 409 && data.conflict) {
      setConflictMessage("Already Allocated. Direct re-allocation is blocked.");
    } else if (res.ok) {
      onSave();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Allocate Asset">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        {conflictMessage && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex flex-col items-start gap-3">
            <div className="flex items-center gap-2 text-red-400 font-medium">
              <AlertTriangle size={18} />
              {conflictMessage}
            </div>
            <button 
              type="button" 
              onClick={() => onRequestTransfer(assetId)}
              className="btn bg-red-500 hover:bg-red-600 text-white w-full"
            >
              Submit Transfer Request Instead
            </button>
          </div>
        )}

        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Select Asset</label>
          <select value={assetId} onChange={e => setAssetId(e.target.value)} required className="input-field">
            <option value="">Choose an asset...</option>
            {assets.map((a: any) => (
              <option key={a._id} value={a._id}>
                {a.assetTag} - {a.name} ({a.status})
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Allocate To</label>
          <select value={userId} onChange={e => setUserId(e.target.value)} required className="input-field">
            <option value="">Choose an employee...</option>
            {users.map((u: any) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Expected Return Date (Optional)</label>
          <input type="date" value={expectedReturnDate} onChange={e => setExpectedReturnDate(e.target.value)} className="input-field" />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={onClose} className="btn bg-[var(--card)] border border-[var(--border)]">Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!!conflictMessage}>Allocate</button>
        </div>
      </form>
    </Modal>
  );
}

function TransferModal({ isOpen, onClose, asset, users, onSave }: any) {
  const [toUser, setToUser] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset: asset?._id, toUser, reason })
    });
    onSave();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer Request">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="p-3 bg-[var(--elevated)] rounded-lg">
          <p className="text-sm text-[var(--text-secondary)] mb-1">Requesting transfer for:</p>
          <p className="font-medium text-white">{asset?.name} <span className="font-mono text-indigo-400 text-sm ml-2">{asset?.assetTag}</span></p>
        </div>

        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Transfer To</label>
          <select value={toUser} onChange={e => setToUser(e.target.value)} required className="input-field">
            <option value="">Choose new holder...</option>
            {users.map((u: any) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Reason</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} required className="input-field" rows={3} placeholder="Why is this transfer needed?" />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={onClose} className="btn bg-[var(--card)] border border-[var(--border)]">Cancel</button>
          <button type="submit" className="btn btn-primary">Submit Request</button>
        </div>
      </form>
    </Modal>
  );
}

function ReturnModal({ isOpen, onClose, allocation, onSave }: any) {
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    await fetch("/api/allocations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: allocation?._id, returnConditionNotes: notes })
    });
    onSave();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Return Asset">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="p-3 bg-[var(--elevated)] rounded-lg">
          <p className="text-sm text-[var(--text-secondary)] mb-1">Returning asset:</p>
          <p className="font-medium text-white">{allocation?.asset?.name} <span className="font-mono text-indigo-400 text-sm ml-2">{allocation?.asset?.assetTag}</span></p>
        </div>

        <div>
          <label className="block text-sm mb-1 text-[var(--text-secondary)]">Condition Check-in Notes</label>
          <textarea 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            required 
            className="input-field" 
            rows={4} 
            placeholder="Describe the condition of the asset upon return (e.g., 'Screen scratched', 'Good working order')" 
          />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={onClose} className="btn bg-[var(--card)] border border-[var(--border)]">Cancel</button>
          <button type="submit" className="btn btn-primary">Confirm Return</button>
        </div>
      </form>
    </Modal>
  );
}
