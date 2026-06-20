import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/auth';
import { applyStoredTheme } from './stores/theme';
import { lazy, Suspense, useEffect, useState } from 'react';
import Layout from './components/Layout';
import ConfirmDialog from './components/ConfirmDialog';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ResetPassword from './pages/auth/ResetPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import OAuthCallback from './pages/auth/OAuthCallback';
import InstallGuide from './pages/auth/InstallGuide';

applyStoredTheme();

const AdminDashboard    = lazy(() => import('./pages/admin/Dashboard'));
const AdminProfile      = lazy(() => import('./pages/admin/Profile'));
const Merchants         = lazy(() => import('./pages/admin/Merchants'));
const PlanConfigs       = lazy(() => import('./pages/admin/PlanConfigs'));
const AdminMessages     = lazy(() => import('./pages/admin/Messages'));
const ApiManage         = lazy(() => import('./pages/admin/ApiManage'));
const MerchantApiManage = lazy(() => import('./pages/admin/ApiManage'));
const MerchantDashboard = lazy(() => import('./pages/merchant/Dashboard'));
const Apps              = lazy(() => import('./pages/merchant/Apps'));
const Cards             = lazy(() => import('./pages/merchant/Cards'));
const Activations       = lazy(() => import('./pages/merchant/Activations'));

const MerchantMessages  = lazy(() => import('./pages/merchant/Messages'));
const Blacklist         = lazy(() => import('./pages/merchant/Blacklist'));
const Agents            = lazy(() => import('./pages/merchant/Agents'));
const ApiDocs           = lazy(() => import('./pages/merchant/ApiDocs'));
const Recharge          = lazy(() => import('./pages/merchant/Recharge'));
const SettingsPage      = lazy(() => import('./pages/admin/SettingsPage'));

const PageFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
    <span className="spinner" />
  </div>
);

function homeFor(role?: string | null) {
  return role === 'admin' ? '/admin/dashboard' : role === 'merchant' ? '/dashboard' : '/login';
}
function PublicAuthRoute({ children }: { children: React.ReactNode }) {
  const { token, role } = useAuthStore();
  if (token) return <Navigate to={homeFor(role)} replace />;
  return <>{children}</>;
}
function RequireAuth({ children, role }: { children: React.ReactNode; role?: string | string[] }) {
  const { token, role: userRole } = useAuthStore();
  const viewMode = useAuthStore.getState().viewMode;
  const effectiveRole = (userRole === 'admin' && viewMode === 'merchant') ? 'merchant' : userRole;

  if (!token) return <Navigate to="/login" replace />;
  if (role && !(Array.isArray(role) ? role.includes(effectiveRole ?? "") : effectiveRole === role)) {
    return <Navigate to={effectiveRole === 'admin' ? '/admin/dashboard' : '/dashboard'} replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { role } = useAuthStore();
  const location = useLocation();
  const pageKey = location.pathname;
  const [installChecked, setInstallChecked] = useState(false);
  const [installCompleted, setInstallCompleted] = useState(true);

  useEffect(() => {
    fetch('/api/install/status')
      .then(r => r.json())
      .then(j => {
        const completed = Boolean(j?.data?.completed);
        setInstallCompleted(completed);
        if (!completed && location.pathname !== '/install') {
          window.history.replaceState(null, '', '/install');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
        if (completed && location.pathname === '/install') {
          window.history.replaceState(null, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      })
      .catch(() => {})
      .finally(() => setInstallChecked(true));
  }, [location.pathname]);

  if (!installChecked) return <PageFallback />;
  if (!installCompleted && location.pathname !== '/install') return <PageFallback />;

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#fff',
            color: '#1d2129',
            border: '1px solid #f0f0f0',
            fontFamily: '"Inter", PingFang SC, Microsoft YaHei, sans-serif',
            fontSize: '12.5px',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#f0fdf4' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fef2f2' } },
        }}
      />
      <ConfirmDialog />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login"          element={<PublicAuthRoute><Login /></PublicAuthRoute>} />
          <Route path="/register"       element={<PublicAuthRoute><Register /></PublicAuthRoute>} />
          <Route path="/reset-password" element={<PublicAuthRoute><ResetPassword /></PublicAuthRoute>} />
          <Route path="/verify-email" element={<PublicAuthRoute><VerifyEmail /></PublicAuthRoute>} />
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/install" element={<InstallGuide />} />

          <Route path="/admin/dashboard"    element={<RequireAuth role="admin"><Layout><AdminDashboard    key={pageKey} /></Layout></RequireAuth>} />
          <Route path="/admin/merchants"    element={<RequireAuth role="admin"><Layout><Merchants         key={pageKey} /></Layout></RequireAuth>} />
          <Route path="/admin/plan-configs" element={<RequireAuth role="admin"><Layout><PlanConfigs       key={pageKey} /></Layout></RequireAuth>} />
          <Route path="/admin/api-manage"   element={<RequireAuth role="admin"><Layout><ApiManage         key={pageKey} /></Layout></RequireAuth>} />
          <Route path="/api-manage"           element={<RequireAuth role={["admin","merchant"]}><Layout><MerchantApiManage key={pageKey} /></Layout></RequireAuth>} />
          <Route path="/admin/messages"     element={<RequireAuth role="admin"><Layout><AdminMessages     key={pageKey} /></Layout></RequireAuth>} />
          <Route path="/profile"           element={<RequireAuth role={["admin","merchant"]}><Layout><AdminProfile      key={pageKey} /></Layout></RequireAuth>} />
          <Route path="/settings"    element={<RequireAuth role={["admin","merchant"]}><Layout><SettingsPage      key={pageKey} /></Layout></RequireAuth>} />

          <Route path="/dashboard"   element={<RequireAuth role={["admin","merchant"]}><Layout><MerchantDashboard key={pageKey} /></Layout></RequireAuth>} />
          <Route path="/apps"        element={<RequireAuth role={["admin","merchant"]}><Layout><Apps              key={pageKey} /></Layout></RequireAuth>} />
          <Route path="/cards"       element={<RequireAuth role={["admin","merchant"]}><Layout><Cards             key={pageKey} /></Layout></RequireAuth>} />
          <Route path="/activations" element={<RequireAuth role={["admin","merchant"]}><Layout><Activations       key={pageKey} /></Layout></RequireAuth>} />

          <Route path="/messages"    element={<RequireAuth role={["admin","merchant"]}><Layout><MerchantMessages  key={pageKey} /></Layout></RequireAuth>} />
          <Route path="/blacklist"   element={<RequireAuth role={["admin","merchant"]}><Layout><Blacklist          key={pageKey} /></Layout></RequireAuth>} />
          <Route path="/agents"      element={<RequireAuth role={["admin","merchant"]}><Layout><Agents             key={pageKey} /></Layout></RequireAuth>} />
          <Route path="/api-docs"    element={<RequireAuth role={["admin","merchant"]}><Layout><ApiDocs            key={pageKey} /></Layout></RequireAuth>} />
          <Route path="/recharge"    element={<RequireAuth role={["admin","merchant"]}><Layout><Recharge           key={pageKey} /></Layout></RequireAuth>} />

          <Route path="/"  element={<Navigate to={role === 'admin' ? '/admin/dashboard' : role === 'merchant' ? '/dashboard' : '/login'} replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/">
      <AppRoutes />
    </BrowserRouter>
  );
}