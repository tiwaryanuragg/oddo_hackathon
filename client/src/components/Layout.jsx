import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api.js';
import { ROLE_LABEL, MANAGER_ROLES, APPROVER_ROLES } from '../lib/constants.js';

// Nav items with the roles that may see them. `roles: null` means everyone.
const NAV = [
  { to: '/', label: 'Dashboard', end: true, roles: null },
  { to: '/assets', label: 'Assets', roles: null },
  { to: '/allocations', label: 'Allocation & Transfer', roles: null },
  { to: '/bookings', label: 'Resource Booking', roles: null },
  { to: '/maintenance', label: 'Maintenance', roles: null },
  { to: '/audits', label: 'Audits', roles: APPROVER_ROLES },
  { to: '/reports', label: 'Reports', roles: APPROVER_ROLES },
  { to: '/organization', label: 'Organization', roles: ['admin'] },
  { to: '/activity', label: 'Activity Log', roles: APPROVER_ROLES },
  { to: '/notifications', label: 'Notifications', roles: null, badgeKey: 'unread' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  // Poll the unread count so the sidebar badge stays roughly current.
  useEffect(() => {
    let alive = true;
    const load = () =>
      api('/notifications')
        .then((res) => alive && setUnread(res.unread || 0))
        .catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const visible = NAV.filter((item) => !item.roles || item.roles.includes(user?.role));

  const doLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <div className="bg-grid" />
      <div className="shell">
        <aside className="sidebar">
          <div className="brand">Asset<span>Flow</span></div>
          <nav className="menu">
            {visible.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}>
                <span>{item.label}</span>
                {item.badgeKey === 'unread' && unread > 0 && (
                  <span className="menu-badge">{unread}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-foot">
            <div className="who" style={{ marginBottom: 10 }}>
              <strong>{user?.name}</strong>
              <span className="role-tag">{ROLE_LABEL[user?.role] || user?.role}</span>
            </div>
            <button className="btn ghost sm full" onClick={doLogout}>Sign out</button>
          </div>
        </aside>
        <main className="main">
          <Outlet context={{ refreshUnread: () => api('/notifications').then((r) => setUnread(r.unread || 0)).catch(() => {}) }} />
        </main>
      </div>
    </>
  );
}

export { MANAGER_ROLES };