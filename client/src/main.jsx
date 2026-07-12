import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth.jsx';
import { APPROVER_ROLES } from './lib/constants.js';
import Layout from './components/Layout.jsx';
import { Loading } from './components/ui.jsx';

import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Assets from './pages/Assets.jsx';
import AssetDetail from './pages/AssetDetail.jsx';
import Allocations from './pages/Allocations.jsx';
import Bookings from './pages/Bookings.jsx';
import Maintenance from './pages/Maintenance.jsx';
import Audits from './pages/Audits.jsx';
import AuditDetail from './pages/AuditDetail.jsx';
import Reports from './pages/Reports.jsx';
import Organization from './pages/Organization.jsx';
import Notifications from './pages/Notifications.jsx';
import Activity from './pages/Activity.jsx';

import './styles.css';

// Gates any authenticated route. Redirects to /login while unauthenticated and
// shows a spinner during the initial /auth/me validation.
function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/signup" element={<Auth mode="signup" />} />
      <Route path="/forgot" element={<Auth mode="forgot" />} />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/assets/:id" element={<AssetDetail />} />
        <Route path="/allocations" element={<Allocations />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route
          path="/audits"
          element={
            <RequireAuth roles={APPROVER_ROLES}>
              <Audits />
            </RequireAuth>
          }
        />
        <Route
          path="/audits/:id"
          element={
            <RequireAuth roles={APPROVER_ROLES}>
              <AuditDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/reports"
          element={
            <RequireAuth roles={APPROVER_ROLES}>
              <Reports />
            </RequireAuth>
          }
        />
        <Route
          path="/organization"
          element={
            <RequireAuth roles={['admin']}>
              <Organization />
            </RequireAuth>
          }
        />
        <Route path="/notifications" element={<Notifications />} />
        <Route
          path="/activity"
          element={
            <RequireAuth roles={APPROVER_ROLES}>
              <Activity />
            </RequireAuth>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);