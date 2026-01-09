import { Link } from "react-router-dom";
import { FileText, FilePlus, CheckCircle, Clock, Lock, Sparkles } from "lucide-react";
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

  // Fetch real stats
  const { data: stats } = useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      const [totalRes, pendingRes, approvedRes, lockedRes] = await Promise.all([
        supabase.from("quotations").select("id", { count: "exact", head: true }),
        supabase.from("quotations").select("id", { count: "exact", head: true }).in("status", ["pending_pialang", "pending_ahli"]),
        supabase.from("quotations").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("quotations").select("id", { count: "exact", head: true }).eq("status", "locked"),
      ]);
      
      return {
        total: totalRes.count || 0,
        pending: pendingRes.count || 0,
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

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-[hsl(202,92%,20%)] p-6 md:p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              <span className="text-sm text-primary-foreground/80">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {greeting()}, {profile?.full_name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="text-primary-foreground/80 text-sm md:text-base">
              {profile?.role && ROLE_LABELS[profile.role]} • SME Employee Benefits Quotation System
            </p>
          </div>
          <Link to="/quotation/new" className="shrink-0">
            <Button 
              size="lg" 
              className="w-full md:w-auto bg-white text-primary hover:bg-white/90 shadow-lg"
            >
              <FilePlus className="w-5 h-5 mr-2" />
              New Quotation
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatsCard
          title="Total Quotations"
          value={stats?.total || 0}
          icon={<FileText className="w-5 h-5 md:w-6 md:h-6" />}
          description="All time"
          variant="primary"
        />
        <StatsCard
          title="Pending Review"
          value={stats?.pending || 0}
          icon={<Clock className="w-5 h-5 md:w-6 md:h-6" />}
          description="Awaiting approval"
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
        <Link to="/approvals" className="block">
          <div className="bg-card border rounded-xl p-4 text-center hover:bg-muted/50 transition-colors">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-primary" />
            <span className="text-sm font-medium">Approvals</span>
          </div>
        </Link>
      </div>

      {/* Recent Quotations */}
      <RecentQuotations />
    </div>
  );
}
