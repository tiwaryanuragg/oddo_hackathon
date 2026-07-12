import { NavLink, useNavigate } from 'react-router-dom';
import {
  Package, LayoutDashboard, Users, Building2, Tags,
  ClipboardList, Wrench, ShieldCheck, BarChart3,
  ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react';
import { useAuthStore } from '../lib/store';

interface NavItem {
  icon:  React.ReactNode;
  label: string;
  to:    string;
  phase?: number;
}

const NAV_ITEMS: NavItem[] = [
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard',   to: '/'            },
  { icon: <Package size={18} />,         label: 'Assets',       to: '/assets'      },
  { icon: <ClipboardList size={18} />,   label: 'Allocations',  to: '/allocations' },
  { icon: <Wrench size={18} />,          label: 'Maintenance',  to: '/maintenance', phase: 7 },
  { icon: <ShieldCheck size={18} />,     label: 'Audits',       to: '/audits',     phase: 8 },
  { icon: <BarChart3 size={18} />,       label: 'Reports',      to: '/reports',    phase: 9 },
  { icon: <Users size={18} />,           label: 'Employees',    to: '/users'       },
  { icon: <Building2 size={18} />,       label: 'Departments',  to: '/departments' },
  { icon: <Tags size={18} />,            label: 'Categories',   to: '/categories'  },
];

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <aside
      style={{
        width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
        transition: 'width var(--transition-slow)',
        background: 'var(--color-bg-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 'var(--topbar-height)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32, height: 32,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Package size={16} color="#fff" />
        </div>
        {!collapsed && (
          <span style={{ fontWeight: 800, fontSize: 'var(--text-base)', color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
            AssetFlow
          </span>
        )}
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            title={collapsed ? item.label : undefined}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              marginBottom: 3,
              color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              background: isActive ? 'var(--color-accent-light)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              fontSize: 'var(--text-sm)',
              textDecoration: 'none',
              transition: 'all var(--transition-fast)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              opacity: item.phase ? 0.5 : 1,
              cursor: item.phase ? 'not-allowed' : 'pointer',
            })}
            onClick={(e) => { if (item.phase) e.preventDefault(); }}
          >
            <span style={{ flexShrink: 0 }}>{item.icon}</span>
            {!collapsed && (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: user + collapse toggle */}
      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {/* User info */}
        {user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg-elevated)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: 32, height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff',
                flexShrink: 0,
              }}
            >
              {user.firstName[0]}{user.lastName[0]}
            </div>
            {!collapsed && (
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 'var(--text-xs)', fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {user.firstName} {user.lastName}
                </div>
                <div
                  style={{
                    fontSize: 10, color: 'var(--color-text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}
                >
                  {user.role}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleLogout}
          title="Logout"
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'transparent', border: 'none',
            color: 'var(--color-danger)',
            cursor: 'pointer',
            fontSize: 'var(--text-sm)',
            width: '100%',
            transition: 'background var(--transition-fast)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-danger-bg)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          {!collapsed && <span>Logout</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-end',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'transparent', border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            width: '100%',
            transition: 'background var(--transition-fast)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-elevated)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
