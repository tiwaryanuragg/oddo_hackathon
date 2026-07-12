import React from "react";

interface KPICardProps {
  title: string;
  count: number | string;
  icon: React.ReactNode;
  colorClass?: string;
}

export default function KPICard({ title, count, icon, colorClass = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" }: KPICardProps) {
  return (
    <div className="glass-elevated p-5 rounded-xl flex items-center justify-between transition-transform hover:-translate-y-1 duration-200">
      <div>
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-white">{count}</h3>
      </div>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center border ${colorClass}`}>
        {icon}
      </div>
    </div>
  );
}
