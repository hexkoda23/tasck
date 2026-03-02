import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout
import DashboardLayout from './components/layout/DashboardLayout';

// Pages
import LandingPage from './pages/LandingPage';

// Staff Pages
import StaffOverview from './pages/staff/StaffOverview';
import StaffPipeline from './pages/staff/StaffPipeline';
import StaffDeals from './pages/staff/StaffDeals';
import StaffRoster from './pages/staff/StaffRoster';
import StaffBrands from './pages/staff/StaffBrands';

// Creative Pages
import CreativeOverview from './pages/creative/CreativeOverview';

// Super Creative Pages
import SuperCreativeOverview from './pages/super-creative/SuperCreativeOverview';

// Brand Pages
import BrandOverview from './pages/brand/BrandOverview';

// Admin Pages
import AdminOverview from './pages/admin/AdminOverview';

// Placeholder component for pages not yet built
const PlaceholderPage = ({ title }) => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-white/50">This page is coming soon</p>
    </div>
  </div>
);

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

      {/* Staff Portal */}
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
        <Route path="deals/:id" element={<PlaceholderPage title="Deal Room" />} />
        <Route path="projects" element={<PlaceholderPage title="Projects" />} />
        <Route path="opportunities" element={<PlaceholderPage title="Opportunities" />} />
        <Route path="roster" element={<StaffRoster />} />
        <Route path="brands" element={<StaffBrands />} />
        <Route path="revenue" element={<PlaceholderPage title="Revenue Intelligence" />} />
        <Route path="messages" element={<PlaceholderPage title="Messages" />} />
        <Route path="calendar" element={<PlaceholderPage title="Calendar" />} />
        <Route path="reports" element={<PlaceholderPage title="Reports" />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" />} />
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
        <Route path="discover" element={<PlaceholderPage title="Discover Talent" />} />
        <Route path="campaigns" element={<PlaceholderPage title="My Campaigns" />} />
        <Route path="approvals" element={<PlaceholderPage title="Approvals" />} />
        <Route path="analytics" element={<PlaceholderPage title="Campaign Analytics" />} />
        <Route path="spend" element={<PlaceholderPage title="Spend Tracking" />} />
        <Route path="messages" element={<PlaceholderPage title="Messages" />} />
        <Route path="reports" element={<PlaceholderPage title="Reports" />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" />} />
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
        <Route path="portfolio" element={<PlaceholderPage title="Portfolio" />} />
        <Route path="projects" element={<PlaceholderPage title="Projects" />} />
        <Route path="opportunities" element={<PlaceholderPage title="Opportunities" />} />
        <Route path="applications" element={<PlaceholderPage title="Applications" />} />
        <Route path="wallet" element={<PlaceholderPage title="Wallet" />} />
        <Route path="calendar" element={<PlaceholderPage title="Calendar" />} />
        <Route path="messages" element={<PlaceholderPage title="Messages" />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" />} />
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
        <Route path="opportunities" element={<PlaceholderPage title="Opportunities" />} />
        <Route path="projects" element={<PlaceholderPage title="My Projects" />} />
        <Route path="tasks" element={<PlaceholderPage title="Tasks" />} />
        <Route path="wallet" element={<PlaceholderPage title="Wallet" />} />
        <Route path="portfolio" element={<PlaceholderPage title="Portfolio" />} />
        <Route path="messages" element={<PlaceholderPage title="Messages" />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" />} />
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
        <Route path="users" element={<PlaceholderPage title="Users & Verification" />} />
        <Route path="disputes" element={<PlaceholderPage title="Disputes" />} />
        <Route path="contracts" element={<PlaceholderPage title="Contracts" />} />
        <Route path="audit" element={<PlaceholderPage title="Audit Logs" />} />
        <Route path="permissions" element={<PlaceholderPage title="Permissions" />} />
        <Route path="wallets" element={<PlaceholderPage title="Platform Wallets" />} />
        <Route path="settings" element={<PlaceholderPage title="Platform Settings" />} />
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
              background: '#0A1A30',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
