import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Eye, MoreHorizontal, ArrowRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/quotation/StatusBadge";
import { ApprovalInfo } from "@/components/quotation/ApprovalInfo";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useInsuranceCompanies } from "@/hooks/useInsuranceCompanies";

export function RecentQuotations() {
  const { data: insuranceCompanies } = useInsuranceCompanies();
  
  const { data: quotationsData, isLoading } = useQuery({
    queryKey: ["recent_quotations_with_approvals"],
    queryFn: async () => {
      const { data: quotations, error } = await supabase
        .from("quotations")
        .select(`
          *,
          creator:profiles!quotations_created_by_fkey(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      const quotationIds = quotations.map(q => q.id);
      const { data: approvals, error: approvalsError } = await supabase
        .from("approval_history")
        .select(`
          *,
          approver:profiles!approval_history_approved_by_fkey(full_name)
        `)
        .in("quotation_id", quotationIds);
      
      if (approvalsError) throw approvalsError;
      
      return quotations.map(quotation => {
        const quotationApprovals = approvals?.filter(
          a => a.quotation_id === quotation.id
        ) || [];
        
        const pialangApproval = quotationApprovals.find(
          a => a.approval_role === "tenaga_pialang" && a.status === "approved"
        );
        const ahliApproval = quotationApprovals.find(
          a => a.approval_role === "tenaga_ahli" && a.status === "approved"
        );
        
        return {
          ...quotation,
          pialangApproval,
          ahliApproval,
        };
      });
    },
  });

  const getTotalMembers = (groups: any[]) => {
    if (!groups) return 0;
    return groups.reduce((sum: number, g: any) => {
      const m = g.members || {};
      return sum + (m.male0to59 || 0) + (m.female0to59 || 0) + (m.child0to59 || 0) + (m.male60to64 || 0) + (m.female60to64 || 0);
    }, 0);
  };

  const getBenefitsSummary = (benefits: any) => {
    if (!benefits) return "";
    const active = [];
    if (benefits.inPatient) active.push("IP");
    if (benefits.outPatient) active.push("OP");
    if (benefits.dental) active.push("D");
    if (benefits.maternity) active.push("M");
    return active.join(", ");
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border shadow-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!quotationsData || quotationsData.length === 0) {
    return (
      <div className="bg-card rounded-xl border shadow-card p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No Quotations Yet</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Create your first quotation to get started
        </p>
        <Link to="/quotation/new">
          <Button>Create Quotation</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-card overflow-hidden">
      <div className="p-4 md:p-6 border-b bg-gradient-to-r from-muted/50 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Recent Quotations</h2>
            <p className="text-sm text-muted-foreground hidden sm:block">Latest activity overview</p>
          </div>
          <Link to="/quotations">
            <Button variant="ghost" size="sm" className="group">
              View All
              <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block lg:hidden divide-y">
        {quotationsData.map((quotation) => (
          <div key={quotation.id} className="p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0 flex-1">
                <Link 
                  to={`/quotation/${quotation.id}`}
                  className="font-semibold text-primary hover:underline text-sm"
                >
                  {quotation.quotation_number}
                </Link>
                <p className="font-medium text-foreground truncate">{quotation.insured_name}</p>
              </div>
              <StatusBadge status={quotation.status} />
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground mb-3">
              <span>{getTotalMembers(quotation.insured_groups as any[])} members</span>
              <span>{getBenefitsSummary(quotation.benefits)}</span>
              <span>{format(new Date(quotation.created_at), "MMM d, yyyy")}</span>
            </div>

            <div className="flex items-center justify-between">
              <ApprovalInfo
                pialangApproval={quotation.pialangApproval}
                ahliApproval={quotation.ahliApproval}
                status={quotation.status}
                compact
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem asChild>
                    <Link to={`/quotation/${quotation.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={`/quotation/edit/${quotation.id}`}>Edit</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>Download PDF</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Quote ID</th>
              <th>Insured Name</th>
              <th>Benefits</th>
              <th>Members</th>
              <th>Status</th>
              <th>Approvals</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {quotationsData.map((quotation) => (
              <tr key={quotation.id} className="group">
                <td className="font-medium text-primary">{quotation.quotation_number}</td>
                <td>
                  <div>
                    <p className="font-medium">{quotation.insured_name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {quotation.insured_address}
                    </p>
                  </div>
                </td>
                <td>
                  <span className="text-sm">{getBenefitsSummary(quotation.benefits)}</span>
                </td>
                <td>{getTotalMembers(quotation.insured_groups as any[])}</td>
                <td>
                  <StatusBadge status={quotation.status} />
                </td>
                <td>
                  <ApprovalInfo
                    pialangApproval={quotation.pialangApproval}
                    ahliApproval={quotation.ahliApproval}
                    status={quotation.status}
                    compact
                  />
                </td>
                <td className="text-muted-foreground">
                  {format(new Date(quotation.created_at), "MMM d, yyyy")}
                </td>
                <td>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem asChild>
                        <Link to={`/quotation/${quotation.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/quotation/edit/${quotation.id}`}>Edit</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>Download PDF</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
