"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Timeline from "@/components/Timeline";
import { Filter } from "lucide-react";

export default function ActivityPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    fetch(`/api/activity?limit=100${typeFilter ? `&type=${typeFilter}` : ''}`)
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch(console.error);
  }, [typeFilter]);

  const timelineEvents = logs.map((log: any) => ({
    title: log.action,
    date: new Date(log.createdAt),
    description: `${log.user?.name || 'System'} ${log.description.toLowerCase()}`,
    status: log.entityType
  }));

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">System Activity</h1>
          <p className="text-[var(--text-secondary)]">Audit trail of all actions performed within the system.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-[var(--text-secondary)]" />
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field max-w-[200px]"
          >
            <option value="">All Events</option>
            <option value="Allocation">Allocations & Returns</option>
            <option value="TransferRequest">Transfers</option>
            <option value="MaintenanceRequest">Maintenance</option>
            <option value="Booking">Bookings</option>
          </select>
        </div>
      </div>

      <div className="glass-elevated p-8 rounded-2xl max-w-4xl">
        <Timeline events={timelineEvents} />
      </div>
    </DashboardLayout>
  );
}
