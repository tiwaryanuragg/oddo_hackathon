import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Tags,
  Users,
  Boxes,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_LABELS } from "../lib/constants.js";

// Route definitions with the roles allowed to see them.
const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: null },
  { to: "/assets", label: "Assets", icon: Boxes, roles: null },
  { to: "/departments", label: "Departments", icon: Building2, roles: ["Admin"] },
  { to: "/categories", label: "Categories", icon: Tags, roles: ["Admin"] },
  { to: "/employees", label: "Employees", icon: Users, roles: ["Admin"] },
];

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Filter routes by the role decoded from the token/context.
  const items = NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(role));

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">
            A
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-800">AssetFlow</span>
        </div>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === "/"} className={linkClass}>
              <i.icon size={16} />
              {i.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <div className="text-right">
            <div className="text-sm font-medium text-slate-800">{user?.name}</div>
            <div className="text-xs text-slate-500">{ROLE_LABELS[role] || role}</div>
          </div>
          <button onClick={handleLogout} className="btn-secondary" title="Log out">
            <LogOut size={16} />
          </button>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setOpen((o) => !o)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-200 px-4 py-2 md:hidden">
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.to === "/"}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              <i.icon size={16} />
              {i.label}
            </NavLink>
          ))}
          <button onClick={handleLogout} className="btn-secondary mt-2 w-full">
            <LogOut size={16} /> Log out
          </button>
        </div>
      )}
    </nav>
  );
}
