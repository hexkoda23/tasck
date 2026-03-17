import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// V2 Layout + Pages
import V2Layout from './components/v2/V2Layout';
import VersionSelector from './pages/VersionSelector';
import V2RoleSelector from './pages/v2/V2RoleSelector';
import CommandCenter from './pages/v2/command/CommandCenter';
import IntelligenceCenter from './pages/v2/command/IntelligenceCenter';
import V2Pipeline from './pages/v2/command/V2Pipeline';
import V2DealRoom from './pages/v2/command/V2DealRoom';
import V2Network from './pages/v2/command/V2Network';
import V2LiveCommand from './pages/v2/command/V2LiveCommand';
import V2Placeholder from './pages/v2/V2Placeholder';

// V1 Role Selector
import V1RoleSelector from './pages/v1/V1RoleSelector';

// Pages
import LandingPage from './pages/LandingPage';

// Staff Pages
import StaffOverview from './pages/staff/StaffOverview';
import StaffPipeline from './pages/staff/StaffPipeline';
import StaffDeals from './pages/staff/StaffDeals';
import StaffRoster from './pages/staff/StaffRoster';
import StaffBrands from './pages/staff/StaffBrands';
import StaffProjects from './pages/staff/StaffProjects';
import StaffOpportunities from './pages/staff/StaffOpportunities';
import StaffRevenue from './pages/staff/StaffRevenue';
import StaffMeetings from './pages/staff/StaffMeetings';
import StaffContracts from './pages/staff/StaffContracts';

// Shared Wallet Page
import WalletPage from './pages/shared/WalletPage';

// Creative Pages
import CreativeOverview from './pages/creative/CreativeOverview';
import CreativeOpportunities from './pages/creative/CreativeOpportunities';
import CreativeProjects from './pages/creative/CreativeProjects';
import CreativeTasks from './pages/creative/CreativeTasks';
import CreativePortfolio from './pages/creative/CreativePortfolio';

// Super Creative Pages
import SuperCreativeOverview from './pages/super-creative/SuperCreativeOverview';
import SuperCreativePortfolio from './pages/super-creative/SuperCreativePortfolio';
import SuperCreativeProjects from './pages/super-creative/SuperCreativeProjects';
import SuperCreativeOpportunities from './pages/super-creative/SuperCreativeOpportunities';
import SuperCreativeApplications from './pages/super-creative/SuperCreativeApplications';

// Brand Pages
import BrandOverview from './pages/brand/BrandOverview';
import BrandDiscover from './pages/brand/BrandDiscover';
import BrandCampaigns from './pages/brand/BrandCampaigns';
import BrandApprovals from './pages/brand/BrandApprovals';
import BrandAnalytics from './pages/brand/BrandAnalytics';
import BrandSpend from './pages/brand/BrandSpend';

// Admin Pages
import AdminOverview from './pages/admin/AdminOverview';
import AdminUsers from './pages/admin/AdminUsers';
import AdminDisputes from './pages/admin/AdminDisputes';
import AdminContracts from './pages/admin/AdminContracts';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminPermissions from './pages/admin/AdminPermissions';
import AdminWallets from './pages/admin/AdminWallets';
import AdminSettings from './pages/admin/AdminSettings';

// Shared Pages
import MessagesPage from './pages/shared/MessagesPage';
import CalendarPage from './pages/shared/CalendarPage';
import ReportsPage from './pages/shared/ReportsPage';
import SettingsPage from './pages/shared/SettingsPage';

// Protected Route wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="dashboard-bg min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Version Selector */}
      <Route path="/select" element={<VersionSelector />} />

      {/* V1 Role Selector */}
      <Route path="/v1" element={<V1RoleSelector />} />

      {/* V2 Routes */}
      <Route path="/v2" element={<V2RoleSelector />} />

      {/* V2 TASCK Command */}
      <Route path="/v2/command" element={<V2Layout portal="command" />}>
        <Route index element={<CommandCenter />} />
        <Route path="signals" element={<IntelligenceCenter />} />
        <Route path="pipeline" element={<V2Pipeline />} />
        <Route path="deals" element={<V2DealRoom />} />
        <Route path="projects" element={<V2Placeholder />} />
        <Route path="network" element={<V2Network />} />
        <Route path="talent" element={<V2Placeholder />} />
        <Route path="revenue" element={<V2Placeholder />} />
        <Route path="messages" element={<V2Placeholder />} />
        <Route path="automations" element={<V2Placeholder />} />
        <Route path="settings" element={<V2Placeholder />} />
        <Route path="live" element={<V2LiveCommand />} />
      </Route>

      {/* V2 Brand Portal */}
      <Route path="/v2/brand" element={<V2Layout portal="brand" />}>
        <Route index element={<V2Placeholder />} />
        <Route path="campaigns" element={<V2Placeholder />} />
        <Route path="approvals" element={<V2Placeholder />} />
        <Route path="discover" element={<V2Placeholder />} />
        <Route path="analytics" element={<V2Placeholder />} />
        <Route path="spend" element={<V2Placeholder />} />
        <Route path="messages" element={<V2Placeholder />} />
        <Route path="settings" element={<V2Placeholder />} />
      </Route>

      {/* V2 Talent Network */}
      <Route path="/v2/talent" element={<V2Layout portal="talent" />}>
        <Route index element={<V2Placeholder />} />
        <Route path="opportunities" element={<V2Placeholder />} />
        <Route path="projects" element={<V2Placeholder />} />
        <Route path="wallet" element={<V2Placeholder />} />
        <Route path="portfolio" element={<V2Placeholder />} />
        <Route path="analytics" element={<V2Placeholder />} />
        <Route path="messages" element={<V2Placeholder />} />
        <Route path="settings" element={<V2Placeholder />} />
      </Route>

      {/* Staff Portal (V1) */}
      <Route 
        path="/staff" 
        element={
          <ProtectedRoute allowedRoles={['staff']}>
            <DashboardLayout role="staff" />
          </ProtectedRoute>
        }
      >
        <Route index element={<StaffOverview />} />
        <Route path="pipeline" element={<StaffPipeline />} />
        <Route path="deals" element={<StaffDeals />} />
        <Route path="projects" element={<StaffProjects />} />
        <Route path="opportunities" element={<StaffOpportunities />} />
        <Route path="roster" element={<StaffRoster />} />
        <Route path="brands" element={<StaffBrands />} />
        <Route path="revenue" element={<StaffRevenue />} />
        <Route path="meetings" element={<StaffMeetings />} />
        <Route path="contracts" element={<StaffContracts />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Brand Portal */}
      <Route 
        path="/brand" 
        element={
          <ProtectedRoute allowedRoles={['brand']}>
            <DashboardLayout role="brand" />
          </ProtectedRoute>
        }
      >
        <Route index element={<BrandOverview />} />
        <Route path="discover" element={<BrandDiscover />} />
        <Route path="campaigns" element={<BrandCampaigns />} />
        <Route path="approvals" element={<BrandApprovals />} />
        <Route path="analytics" element={<BrandAnalytics />} />
        <Route path="spend" element={<BrandSpend />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Super Creative Portal */}
      <Route 
        path="/super-creative" 
        element={
          <ProtectedRoute allowedRoles={['super_creative']}>
            <DashboardLayout role="super_creative" />
          </ProtectedRoute>
        }
      >
        <Route index element={<SuperCreativeOverview />} />
        <Route path="portfolio" element={<SuperCreativePortfolio />} />
        <Route path="projects" element={<SuperCreativeProjects />} />
        <Route path="opportunities" element={<SuperCreativeOpportunities />} />
        <Route path="applications" element={<SuperCreativeApplications />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Creative Portal */}
      <Route 
        path="/creative" 
        element={
          <ProtectedRoute allowedRoles={['creative']}>
            <DashboardLayout role="creative" />
          </ProtectedRoute>
        }
      >
        <Route index element={<CreativeOverview />} />
        <Route path="opportunities" element={<CreativeOpportunities />} />
        <Route path="projects" element={<CreativeProjects />} />
        <Route path="tasks" element={<CreativeTasks />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="portfolio" element={<CreativePortfolio />} />
        <Route path="messages" element={<MessagesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Admin Portal */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardLayout role="admin" />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminOverview />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="disputes" element={<AdminDisputes />} />
        <Route path="contracts" element={<AdminContracts />} />
        <Route path="audit" element={<AdminAuditLogs />} />
        <Route path="permissions" element={<AdminPermissions />} />
        <Route path="wallets" element={<AdminWallets />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Catch all - redirect to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster 
          position="top-right"
          toastOptions={{
            style: {
              background: '#FFFFFF',
              color: '#0F172A',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
