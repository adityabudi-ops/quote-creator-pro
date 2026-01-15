import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import NewQuotation from "./pages/NewQuotation";
import AllQuotations from "./pages/AllQuotations";
import QuotationDetails from "./pages/QuotationDetails";
import EditQuotation from "./pages/EditQuotation";
import AuditLog from "./pages/AuditLog";
import Login from "./pages/Login";
import Approvals from "./pages/Approvals";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import UserManagement from "./pages/admin/UserManagement";
import InsuranceCompanies from "./pages/admin/InsuranceCompanies";
import MasterDataManagement from "./pages/admin/MasterDataManagement";
import BenefitItemsManagement from "./pages/admin/BenefitItemsManagement";
import ScheduleTemplateManagement from "./pages/admin/ScheduleTemplateManagement";
import PricingManagement from "./pages/admin/PricingManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/quotation/new" element={<NewQuotation />} />
                <Route path="/quotation/:id" element={<QuotationDetails />} />
                <Route path="/quotation/edit/:id" element={<EditQuotation />} />
                <Route path="/quotations" element={<AllQuotations />} />
                <Route path="/approvals" element={<Approvals />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/audit-log" element={<AuditLog />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/insurance" element={<InsuranceCompanies />} />
                <Route path="/admin/benefits" element={<MasterDataManagement />} />
                <Route path="/admin/benefit-items" element={<BenefitItemsManagement />} />
                <Route path="/admin/schedule-templates" element={<ScheduleTemplateManagement />} />
                <Route path="/admin/pricing" element={<PricingManagement />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
