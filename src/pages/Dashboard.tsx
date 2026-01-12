import { Link } from "react-router-dom";
import { FileText, FilePlus, CheckCircle, Clock, Lock, Sparkles, ClipboardCheck, Users, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentQuotations } from "@/components/dashboard/RecentQuotations";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ROLE_LABELS: Record<string, string> = {
  sales: "Account Executive",
  tenaga_pialang: "Tenaga Pialang",
  tenaga_ahli: "Tenaga Ahli",
  admin: "Admin",
};

export default function Dashboard() {
  const { profile } = useAuth();
  const userRole = profile?.role;
  const isAdmin = profile?.role === "admin" || profile?.is_admin === true;
  const isAdminOnly = profile?.role === "admin"; // Admin-only users can't create/approve
  const isApprover = userRole === "tenaga_pialang" || userRole === "tenaga_ahli";

  // Fetch real stats
  const { data: stats } = useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      const [totalRes, pendingPialangRes, pendingAhliRes, approvedRes, lockedRes] = await Promise.all([
        supabase.from("quotations").select("id", { count: "exact", head: true }),
        supabase.from("quotations").select("id", { count: "exact", head: true }).eq("status", "pending_pialang"),
        supabase.from("quotations").select("id", { count: "exact", head: true }).eq("status", "pending_ahli"),
        supabase.from("quotations").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("quotations").select("id", { count: "exact", head: true }).eq("status", "locked"),
      ]);
      
      return {
        total: totalRes.count || 0,
        pendingPialang: pendingPialangRes.count || 0,
        pendingAhli: pendingAhliRes.count || 0,
        pendingTotal: (pendingPialangRes.count || 0) + (pendingAhliRes.count || 0),
        approved: approvedRes.count || 0,
        locked: lockedRes.count || 0,
      };
    },
  });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  // Get role-specific pending count
  const getPendingForRole = () => {
    if (userRole === "tenaga_pialang") return stats?.pendingPialang || 0;
    if (userRole === "tenaga_ahli") return stats?.pendingAhli || 0;
    return stats?.pendingTotal || 0;
  };

  // Get role-specific pending description
  const getPendingDescription = () => {
    if (userRole === "tenaga_pialang") return "Awaiting your review";
    if (userRole === "tenaga_ahli") return "Awaiting your review";
    return "Awaiting approval";
  };

  // Note: isApprover is defined at the top of the component

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-[hsl(202,92%,20%)] p-5 md:p-8 text-primary-foreground shadow-xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
        
        {/* Decorative Circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl"></div>
        
        <div className="relative space-y-5">
          {/* Header Section */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-xs md:text-sm text-primary-foreground/90 font-medium">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight">
              {greeting()}, {profile?.full_name?.split(' ')[0] || 'User'}! 👋
            </h1>
            <p className="text-primary-foreground/70 text-sm md:text-base flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 text-xs md:text-sm font-medium">
                {profile?.role && ROLE_LABELS[profile.role]}
              </span>
              <span className="text-primary-foreground/50">•</span>
              <span className="text-xs md:text-sm">SME Employee Benefits Quotation System</span>
            </p>
          </div>
          
          {/* Action Buttons - Stacked on mobile, side by side on larger screens */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {/* Show Review Queue for approvers with enhanced styling */}
            {isApprover && !isAdminOnly && (
              <Link to="/approvals" className="w-full sm:w-auto">
                <Button 
                  size="lg" 
                  className="w-full bg-gradient-to-r from-accent to-[hsl(182,70%,50%)] text-primary-foreground hover:from-accent/90 hover:to-[hsl(182,70%,45%)] shadow-lg shadow-accent/30 font-semibold transition-all duration-300 hover:scale-[1.02] h-12"
                >
                  <ClipboardCheck className="w-5 h-5 mr-2 shrink-0" />
                  <span>Review Queue</span>
                  {getPendingForRole() > 0 && (
                    <span className="ml-2 px-2.5 py-1 text-xs bg-white text-primary rounded-full font-bold animate-pulse shadow-md">
                      {getPendingForRole()}
                    </span>
                  )}
                </Button>
              </Link>
            )}
            {/* Hide New Quotation button for admin-only users */}
            {!isAdminOnly && (
              <Link to="/quotation/new" className="w-full sm:w-auto">
                <Button 
                  size="lg" 
                  className="w-full bg-white text-primary hover:bg-white/90 shadow-lg font-semibold transition-all duration-300 hover:scale-[1.02] h-12"
                >
                  <FilePlus className="w-5 h-5 mr-2 shrink-0" />
                  <span>New Quotation</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards - Role-specific */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatsCard
          title="Total Quotations"
          value={stats?.total || 0}
          icon={<FileText className="w-5 h-5 md:w-6 md:h-6" />}
          description="All time"
          variant="primary"
        />
        <StatsCard
          title={isApprover ? "Pending Your Review" : "Pending Review"}
          value={getPendingForRole()}
          icon={<Clock className="w-5 h-5 md:w-6 md:h-6" />}
          description={getPendingDescription()}
          variant="warning"
        />
        <StatsCard
          title="Approved"
          value={stats?.approved || 0}
          icon={<CheckCircle className="w-5 h-5 md:w-6 md:h-6" />}
          description="Ready for issuance"
          variant="success"
        />
        <StatsCard
          title="Locked"
          value={stats?.locked || 0}
          icon={<Lock className="w-5 h-5 md:w-6 md:h-6" />}
          description="Finalized"
        />
      </div>

      {/* Quick Actions - Mobile Only */}
      <div className="grid grid-cols-2 gap-3 lg:hidden">
        <Link to="/quotations" className="block">
          <div className="bg-card border rounded-xl p-4 text-center hover:bg-muted/50 transition-colors">
            <FileText className="w-6 h-6 mx-auto mb-2 text-primary" />
            <span className="text-sm font-medium">All Quotations</span>
          </div>
        </Link>
        {/* Hide Approvals for admin-only users */}
        {!isAdminOnly && (
          <Link to="/approvals" className="block">
            <div className="bg-card border rounded-xl p-4 text-center hover:bg-muted/50 transition-colors relative">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-primary" />
              <span className="text-sm font-medium">Approvals</span>
              {isApprover && getPendingForRole() > 0 && (
                <span className="absolute top-2 right-2 w-5 h-5 text-xs bg-destructive text-white rounded-full flex items-center justify-center font-bold">
                  {getPendingForRole()}
                </span>
              )}
            </div>
          </Link>
        )}
        {isAdmin && (
          <>
            <Link to="/admin/users" className="block">
              <div className="bg-card border rounded-xl p-4 text-center hover:bg-muted/50 transition-colors">
                <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                <span className="text-sm font-medium">Users</span>
              </div>
            </Link>
            <Link to="/admin/insurance" className="block">
              <div className="bg-card border rounded-xl p-4 text-center hover:bg-muted/50 transition-colors">
                <Building2 className="w-6 h-6 mx-auto mb-2 text-primary" />
                <span className="text-sm font-medium">Insurance</span>
              </div>
            </Link>
          </>
        )}
      </div>

      {/* Recent Quotations */}
      <RecentQuotations />
    </div>
  );
}
