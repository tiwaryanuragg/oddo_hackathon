import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/query-client';
import { ToastProvider } from './components/ui/Toast';
import { AppLayout } from './layouts/AppLayout';
import { AssetListPage }        from './modules/assets/pages/AssetListPage';
import { AssetDetailPage }      from './modules/assets/pages/AssetDetailPage';
import { AssetRegisterPage }    from './modules/assets/pages/AssetRegisterPage';
import { AllocationListPage }   from './modules/allocation/pages/AllocationListPage';
import { AllocationDetailPage } from './modules/allocation/pages/AllocationDetailPage';
import { AllocateAssetPage }    from './modules/allocation/pages/AllocateAssetPage';

/**
 * Application root.
 * Phase 4: Asset module UI
 * Phase 5: Allocation module UI (allocations, transfers, returns)
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Authenticated app shell */}
            <Route element={<AppLayout />}>
              {/* Default redirect */}
              <Route index element={<Navigate to="/assets" replace />} />

              {/* ── Phase 4: Asset Module ── */}
              <Route path="/assets"           element={<AssetListPage />}     />
              <Route path="/assets/register"  element={<AssetRegisterPage />} />
              <Route path="/assets/:id"       element={<AssetDetailPage />}   />

              {/* ── Phase 5: Allocation Module ── */}
              <Route path="/allocations"          element={<AllocationListPage />}   />
              <Route path="/allocations/issue"    element={<AllocateAssetPage />}    />
              <Route path="/allocations/:id"      element={<AllocationDetailPage />} />
              {/* Transfer and Return detail deep-links redirect to allocation list with correct tab */}
              <Route path="/allocations/transfers/:id" element={<AllocationListPage />} />
              <Route path="/allocations/returns/:id"   element={<AllocationListPage />} />

              {/* Placeholder routes for phases 7–10 */}
              <Route path="/maintenance"  element={<ComingSoon phase={7} title="Maintenance Module" />} />
              <Route path="/audits"       element={<ComingSoon phase={8} title="Audit Module" />} />
              <Route path="/reports"      element={<ComingSoon phase={9} title="Reports & Analytics" />} />
              <Route path="/users"        element={<ComingSoon phase={3} title="Employee Directory" />} />
              <Route path="/departments"  element={<ComingSoon phase={3} title="Departments" />} />
              <Route path="/categories"   element={<ComingSoon phase={3} title="Categories" />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/assets" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

function ComingSoon({ phase, title }: { phase: number; title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: 16,
        animation: 'fadeIn 0.3s ease both',
      }}
    >
      <div
        style={{
          width: 80, height: 80,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-accent-light)',
          border: '2px solid var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, fontWeight: 800, color: 'var(--color-accent)',
        }}
      >
        {phase}
      </div>
      <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
        {title}
      </h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
        Coming in Phase {phase}
      </p>
    </div>
  );
}
