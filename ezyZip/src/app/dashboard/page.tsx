"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import KPICard from "@/components/KPICard";
import { 
  Box, 
  ArrowRightLeft, 
  Wrench, 
  CalendarDays, 
  RefreshCw, 
  RotateCcw,
  AlertTriangle,
  PlusCircle,
  CalendarPlus,
  WrenchIcon
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
        <p className="text-[var(--text-secondary)]">Welcome back to AssetFlow. Here's what's happening today.</p>
      </div>

      {/* Alerts Banner */}
      {data?.kpis?.overdueReturns > 0 && (
        <div className="w-full bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8 flex items-center gap-3">
          <AlertTriangle className="text-red-400" size={24} />
          <div>
            <h4 className="text-red-400 font-semibold text-sm">Attention Required</h4>
            <p className="text-red-400/80 text-sm">
              {data.kpis.overdueReturns} {data.kpis.overdueReturns === 1 ? 'asset is' : 'assets are'} overdue for return. Please review allocations.
            </p>
          </div>
          <Link href="/allocations" className="ml-auto btn bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs py-1.5">
            Review Overdue
          </Link>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <KPICard 
          title="Available Assets" 
          count={data?.kpis?.available || 0} 
          icon={<Box size={24} />} 
          colorClass="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
        />
        <KPICard 
          title="Allocated Assets" 
          count={data?.kpis?.allocated || 0} 
          icon={<ArrowRightLeft size={24} />} 
          colorClass="text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
        />
        <KPICard 
          title="Under Maintenance" 
          count={data?.kpis?.maintenance || 0} 
          icon={<Wrench size={24} />} 
          colorClass="text-amber-400 bg-amber-500/10 border-amber-500/20"
        />
        <KPICard 
          title="Active Bookings" 
          count={data?.kpis?.activeBookings || 0} 
          icon={<CalendarDays size={24} />} 
          colorClass="text-blue-400 bg-blue-500/10 border-blue-500/20"
        />
        <KPICard 
          title="Pending Transfers" 
          count={data?.kpis?.pendingTransfers || 0} 
          icon={<RefreshCw size={24} />} 
          colorClass="text-purple-400 bg-purple-500/10 border-purple-500/20"
        />
        <KPICard 
          title="Upcoming Returns" 
          count={data?.kpis?.upcomingReturns || 0} 
          icon={<RotateCcw size={24} />} 
          colorClass="text-rose-400 bg-rose-500/10 border-rose-500/20"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="col-span-1">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-3">
            <Link href="/assets" className="glass-elevated p-4 rounded-xl flex items-center gap-3 hover:bg-[var(--card)] transition-colors">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <PlusCircle size={20} />
              </div>
              <div>
                <h4 className="font-medium text-white text-sm">Register Asset</h4>
                <p className="text-xs text-[var(--text-secondary)]">Add a new asset to inventory</p>
              </div>
            </Link>
            <Link href="/bookings" className="glass-elevated p-4 rounded-xl flex items-center gap-3 hover:bg-[var(--card)] transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <CalendarPlus size={20} />
              </div>
              <div>
                <h4 className="font-medium text-white text-sm">Book Resource</h4>
                <p className="text-xs text-[var(--text-secondary)]">Reserve a shared space or item</p>
              </div>
            </Link>
            <Link href="/maintenance" className="glass-elevated p-4 rounded-xl flex items-center gap-3 hover:bg-[var(--card)] transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <WrenchIcon size={20} />
              </div>
              <div>
                <h4 className="font-medium text-white text-sm">Raise Request</h4>
                <p className="text-xs text-[var(--text-secondary)]">Report an issue for maintenance</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-span-1 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          <div className="glass-elevated rounded-xl p-6">
            {data?.recentActivity?.length > 0 ? (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-3 before:-translate-x-px md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[var(--border)] before:to-transparent">
                {data.recentActivity.map((activity: any, idx: number) => (
                  <div key={activity._id} className="relative flex items-center gap-4 group">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border border-[var(--border)] bg-[var(--card)] shrink-0 shadow z-10">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    </div>
                    <div className="flex-1 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]/50 shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1 gap-2">
                        <span className="font-semibold text-white text-sm">{activity.action}</span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">
                        {activity.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--text-secondary)]">
                No recent activity to display.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
