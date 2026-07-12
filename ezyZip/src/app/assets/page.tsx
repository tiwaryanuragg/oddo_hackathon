"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";
import DataTable from "@/components/DataTable";
import Modal from "@/components/Modal";
import Badge from "@/components/Badge";
import { Plus, Search, Filter } from "lucide-react";
import { format } from "date-fns";

export default function AssetsPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const canRegister = role === "Admin" || role === "AssetManager";

  const [assets, setAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  const fetchAssets = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (categoryFilter) params.append("category", categoryFilter);
      if (statusFilter) params.append("status", statusFilter);
      
      const res = await fetch(`/api/assets?${params.toString()}`);
      setAssets(await res.json());
    } catch (error) {
      console.error("Failed to fetch assets", error);
    }
  };

  const fetchOptions = async () => {
    try {
      const [catRes, deptRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/departments")
      ]);
      setCategories(await catRes.json());
      setDepartments(await deptRes.json());
    } catch (error) {
      console.error("Failed to fetch options", error);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchAssets();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, categoryFilter, statusFilter]);

  const openModal = (asset: any = null) => {
    setSelectedAsset(asset);
    setIsModalOpen(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch(status) {
      case "Available": return "success";
      case "Allocated": return "primary";
      case "Reserved": return "info";
      case "Under Maintenance": return "warning";
      case "Lost": return "danger";
      case "Retired": return "neutral";
      case "Disposed": return "neutral";
      default: return "neutral";
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Asset Directory</h1>
          <p className="text-[var(--text-secondary)]">Register, search, and track organizational assets.</p>
        </div>
        {canRegister && (
          <button onClick={() => openModal()} className="btn btn-primary whitespace-nowrap">
            <Plus size={16} className="mr-2" /> Register Asset
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-elevated p-4 rounded-xl flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-secondary)]">
            <Search size={18} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by tag, serial, name..."
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-4">
          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field max-w-[200px]"
          >
            <option value="">All Categories</option>
            {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field max-w-[200px]"
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Allocated">Allocated</option>
            <option value="Reserved">Reserved</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Lost">Lost</option>
            <option value="Retired">Retired</option>
            <option value="Disposed">Disposed</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={assets}
        keyExtractor={(item) => item._id}
        onRowClick={openModal}
        columns={[
          { header: "Tag", accessor: "assetTag", render: (item) => <span className="font-mono text-indigo-400">{item.assetTag}</span> },
          { header: "Name", accessor: "name" },
          { header: "Category", accessor: "category", render: (item) => item.category?.name || "-" },
          { header: "Location", accessor: "location", render: (item) => item.location || "-" },
          { header: "Status", accessor: "status", render: (item) => (
            <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
          )}
        ]}
      />

      <AssetModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        asset={selectedAsset}
        categories={categories}
        departments={departments}
        onSave={fetchAssets}
        canRegister={canRegister}
        userId={(session?.user as any)?.id}
      />
    </DashboardLayout>
  );
}

function AssetModal({ isOpen, onClose, asset, categories, departments, onSave, canRegister, userId }: any) {
  const [formData, setFormData] = useState({
    name: "",
    serialNumber: "",
    category: "",
    acquisitionDate: "",
    acquisitionCost: "",
    condition: "Good",
    location: "",
    department: "",
    isBookable: false
  });

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name || "",
        serialNumber: asset.serialNumber || "",
        category: asset.category?._id || asset.category || "",
        acquisitionDate: asset.acquisitionDate ? format(new Date(asset.acquisitionDate), 'yyyy-MM-dd') : "",
        acquisitionCost: asset.acquisitionCost || "",
        condition: asset.condition || "Good",
        location: asset.location || "",
        department: asset.department?._id || asset.department || "",
        isBookable: asset.isBookable || false
      });
    } else {
      setFormData({
        name: "", serialNumber: "", category: "", acquisitionDate: "", acquisitionCost: "", 
        condition: "Good", location: "", department: "", isBookable: false
      });
    }
  }, [asset, isOpen]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    
    const payload: any = { ...formData };
    if (payload.acquisitionCost) payload.acquisitionCost = Number(payload.acquisitionCost);
    else delete payload.acquisitionCost;
    
    if (!payload.acquisitionDate) delete payload.acquisitionDate;

    await fetch(asset ? `/api/assets/${asset._id}` : "/api/assets", {
      method: asset ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    onSave();
    onClose();
  };

  const handleRequestTransfer = async () => {
    const reason = window.prompt("Why do you need this asset?");
    if (!reason) return;
    
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asset: asset._id, toUser: userId, reason })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to request asset");
      return;
    }
    
    alert("Request submitted successfully!");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={asset ? `Asset Detail: ${asset.assetTag}` : "Register New Asset"}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required disabled={!canRegister} className="input-field" />
          </div>
          
          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">Category</label>
            <select name="category" value={formData.category} onChange={handleChange} required disabled={!canRegister || categories.length === 0} className="input-field">
              <option value="">{categories.length === 0 ? "⚠️ Create a category first in Organization tab" : "Select Category..."}</option>
              {categories.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">Serial Number</label>
            <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} disabled={!canRegister} className="input-field" />
          </div>

          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">Acquisition Date</label>
            <input type="date" name="acquisitionDate" value={formData.acquisitionDate} onChange={handleChange} disabled={!canRegister} className="input-field" />
          </div>

          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">Acquisition Cost ($)</label>
            <input type="number" name="acquisitionCost" value={formData.acquisitionCost} onChange={handleChange} disabled={!canRegister} className="input-field" min="0" step="0.01" />
          </div>

          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">Condition</label>
            <select name="condition" value={formData.condition} onChange={handleChange} disabled={!canRegister} className="input-field">
              <option value="New">New</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">Location</label>
            <input type="text" name="location" value={formData.location} onChange={handleChange} disabled={!canRegister} className="input-field" />
          </div>

          <div className="col-span-2">
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">Assign to Department (Optional)</label>
            <select name="department" value={formData.department} onChange={handleChange} disabled={!canRegister} className="input-field">
              <option value="">None / Unassigned</option>
              {departments.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <input 
            type="checkbox" 
            id="isBookable" 
            name="isBookable" 
            checked={formData.isBookable} 
            onChange={handleChange}
            disabled={!canRegister}
            className="w-4 h-4 rounded border-[var(--border)] bg-[var(--card)] text-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
          />
          <label htmlFor="isBookable" className="text-sm text-[var(--text-secondary)]">
            This is a shared resource (can be booked via Resource Booking)
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[var(--border)]">
          <button type="button" onClick={onClose} className="btn bg-[var(--card)] border border-[var(--border)]">Cancel</button>
          
          {canRegister ? (
            <button type="submit" className="btn btn-primary">{asset ? "Save Changes" : "Register Asset"}</button>
          ) : (
            (asset?.status === "Allocated" || asset?.status === "Available") && (
              <button type="button" onClick={handleRequestTransfer} className="btn bg-indigo-500 hover:bg-indigo-600 text-white">
                {asset?.status === "Available" ? "Request Allocation" : "Request Transfer"}
              </button>
            )
          )}
        </div>
      </form>
    </Modal>
  );
}
