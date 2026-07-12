"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { 
  LayoutDashboard, 
  Settings, 
  Box, 
  ArrowRightLeft, 
  CalendarDays, 
  Wrench, 
  ClipboardCheck, 
  BarChart3, 
  BellRing,
  LogOut
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  const role = (session?.user as { role?: string })?.role;
  const isAdmin = role === "Admin";
  const isAssetManager = role === "AssetManager";
  const isDeptHead = role === "DepartmentHead";

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, visible: true },
    { name: "Organization", href: "/organization", icon: Settings, visible: isAdmin },
    { name: "Asset Directory", href: "/assets", icon: Box, visible: true },
    { name: "Allocations", href: "/allocations", icon: ArrowRightLeft, visible: true },
    { name: "Resource Booking", href: "/bookings", icon: CalendarDays, visible: true },
    { name: "Maintenance", href: "/maintenance", icon: Wrench, visible: true },
    { name: "Audits", href: "/audits", icon: ClipboardCheck, visible: isAdmin || isAssetManager },
    { name: "Reports", href: "/reports", icon: BarChart3, visible: isAdmin || isAssetManager || isDeptHead },
    { name: "Activity", href: "/activity", icon: BellRing, visible: true },
  ];

  // Format role for display
  const roleDisplay = (() => {
    switch (role) {
      case "Admin": return "Administrator";
      case "AssetManager": return "Asset Manager";
      case "DepartmentHead": return "Dept. Head";
      case "Employee": return "Employee";
      default: return role;
    }
  })();

  return (
    <div className="w-64 h-screen glass border-r border-[var(--border)] flex flex-col fixed left-0 top-0 z-40">
      {/* Brand */}
      <div className="h-20 flex items-center px-6 border-b border-[var(--border)]">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-[0_0_10px_rgba(99,102,241,0.5)] mr-3">
          AF
        </div>
        <span className="text-lg font-bold text-white tracking-wide">AssetFlow</span>
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {navItems.filter(item => item.visible).map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive 
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                  : "text-[var(--text-secondary)] hover:bg-[var(--elevated)] hover:text-white"
              }`}
            >
              <Icon size={18} />
              <span className="font-medium text-sm">{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* User Profile / Logout */}
      <div className="p-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
            {session?.user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{session?.user?.name}</p>
            <p className="text-xs text-[var(--text-secondary)] truncate">{roleDisplay}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm font-medium"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
