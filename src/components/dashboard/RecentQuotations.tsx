import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Eye, MoreHorizontal } from "lucide-react";
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
      // Fetch quotations
      const { data: quotations, error } = await supabase
        .from("quotations")
        .select(`
          *,
          creator:profiles!quotations_created_by_fkey(full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      
      // Fetch approval history for these quotations
      const quotationIds = quotations.map(q => q.id);
      const { data: approvals, error: approvalsError } = await supabase
        .from("approval_history")
        .select(`
          *,
          approver:profiles!approval_history_approved_by_fkey(full_name)
        `)
        .in("quotation_id", quotationIds);
      
      if (approvalsError) throw approvalsError;
      
      // Map approvals to quotations
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

  const getInsuranceNames = (codes: string[]) => {
    if (!insuranceCompanies) return codes.join(", ");
    return codes.map(code => {
      const company = insuranceCompanies.find(c => c.code === code);
      return company?.code.toUpperCase() || code.toUpperCase();
    }).join(", ");
  };

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
      <div className="bg-card rounded-lg border shadow-card p-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!quotationsData || quotationsData.length === 0) {
    return (
      <div className="bg-card rounded-lg border shadow-card p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Quotations</h2>
        <p className="text-muted-foreground">No quotations yet</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border shadow-card">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Quotations</h2>
          <Link to="/quotations">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Quote ID</th>
              <th>Insured Name</th>
              <th>Insurance</th>
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
              <tr key={quotation.id}>
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
                  <span className="text-sm">{getInsuranceNames(quotation.insurance_companies)}</span>
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
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
