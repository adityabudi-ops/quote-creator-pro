import { Link } from "react-router-dom";
import { FileText, FilePlus, CheckCircle, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentQuotations } from "@/components/dashboard/RecentQuotations";

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            SME Employee Benefits Quotation Overview
          </p>
        </div>
        <Link to="/quotation/new">
          <Button>
            <FilePlus className="w-4 h-4 mr-2" />
            New Quotation
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Quotations"
          value={24}
          icon={<FileText className="w-6 h-6" />}
          description="This month"
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Pending Review"
          value={5}
          icon={<Clock className="w-6 h-6" />}
          description="Awaiting approval"
        />
        <StatsCard
          title="Approved"
          value={16}
          icon={<CheckCircle className="w-6 h-6" />}
          description="Ready for issuance"
        />
        <StatsCard
          title="Locked"
          value={3}
          icon={<Lock className="w-6 h-6" />}
          description="Finalized quotations"
        />
      </div>

      {/* Recent Quotations */}
      <RecentQuotations />
    </div>
  );
}
