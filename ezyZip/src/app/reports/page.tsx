"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
} from "chart.js";
import { TrendingUp, DollarSign } from "lucide-react";

ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title
);

export default function ReportsPage() {
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/reports")
      .then(res => res.json())
      .then(data => setReportData(data))
      .catch(console.error);
  }, []);

  if (!reportData) return <DashboardLayout><div className="flex justify-center p-10"><div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div></div></DashboardLayout>;

  // Prepare chart data
  const statusColors = {
    Available: 'rgba(16, 185, 129, 0.6)',
    Allocated: 'rgba(99, 102, 241, 0.6)',
    Reserved: 'rgba(59, 130, 246, 0.6)',
    'Under Maintenance': 'rgba(245, 158, 11, 0.6)',
    Lost: 'rgba(239, 68, 68, 0.6)',
    Retired: 'rgba(107, 114, 128, 0.6)',
    Disposed: 'rgba(75, 85, 99, 0.6)'
  };

  const statusChartData = {
    labels: reportData.status.map((item: any) => item._id),
    datasets: [
      {
        data: reportData.status.map((item: any) => item.count),
        backgroundColor: reportData.status.map((item: any) => statusColors[item._id as keyof typeof statusColors] || 'rgba(156, 163, 175, 0.6)'),
        borderColor: reportData.status.map((item: any) => (statusColors[item._id as keyof typeof statusColors] || 'rgba(156, 163, 175, 0.6)').replace('0.6', '1')),
        borderWidth: 1,
      },
    ],
  };

  const conditionColors = {
    New: 'rgba(59, 130, 246, 0.6)',
    Good: 'rgba(16, 185, 129, 0.6)',
    Fair: 'rgba(245, 158, 11, 0.6)',
    Poor: 'rgba(239, 68, 68, 0.6)'
  };

  const conditionChartData = {
    labels: reportData.condition.map((item: any) => item._id),
    datasets: [
      {
        label: 'Number of Assets',
        data: reportData.condition.map((item: any) => item.count),
        backgroundColor: reportData.condition.map((item: any) => conditionColors[item._id as keyof typeof conditionColors]),
        borderWidth: 0,
        borderRadius: 4
      }
    ]
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">System Reports</h1>
        <p className="text-[var(--text-secondary)]">Insights into asset utilization, status, and overall value.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="glass-elevated p-6 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Total Asset Value</p>
            <h3 className="text-2xl font-bold text-white">
              ${reportData.totalValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </h3>
          </div>
        </div>
        
        <div className="glass-elevated p-6 rounded-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-[var(--text-secondary)]">Active Assets</p>
            <h3 className="text-2xl font-bold text-white">
              {reportData.status.filter((s: any) => ['Available', 'Allocated', 'Reserved'].includes(s._id)).reduce((acc: number, curr: any) => acc + curr.count, 0)}
            </h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-elevated p-6 rounded-xl">
          <h2 className="text-lg font-semibold text-white mb-4">Assets by Status</h2>
          <div className="h-[300px] flex justify-center items-center">
            <Pie 
              data={statusChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'right', labels: { color: '#9ca3af' } }
                }
              }} 
            />
          </div>
        </div>

        <div className="glass-elevated p-6 rounded-xl">
          <h2 className="text-lg font-semibold text-white mb-4">Assets by Condition</h2>
          <div className="h-[300px]">
            <Bar 
              data={conditionChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                  x: { ticks: { color: '#9ca3af' }, grid: { display: false } }
                },
                plugins: {
                  legend: { display: false }
                }
              }} 
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
