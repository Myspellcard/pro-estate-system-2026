import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Properties from '@/pages/Properties';
import Tenants from '@/pages/Tenants';
import Contracts from '@/pages/Contracts';
import Invoices from '@/pages/Invoices';
import Maintenance from '@/pages/Maintenance';
import Analytics from '@/pages/Analytics';
import AdminBranches from '@/pages/AdminBranches';
import AdminContractClauses from '@/pages/AdminContractClauses';
import AdminUsers from '@/pages/AdminUsers';
import AdminDashboardSettings from '@/pages/AdminDashboardSettings';
import AdminPrintSettings from '@/pages/AdminPrintSettings';
import AdminBarcodeSettings from '@/pages/AdminBarcodeSettings';
import AdminBarcodeStatuses from '@/pages/AdminBarcodeStatuses';
import AdminWhatsAppTemplates from '@/pages/AdminWhatsAppTemplates';
import AdminProjects from '@/pages/AdminProjects';
import AdminPropertyAccess from '@/pages/AdminPropertyAccess';
import AdminPropertyLabels from '@/pages/AdminPropertyLabels';
import AdminProjectCategories from '@/pages/AdminProjectCategories';
import AdminSaleCategories from '@/pages/AdminSaleCategories';
import AdminSaleContractClauses from '@/pages/AdminSaleContractClauses';
import AdminPropertyStatusColors from '@/pages/AdminPropertyStatusColors';
import AdminPropertyPurposes from '@/pages/AdminPropertyPurposes';
import AdminAdvertisements from '@/pages/AdminAdvertisements';
import AdminEmployees from '@/pages/AdminEmployees';
import AdminTaskColors from '@/pages/AdminTaskColors';
import AdminGroups from '@/pages/AdminGroups';
import AdminDepartments from '@/pages/AdminDepartments';
import EmployeeGoals from '@/pages/EmployeeGoals';
import EmployeePermissions from '@/pages/EmployeePermissions';
import OrganizationStructure from '@/pages/OrganizationStructure';
import EmployeeProfile from '@/pages/EmployeeProfile';
import EmployeeTasks from '@/pages/EmployeeTasks';
import GroupTasks from '@/pages/GroupTasks';
import HrReports from '@/pages/HrReports';
import TaskPublicView from '@/pages/TaskPublicView';
import BarcodeView from '@/pages/BarcodeView';
import ProjectsView from '@/pages/ProjectsView';
import Sales from '@/pages/Sales';
import SalesView from '@/pages/SalesView';
import SaleContracts from '@/pages/SaleContracts';
import SaleInvoices from '@/pages/SaleInvoices';
import Reports from '@/pages/Reports';
import UserProfile from '@/pages/UserProfile';
import Login from '@/pages/Login';
import Backup from '@/pages/Backup';
import AdminTranslations from '@/pages/AdminTranslations';
import AdminPermissionApprovers from '@/pages/AdminPermissionApprovers';
import AdminCurrencies from '@/pages/AdminCurrencies';
import AdminNumberingSettings from '@/pages/AdminNumberingSettings';
import FinanceDepartment from '@/pages/FinanceDepartment';
import CRM from '@/pages/CRM';
import AdminCRMSettings from '@/pages/AdminCRMSettings';
import Commissions from '@/pages/Commissions';
import { BranchProvider } from '@/context/BranchContext';
import { LanguageProvider } from '@/context/LanguageContext';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // Allow public pages without auth
  if (location.pathname === '/login') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  if (location.pathname === '/task-view') {
    return (
      <Routes>
        <Route path="/task-view" element={<TaskPublicView />} />
      </Routes>
    );
  }
  
  if (location.pathname === '/barcode-view') {
    return (
      <Routes>
        <Route path="/barcode-view" element={<BarcodeView />} />
      </Routes>
    );
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
      <Route path="/" element={<Dashboard />} />
      <Route path="/properties" element={<Properties />} />
      <Route path="/tenants" element={<Tenants />} />
      <Route path="/contracts" element={<Contracts />} />
      <Route path="/invoices" element={<Invoices />} />
      <Route path="/maintenance" element={<Maintenance />} />
      <Route path="/analytics" element={<Analytics />} />
      <Route path="/admin/branches" element={<AdminBranches />} />
      <Route path="/admin/clauses" element={<AdminContractClauses />} />
      <Route path="/admin/dashboard-settings" element={<AdminDashboardSettings />} />
      <Route path="/admin/print-settings" element={<AdminPrintSettings />} />
      <Route path="/admin/barcode-settings" element={<AdminBarcodeSettings />} />
      <Route path="/admin/barcode-statuses" element={<AdminBarcodeStatuses />} />
      <Route path="/admin/whatsapp-templates" element={<AdminWhatsAppTemplates />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="/admin/projects" element={<AdminProjects />} />
      <Route path="/admin/property-access" element={<AdminPropertyAccess />} />
      <Route path="/admin/property-labels" element={<AdminPropertyLabels />} />
      <Route path="/admin/project-categories" element={<AdminProjectCategories />} />
      <Route path="/admin/sale-categories" element={<AdminSaleCategories />} />
      <Route path="/admin/sale-contract-clauses" element={<AdminSaleContractClauses />} />
      <Route path="/admin/property-status-colors" element={<AdminPropertyStatusColors />} />
      <Route path="/admin/property-purposes" element={<AdminPropertyPurposes />} />
      <Route path="/admin/advertisements" element={<AdminAdvertisements />} />
      <Route path="/admin/employees" element={<AdminEmployees />} />
      <Route path="/admin/task-colors" element={<AdminTaskColors />} />
      <Route path="/admin/groups" element={<AdminGroups />} />
      <Route path="/admin/departments" element={<AdminDepartments />} />
      <Route path="/employee-goals" element={<EmployeeGoals />} />
      <Route path="/employee-permissions" element={<EmployeePermissions />} />
      <Route path="/organization-structure" element={<OrganizationStructure />} />
      <Route path="/admin/employees/profile" element={<EmployeeProfile />} />
      <Route path="/employee-tasks" element={<EmployeeTasks />} />
      <Route path="/group-tasks/:groupId" element={<GroupTasks />} />
      <Route path="/hr-reports" element={<HrReports />} />
      <Route path="/projects-view" element={<ProjectsView />} />
      <Route path="/sales" element={<SalesView />} />
      <Route path="/sale-contracts" element={<SaleContracts />} />
      <Route path="/sale-invoices" element={<SaleInvoices />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/profile" element={<UserProfile />} />
      <Route path="/backup" element={<Backup />} />
      <Route path="/admin/translations" element={<AdminTranslations />} />
      <Route path="/admin/permission-approvers" element={<AdminPermissionApprovers />} />
      <Route path="/admin/currencies" element={<AdminCurrencies />} />
      <Route path="/admin/numbering-settings" element={<AdminNumberingSettings />} />
      <Route path="/finance" element={<FinanceDepartment />} />
      <Route path="/crm" element={<CRM />} />
      <Route path="/admin/crm-settings" element={<AdminCRMSettings />} />
      <Route path="/commissions" element={<Commissions />} />
      </Route>
      <Route path="/task-view" element={<TaskPublicView />} />
      <Route path="/barcode-view" element={<BarcodeView />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  const isPublicPage = typeof window !== 'undefined' && (window.location.pathname === '/barcode-view' || window.location.pathname === '/task-view');

  if (isPublicPage) {
    return (
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/task-view" element={<TaskPublicView />} />
            <Route path="/barcode-view" element={<BarcodeView />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    );
  }

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <LanguageProvider>
        <BranchProvider>
        <Router>
          <AuthenticatedApp />
        </Router>
        </BranchProvider>
        </LanguageProvider>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
