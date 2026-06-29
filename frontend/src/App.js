import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import FeedbackPopup from './components/shared/FeedbackPopup'; // eslint-disable-line no-unused-vars

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

// V3 Layout + Pages
import V3Layout from './components/v3/V3Layout';
import V1AdminLayout from './pages/admin/V1AdminLayout';
import V1PortalLayout from './components/v1/V1PortalLayout';
import V3RoleSelector from './pages/v3/V3RoleSelector';
import V3Placeholder from './pages/v3/V3Placeholder';
import V3AdminOverview from './pages/v3/admin/V3AdminOverview';
import V3AdminPipeline from './pages/v3/admin/V3AdminPipeline';
import V3AdminProjects from './pages/v3/admin/V3AdminProjects';
import V3AdminProjectDetail from './pages/v3/admin/V3AdminProjectDetail';
import V3AdminCRM from './pages/v3/admin/V3AdminCRM';
import V3AdminBrandDetail from './pages/v3/admin/V3AdminBrandDetail';
import V3AdminOpportunityScanner from './pages/v3/admin/V3AdminOpportunityScanner';
import V3AdminCreators from './pages/v3/admin/V3AdminCreators';
import V3AdminCreatorDetail from './pages/v3/admin/V3AdminCreatorDetail';
import V3AdminContracts from './pages/v3/admin/V3AdminContracts';
import V3AdminTemplates from './pages/v3/admin/V3AdminTemplates';
import V3AdminInsights from './pages/v3/admin/V3AdminInsights';
import V3AdminReports from './pages/v3/admin/V3AdminReports';
import V3AdminWallet from './pages/v3/admin/V3AdminWallet';
import V3AdminFees from './pages/v3/admin/V3AdminFees';
import V3AdminSettings from './pages/v3/admin/V3AdminSettings';
import V3AdminTasks from './pages/v3/admin/V3AdminTasks';
import V3AdminUsers from './pages/v3/admin/V3AdminUsers';
import V3AdminBrainstorm from './pages/v3/admin/V3AdminBrainstorm';
import V3AdminFeedback from './pages/v3/admin/V3AdminFeedback';
import V3AdminScopeChange from './pages/v3/admin/V3AdminScopeChange';
import V3AdminContractPreview from './pages/v3/admin/V3AdminContractPreview';
import V3AdminBusinessCases from './pages/v3/admin/V3AdminBusinessCases';
import V1AdminBusinessCases from './pages/admin/V1AdminBusinessCases';
import {
  V3AdminMeetingsOverview,
  V3AdminQualificationCalls,
  V3AdminQualificationCallDetail,
  V3AdminConnectorCalls,
  V3AdminConnectorCallDetail,
  V3AdminCreatorFitCalls,
  V3AdminCreatorFitCallDetail,
  V3AdminCreatorBriefingCalls,
  V3AdminCreatorBriefingCallDetail,
} from './pages/v3/admin/V3AdminMeetings';
import {
  V3BusinessCaseStageHome,
  V3BusinessCaseConnect,
  V3BusinessCaseConnectSchedule,
  V3BusinessCaseConnectQuestions,
  V3BusinessCaseConnectAnalysis,
  V3BusinessCaseConnectReschedule,
  V3BusinessCaseFrameSnapshot,
  V3BusinessCaseFrameWaitingBrand,
  V3BusinessCaseFrameAdminReview,
  V3BusinessCaseFrameApproved,
  V3BusinessCasePlanBrainstorm,
  V3BusinessCasePlanCreatorScan,
  V3BusinessCasePlanBrief,
  V3BusinessCasePlanCreatorBriefingCall,
  V3BusinessCasePlanStrategySnapshot,
  V3BusinessCasePlanWaitingBrand,
  V3BusinessCaseDeliverySummary,
  V3BusinessCaseContractStudio,
  V3BusinessCaseDeliveryWaitingSignatures,
  V3BusinessCaseDeliverables,
  V3BusinessCaseFinalReport,
} from './pages/v3/admin/businessCaseFlow/V3BusinessCaseFlowPages';
import {
  V3BusinessCaseStageHome as V1BusinessCaseStageHome,
  V3BusinessCaseConnect as V1BusinessCaseConnect,
  V3BusinessCaseConnectSchedule as V1BusinessCaseConnectSchedule,
  V3BusinessCaseConnectQuestions as V1BusinessCaseConnectQuestions,
  V3BusinessCaseConnectAnalysis as V1BusinessCaseConnectAnalysis,
  V3BusinessCaseConnectReschedule as V1BusinessCaseConnectReschedule,
  V3BusinessCaseFrameSnapshot as V1BusinessCaseFrameSnapshot,
  V3BusinessCaseFrameWaitingBrand as V1BusinessCaseFrameWaitingBrand,
  V3BusinessCaseFrameAdminReview as V1BusinessCaseFrameAdminReview,
  V3BusinessCaseFrameApproved as V1BusinessCaseFrameApproved,
  V1BusinessCaseFrameTranscripts,
  V3BusinessCasePlanBrainstorm as V1BusinessCasePlanBrainstorm,
  V3BusinessCasePlanCreatorScan as V1BusinessCasePlanCreatorScan,
  V3BusinessCasePlanBrief as V1BusinessCasePlanBrief,
  V3BusinessCasePlanCreatorBriefingCall as V1BusinessCasePlanCreatorBriefingCall,
  V3BusinessCasePlanStrategySnapshot as V1BusinessCasePlanStrategySnapshot,
  V3BusinessCasePlanWaitingBrand as V1BusinessCasePlanWaitingBrand,
  V3BusinessCasePlanFeedback as V1BusinessCasePlanFeedback,
  V3BusinessCaseDeliverySummary as V1BusinessCaseDeliverySummary,
  V3BusinessCaseContractStudio as V1BusinessCaseContractStudio,
  V3BusinessCaseDeliveryWaitingSignatures as V1BusinessCaseDeliveryWaitingSignatures,
  V3BusinessCaseDeliverables as V1BusinessCaseDeliverables,
  V3BusinessCaseFinalReport as V1BusinessCaseFinalReport,
} from './pages/admin/V1BusinessCaseFlowPages';
import V3BrandInreach from './pages/v3/V3BrandInreach';

// V3 Brand Portal Pages
import V3BrandOverview from './pages/v3/brand/V3BrandOverview';
import V3BrandProjects from './pages/v3/brand/V3BrandProjects';
import V3BrandProjectDetail from './pages/v3/brand/V3BrandProjectDetail';
import V3BrandApprovals from './pages/v3/brand/V3BrandApprovals';
import V3BrandDocuments from './pages/v3/brand/V3BrandDocuments';
import V3BrandInvoices from './pages/v3/brand/V3BrandInvoices';
import V3BrandMessages from './pages/v3/brand/V3BrandMessages';
import V3BrandSettings from './pages/v3/brand/V3BrandSettings';
import V3BrandChangePassword from './pages/v3/brand/V3BrandChangePassword';
import V3BrandLogin from './pages/v3/brand/V3BrandLogin';
import V1BrandLogin from './pages/brand/V1BrandLogin';
import V1BrandOverview from './pages/brand/V1BrandOverview';
import V1BrandProjects, { V1BrandProjectDetail } from './pages/brand/V1BrandProjects';
import {
  V1BrandAlignmentSnapshot,
  V1BrandStrategySnapshot,
  V1BrandContracts,
  V1BrandReportsFeedback,
} from './pages/brand/V1BrandDocuments';
import V1BrandMessages from './pages/brand/V1BrandMessages';

// V3 Creator Portal Pages
import V3CreatorOverview from './pages/v3/creator/V3CreatorOverview';
import V3CreatorBriefs from './pages/v3/creator/V3CreatorBriefs';
import V3CreatorProjects from './pages/v3/creator/V3CreatorProjects';
import V3CreatorDeliverables from './pages/v3/creator/V3CreatorDeliverables';
import V3CreatorWallet from './pages/v3/creator/V3CreatorWallet';
import V3CreatorProfile from './pages/v3/creator/V3CreatorProfile';
import V3CreatorMessages from './pages/v3/creator/V3CreatorMessages';
import V3CreatorSettings from './pages/v3/creator/V3CreatorSettings';
import V1CreatorLogin from './pages/creative/V1CreatorLogin';

// V1 Role Selector
import V1RoleSelector from './pages/v1/V1RoleSelector';
import V1AdminCRM from './pages/admin/V1AdminCRM';
import V1AdminCRMBrandDetail from './pages/admin/V1AdminCRMBrandDetail';
import V1AdminBrandCallRedirect from './pages/admin/V1AdminBrandCallRedirect';
import V1AdminBrandCommunications from './pages/admin/V1AdminBrandCommunications';
import FeedbackAdmin from './pages/FeedbackAdmin';

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

      {/* Feedback Admin */}
      <Route path="/feedback" element={<FeedbackAdmin />} />

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

      <Route path="/brand/login" element={<V1BrandLogin />} />

      {/* V1 Brand Portal */}
      <Route path="/brand" element={<V1PortalLayout portal="brand" />}>
        <Route index element={<V1BrandOverview />} />
        <Route path="projects" element={<V1BrandProjects />} />
        <Route path="projects/:id" element={<V1BrandProjectDetail />} />
        <Route path="alignment-snapshot" element={<V1BrandAlignmentSnapshot />} />
        <Route path="strategy-snapshot" element={<V1BrandStrategySnapshot />} />
        <Route path="contracts" element={<V1BrandContracts />} />
        <Route path="reports-feedback" element={<V1BrandReportsFeedback />} />
        <Route path="approvals" element={<V1BrandAlignmentSnapshot />} />
        <Route path="documents" element={<V1BrandStrategySnapshot />} />
        <Route path="invoices" element={<V1BrandContracts />} />
        <Route path="messages" element={<V1BrandMessages />} />
        <Route path="settings" element={<V3BrandSettings />} />
        <Route path="change-password" element={<V3BrandChangePassword />} />
      </Route>

      <Route path="/creator/login" element={<V1CreatorLogin />} />

      {/* V1 Creator Portal */}
      <Route path="/creator" element={<V1PortalLayout portal="creator" />}>
        <Route index element={<V3CreatorOverview />} />
        <Route path="briefs" element={<V3CreatorBriefs />} />
        <Route path="briefs/:id" element={<V3CreatorBriefs />} />
        <Route path="projects" element={<V3CreatorProjects />} />
        <Route path="deliverables" element={<V3CreatorDeliverables />} />
        <Route path="wallet" element={<V3CreatorWallet />} />
        <Route path="profile" element={<V3CreatorProfile />} />
        <Route path="messages" element={<V3CreatorMessages />} />
        <Route path="settings" element={<V3CreatorSettings />} />
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
            <V1AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<V3AdminOverview />} />
        <Route path="crm-brands" element={<V1AdminCRM />} />
        <Route path="crm-brands/:brandId/call" element={<V1AdminBrandCallRedirect />} />
        <Route path="pipeline" element={<V3AdminPipeline />} />
        <Route path="projects" element={<V3AdminProjects />} />
        <Route path="projects/:id" element={<V3AdminProjectDetail />} />
        <Route path="projects/:id/brainstorm" element={<V3AdminBrainstorm />} />
        <Route path="projects/:id/feedback" element={<V3AdminFeedback />} />
        <Route path="projects/:id/scope-changes" element={<V3AdminScopeChange />} />
        <Route path="projects/:id/contract" element={<V3AdminContractPreview />} />
        <Route path="crm" element={<Navigate to="/admin/crm-brands" replace />} />
        <Route path="crm/opportunities" element={<V3AdminOpportunityScanner />} />
        <Route path="crm-brands/:id" element={<V1AdminCRMBrandDetail />} />
        <Route path="crm/:id" element={<V1AdminCRMBrandDetail />} />
        <Route path="meetings" element={<V3AdminMeetingsOverview />} />
        <Route path="meetings/qualification" element={<V3AdminQualificationCalls />} />
        <Route path="meetings/qualification/:meetingId" element={<V3AdminQualificationCallDetail />} />
        <Route path="meetings/connector" element={<V3AdminConnectorCalls />} />
        <Route path="meetings/connector/:meetingId" element={<V3AdminConnectorCallDetail />} />
        <Route path="meetings/business" element={<V3AdminConnectorCalls />} />
        <Route path="meetings/business/:meetingId" element={<V3AdminConnectorCallDetail />} />
        <Route path="meetings/business-calls" element={<V3AdminConnectorCalls />} />
        <Route path="meetings/business-calls/:businessCaseId" element={<V1BusinessCaseConnect />} />
        <Route path="meetings/business-calls/:businessCaseId/schedule" element={<V1BusinessCaseConnectSchedule />} />
        <Route path="meetings/business-calls/:businessCaseId/questions" element={<V1BusinessCaseConnectQuestions />} />
        <Route path="meetings/business-calls/:businessCaseId/analysis" element={<V1BusinessCaseConnectAnalysis />} />
        <Route path="meetings/business-calls/:businessCaseId/reschedule" element={<V1BusinessCaseConnectReschedule />} />
        <Route path="meetings/creator-fit" element={<V3AdminCreatorFitCalls />} />
        <Route path="meetings/creator-fit/:meetingId" element={<V3AdminCreatorFitCallDetail />} />
        <Route path="meetings/creator-briefing" element={<V3AdminCreatorBriefingCalls />} />
        <Route path="meetings/creator-briefing/:meetingId" element={<V3AdminCreatorBriefingCallDetail />} />
        <Route path="business-cases" element={<V1AdminBusinessCases />} />
        <Route path="business-cases/:id" element={<V1BusinessCaseStageHome />} />
        <Route path="business-cases/:id/connect" element={<V1BusinessCaseConnect />} />
        <Route path="business-cases/:id/connect/schedule" element={<V1BusinessCaseConnectSchedule />} />
        <Route path="business-cases/:id/connect/questions" element={<V1BusinessCaseConnectQuestions />} />
        <Route path="business-cases/:id/connect/analysis" element={<V1BusinessCaseConnectAnalysis />} />
        <Route path="business-cases/:id/connect/reschedule" element={<V1BusinessCaseConnectReschedule />} />
        <Route path="business-cases/:id/frame/transcripts" element={<V1BusinessCaseFrameTranscripts />} />
        <Route path="business-cases/:id/frame/snapshot" element={<V1BusinessCaseFrameSnapshot />} />
        <Route path="business-cases/:id/frame/waiting-brand" element={<V1BusinessCaseFrameWaitingBrand />} />
        <Route path="business-cases/:id/frame/admin-review" element={<V1BusinessCaseFrameAdminReview />} />
        <Route path="business-cases/:id/frame/approved" element={<V1BusinessCaseFrameApproved />} />
        {/* Framing sub-steps (per Chioma's clarification): Brainstorm, Creator
            Selection, Brief, Strategy Snapshot all live under /frame/* even
            though the backend stores them under `plan.*`. The legacy /plan/*
            paths remain as aliases so existing links keep working. */}
        <Route path="business-cases/:id/frame/brainstorm" element={<V1BusinessCasePlanBrainstorm />} />
        <Route path="business-cases/:id/frame/creator-scan" element={<V1BusinessCasePlanCreatorScan />} />
        <Route path="business-cases/:id/frame/brief" element={<V1BusinessCasePlanBrief />} />
        <Route path="business-cases/:id/frame/creator-briefing-call" element={<V1BusinessCasePlanCreatorBriefingCall />} />
        <Route path="business-cases/:id/frame/strategy-snapshot" element={<V1BusinessCasePlanStrategySnapshot />} />
        <Route path="business-cases/:id/frame/waiting-brand-strategy" element={<V1BusinessCasePlanWaitingBrand />} />
        {/* Legacy /plan/* aliases - kept so old bookmarks/emails still resolve. */}
        <Route path="business-cases/:id/plan/brainstorm" element={<V1BusinessCasePlanBrainstorm />} />
        <Route path="business-cases/:id/plan/creator-scan" element={<V1BusinessCasePlanCreatorScan />} />
        <Route path="business-cases/:id/plan/brief" element={<V1BusinessCasePlanBrief />} />
        <Route path="business-cases/:id/plan/creator-briefing-call" element={<V1BusinessCasePlanCreatorBriefingCall />} />
        <Route path="business-cases/:id/plan/strategy-snapshot" element={<V1BusinessCasePlanStrategySnapshot />} />
        <Route path="business-cases/:id/plan/waiting-brand" element={<V1BusinessCasePlanWaitingBrand />} />
        {/* Planning phase (Business Case area). Three pages:
              1. /plan/planning -> Planning landing (project value, brand/
                 creator details, timelines, invoicing). Same component as
                 the legacy /delivery/summary alias.
              2. /delivery/contracts -> Contract Studio. Conceptually part of
                 Planning even though the URL still says /delivery.
              3. /plan/feedback -> dedicated reusable Feedback page.
            Delivery phase has Deliverables only. Reporting has Final Report. */}
        <Route path="business-cases/:id/plan/planning" element={<V1BusinessCaseDeliverySummary />} />
        <Route path="business-cases/:id/plan/feedback" element={<V1BusinessCasePlanFeedback />} />
        <Route path="business-cases/:id/delivery/summary" element={<V1BusinessCaseDeliverySummary />} />
        <Route path="business-cases/:id/delivery/contracts" element={<V1BusinessCaseContractStudio />} />
        <Route path="business-cases/:id/delivery/waiting-signatures" element={<V1BusinessCaseDeliveryWaitingSignatures />} />
        <Route path="business-cases/:id/delivery/deliverables" element={<V1BusinessCaseDeliverables />} />
        <Route path="business-cases/:id/reporting/final-report" element={<V1BusinessCaseFinalReport />} />
        <Route path="creators" element={<V3AdminCreators />} />
        <Route path="creators/:id" element={<V3AdminCreatorDetail />} />
        <Route path="contracts" element={<V3AdminContracts />} />
        <Route path="templates" element={<V3AdminTemplates />} />
        <Route path="insights" element={<V3AdminInsights />} />
        <Route path="reports" element={<V3AdminReports />} />
        <Route path="wallet" element={<V3AdminWallet />} />
        <Route path="fees" element={<V3AdminFees />} />
        <Route path="settings" element={<V3AdminSettings />} />
        <Route path="tasks" element={<V3AdminTasks />} />
        <Route path="users" element={<V3AdminUsers />} />
        <Route path="brand-communications" element={<V1AdminBrandCommunications />} />
        <Route path="brand-review" element={<V1AdminBrandCommunications />} />
        <Route path="brand-messages" element={<V1AdminBrandCommunications />} />
      </Route>

      {/* V3 Brand Inreach (public form) */}
      <Route path="/v3/enquiry" element={<V3BrandInreach />} />

      {/* V3 Role Selector */}
      <Route path="/v3" element={<V3RoleSelector />} />

      {/* V3 Admin Portal */}
      <Route path="/v3/admin" element={<V3Layout portal="admin" />}>
        <Route index element={<V3AdminOverview />} />
        <Route path="pipeline" element={<V3AdminPipeline />} />
        <Route path="projects" element={<V3AdminProjects />} />
        <Route path="projects/:id" element={<V3AdminProjectDetail />} />
        <Route path="projects/:id/brainstorm" element={<V3AdminBrainstorm />} />
        <Route path="projects/:id/feedback" element={<V3AdminFeedback />} />
        <Route path="projects/:id/scope-changes" element={<V3AdminScopeChange />} />
        <Route path="projects/:id/contract" element={<V3AdminContractPreview />} />
        <Route path="crm" element={<V3AdminCRM />} />
        <Route path="crm/opportunities" element={<V3AdminOpportunityScanner />} />
        <Route path="crm/:id" element={<V3AdminBrandDetail />} />
        <Route path="meetings" element={<V3AdminMeetingsOverview />} />
        <Route path="meetings/qualification" element={<V3AdminQualificationCalls />} />
        <Route path="meetings/qualification/:meetingId" element={<V3AdminQualificationCallDetail />} />
        <Route path="meetings/connector" element={<V3AdminConnectorCalls />} />
        <Route path="meetings/connector/:meetingId" element={<V3AdminConnectorCallDetail />} />
        <Route path="meetings/business" element={<V3AdminConnectorCalls />} />
        <Route path="meetings/business/:meetingId" element={<V3AdminConnectorCallDetail />} />
        <Route path="meetings/business-calls" element={<V3AdminConnectorCalls />} />
        <Route path="meetings/business-calls/:businessCaseId" element={<V3BusinessCaseConnect />} />
        <Route path="meetings/business-calls/:businessCaseId/schedule" element={<V3BusinessCaseConnectSchedule />} />
        <Route path="meetings/business-calls/:businessCaseId/questions" element={<V3BusinessCaseConnectQuestions />} />
        <Route path="meetings/business-calls/:businessCaseId/analysis" element={<V3BusinessCaseConnectAnalysis />} />
        <Route path="meetings/business-calls/:businessCaseId/reschedule" element={<V3BusinessCaseConnectReschedule />} />
        <Route path="meetings/creator-fit" element={<V3AdminCreatorFitCalls />} />
        <Route path="meetings/creator-fit/:meetingId" element={<V3AdminCreatorFitCallDetail />} />
        <Route path="meetings/creator-briefing" element={<V3AdminCreatorBriefingCalls />} />
        <Route path="meetings/creator-briefing/:meetingId" element={<V3AdminCreatorBriefingCallDetail />} />
        <Route path="business-cases" element={<V3AdminBusinessCases />} />
        <Route path="business-cases/:id" element={<V3BusinessCaseStageHome />} />
        <Route path="business-cases/:id/connect" element={<V3BusinessCaseConnect />} />
        <Route path="business-cases/:id/connect/schedule" element={<V3BusinessCaseConnectSchedule />} />
        <Route path="business-cases/:id/connect/questions" element={<V3BusinessCaseConnectQuestions />} />
        <Route path="business-cases/:id/connect/analysis" element={<V3BusinessCaseConnectAnalysis />} />
        <Route path="business-cases/:id/connect/reschedule" element={<V3BusinessCaseConnectReschedule />} />
        <Route path="business-cases/:id/frame/snapshot" element={<V3BusinessCaseFrameSnapshot />} />
        <Route path="business-cases/:id/frame/waiting-brand" element={<V3BusinessCaseFrameWaitingBrand />} />
        <Route path="business-cases/:id/frame/admin-review" element={<V3BusinessCaseFrameAdminReview />} />
        <Route path="business-cases/:id/frame/approved" element={<V3BusinessCaseFrameApproved />} />
        <Route path="business-cases/:id/plan/brainstorm" element={<V3BusinessCasePlanBrainstorm />} />
        <Route path="business-cases/:id/plan/creator-scan" element={<V3BusinessCasePlanCreatorScan />} />
        <Route path="business-cases/:id/plan/brief" element={<V3BusinessCasePlanBrief />} />
        <Route path="business-cases/:id/plan/creator-briefing-call" element={<V3BusinessCasePlanCreatorBriefingCall />} />
        <Route path="business-cases/:id/plan/strategy-snapshot" element={<V3BusinessCasePlanStrategySnapshot />} />
        <Route path="business-cases/:id/plan/waiting-brand" element={<V3BusinessCasePlanWaitingBrand />} />
        <Route path="business-cases/:id/delivery/summary" element={<V3BusinessCaseDeliverySummary />} />
        <Route path="business-cases/:id/delivery/contracts" element={<V3BusinessCaseContractStudio />} />
        <Route path="business-cases/:id/delivery/waiting-signatures" element={<V3BusinessCaseDeliveryWaitingSignatures />} />
        <Route path="business-cases/:id/delivery/deliverables" element={<V3BusinessCaseDeliverables />} />
        <Route path="business-cases/:id/reporting/final-report" element={<V3BusinessCaseFinalReport />} />
        <Route path="creators" element={<V3AdminCreators />} />
        <Route path="creators/:id" element={<V3AdminCreatorDetail />} />
        <Route path="contracts" element={<V3AdminContracts />} />
        <Route path="templates" element={<V3AdminTemplates />} />
        <Route path="insights" element={<V3AdminInsights />} />
        <Route path="reports" element={<V3AdminReports />} />
        <Route path="wallet" element={<V3AdminWallet />} />
        <Route path="fees" element={<V3AdminFees />} />
        <Route path="settings" element={<V3AdminSettings />} />
        <Route path="tasks" element={<V3AdminTasks />} />
        <Route path="users" element={<V3AdminUsers />} />
        <Route path="brand-communications" element={<V1AdminBrandCommunications />} />
        <Route path="brand-review" element={<V1AdminBrandCommunications />} />
        <Route path="brand-messages" element={<V1AdminBrandCommunications />} />
      </Route>

      <Route path="/v3/brand/login" element={<V3BrandLogin />} />

      {/* V3 Brand Portal */}
      <Route path="/v3/brand" element={<V3Layout portal="brand" />}>
        <Route index element={<V3BrandOverview />} />
        <Route path="projects" element={<V3BrandProjects />} />
        <Route path="projects/:id" element={<V3BrandProjectDetail />} />
        <Route path="approvals" element={<V3BrandApprovals />} />
        <Route path="documents" element={<V3BrandDocuments />} />
        <Route path="invoices" element={<V3BrandInvoices />} />
        <Route path="messages" element={<V3BrandMessages />} />
        <Route path="settings" element={<V3BrandSettings />} />
        <Route path="change-password" element={<V3BrandChangePassword />} />
      </Route>

      {/* V3 Creator Portal */}
      <Route path="/v3/creator" element={<V3Layout portal="creator" />}>
        <Route index element={<V3CreatorOverview />} />
        <Route path="briefs" element={<V3CreatorBriefs />} />
        <Route path="briefs/:id" element={<V3CreatorBriefs />} />
        <Route path="projects" element={<V3CreatorProjects />} />
        <Route path="deliverables" element={<V3CreatorDeliverables />} />
        <Route path="wallet" element={<V3CreatorWallet />} />
        <Route path="profile" element={<V3CreatorProfile />} />
        <Route path="messages" element={<V3CreatorMessages />} />
        <Route path="settings" element={<V3CreatorSettings />} />
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




