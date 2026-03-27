import { Routes, Route, Navigate } from 'react-router-dom'
import { useTenant } from './context/TenantContext'
import AdminLayout from './components/admin/AdminLayout'
import AdminMenu from './modules/menu/AdminMenu'
import AdminOrders from './modules/orders/AdminOrders'
import AdminCommunity from './modules/community/AdminCommunity'
import AdminUsers from './modules/users/AdminUsers'
import AdminSettings from './modules/settings/AdminSettings'
import AdminBilling from './modules/billing/AdminBilling'
import AdminOrderDetail from './modules/orders/AdminOrderDetail'
import ProtectedRoute from './components/ProtectedRoute'
import ModuleGuard from './components/ModuleGuard'
import Dashboard from './pages/dashboard/Dashboard'
import KitchenDashboard from './pages/dashboard/KitchenDashboard'
import Login from './pages/Login'
import SetupGate from './pages/SetupGate'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import MfaSetup from './pages/auth/MfaSetup'
import Integrations from './modules/integrations/Integrations'
import SocialIntegrations from './modules/integrations/SocialIntegrations'
import CommunityImports from './modules/community/CommunityImports'
import PosHome from './modules/pos/PosHome'
import Customers from './modules/users/Customers'
import Analytics from './pages/admin/Analytics'
import AdminEntry from './components/admin/AdminEntry'

function App() {
  const { hasFeature } = useTenant()
  return (
    <Routes>
      <Route path="/admin/login" element={<SetupGate />} />
      <Route path="/login" element={<Navigate to="/admin/login" replace />} />
      
      {/* Admin Signup Disabled - Redirect to Login */}
      <Route path="/register" element={<Navigate to="/admin/login" replace />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/mfa/setup" element={
        <ProtectedRoute>
          <MfaSetup />
        </ProtectedRoute>
      } />

      <Route path="/dashboard" element={
        <AdminLayout>
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </AdminLayout>
      } />

      {/* Admin Entry Point - Smart Redirect */}
      <Route path="/admin" element={<AdminEntry />} />
      
      {/* Deprecated Dashboard Routes - Redirect to Admin Entry */}
      <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />
      <Route path="/dashboard/manager" element={<Navigate to="/admin" replace />} />
      <Route path="/dashboard/cashier" element={<Navigate to="/admin" replace />} />

      {/* Kitchen stays separate */}
      <Route path="/dashboard/kitchen" element={
        <AdminLayout>
          <ProtectedRoute allowed={["owner","admin","manager","kitchen"]}>
            <KitchenDashboard />
          </ProtectedRoute>
        </AdminLayout>
      } />

      {/* Admin Modules */}
      <Route path="/admin/pos" element={
        <AdminLayout>
          <ProtectedRoute requiredPermission="canManageOrders">
            <ModuleGuard module="rationsweb_admin">
              <PosHome />
            </ModuleGuard>
          </ProtectedRoute>
        </AdminLayout>
      } />

      <Route path="/admin/customers" element={
        <AdminLayout>
          <ProtectedRoute requiredPermission="canManageOrders">
            <ModuleGuard module="rationsweb_admin">
              <Customers />
            </ModuleGuard>
          </ProtectedRoute>
        </AdminLayout>
      } />

      <Route path="/admin/analytics" element={
        <AdminLayout>
          <ProtectedRoute requiredPermission="canViewReports">
            <Analytics />
          </ProtectedRoute>
        </AdminLayout>
      } />

      <Route path="/admin/menu" element={
        <AdminLayout>
          <ProtectedRoute requiredPermission="canManageMenu">
            <ModuleGuard module="rationsweb_admin">
              <AdminMenu />
            </ModuleGuard>
          </ProtectedRoute>
        </AdminLayout>
      } />

      <Route path="/admin/orders" element={
        <AdminLayout>
          <ProtectedRoute requiredPermission="canManageOrders">
            <ModuleGuard module="rationsweb_admin">
              <AdminOrders />
            </ModuleGuard>
          </ProtectedRoute>
        </AdminLayout>
      } />

      <Route path="/admin/community" element={
        <AdminLayout>
          <ProtectedRoute requiredPermission="canViewReports">
            <ModuleGuard module="rationsweb_admin">
              {hasFeature('hasCommunity') ? <AdminCommunity /> : <Navigate to="/admin" replace />}
            </ModuleGuard>
          </ProtectedRoute>
        </AdminLayout>
      } />

      <Route path="/admin/users" element={
        <AdminLayout>
          <ProtectedRoute requiredPermission="canManageUsers">
            <AdminUsers />
          </ProtectedRoute>
        </AdminLayout>
      } />

      <Route path="/admin/settings" element={
        <AdminLayout>
          <ProtectedRoute requiredPermission="canManageSettings">
            <AdminSettings />
          </ProtectedRoute>
        </AdminLayout>
      } />
      <Route path="/admin/billing" element={
        <AdminLayout>
          <ProtectedRoute requiredPermission="canManageSettings">
            <AdminBilling />
          </ProtectedRoute>
        </AdminLayout>
      } />

      <Route path="/admin/integrations" element={
        <AdminLayout>
          <ProtectedRoute requiredPermission="canManageSettings">
            <Integrations />
          </ProtectedRoute>
        </AdminLayout>
      } />

      <Route path="/admin/integrations/social" element={  
        <AdminLayout>
          <ProtectedRoute requiredPermission="canManageSettings">
            <SocialIntegrations />
          </ProtectedRoute>
        </AdminLayout>
      } />

      <Route path="/admin/orders/:id" element={
        <AdminLayout>
          <ProtectedRoute requiredPermission="canManageOrders">
            <ModuleGuard module="rationsweb_admin">
              <AdminOrderDetail />
            </ModuleGuard>
          </ProtectedRoute>
        </AdminLayout>
      } />

      {/* Catch-all: Redirect to Admin Login */}
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  )
}

export default App
