import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Search, Filter, Download, Eye, MoreHorizontal, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/quotation/StatusBadge";
import { ApprovalInfo } from "@/components/quotation/ApprovalInfo";
import { useQuotationsWithApprovals } from "@/hooks/useApprovalHistory";
import { useInsuranceCompanies } from "@/hooks/useInsuranceCompanies";
import type { Database } from "@/integrations/supabase/types";

type QuotationStatus = Database["public"]["Enums"]["quotation_status"];

export default function AllQuotations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | "all">("all");
  
  const { data: quotations, isLoading } = useQuotationsWithApprovals();
  const { data: insuranceCompanies } = useInsuranceCompanies();

  const filteredQuotations = quotations?.filter((q) => {
    const matchesSearch =
      q.insured_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.quotation_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

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

  const getInsuranceNames = (codes: string[]) => {
    if (!codes) return "";
    return codes.map(code => code.toUpperCase()).join(", ");
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">All Quotations</h1>
            <p className="text-muted-foreground">Loading quotations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Quotations</h1>
          <p className="text-muted-foreground">
            Manage and review all quotation requests
          </p>
        </div>
        <Link to="/quotation/new">
          <Button>
            <FilePlus className="w-4 h-4 mr-2" />
            New Quotation
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border p-4 shadow-card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by quote ID or insured name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as QuotationStatus | "all")}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_pialang">Pending Pialang</SelectItem>
              <SelectItem value="pending_ahli">Pending Ahli</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="locked">Locked</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="bg-card rounded-lg border shadow-card overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Showing {filteredQuotations.length} of {quotations?.length || 0} quotations
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quote ID</th>
                <th>Insured Name</th>
                <th>Policy Period</th>
                <th>Benefits</th>
                <th>Insurance</th>
                <th>Members</th>
                <th>Status</th>
                <th>Approvals</th>
                <th>Created By</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.map((quotation) => (
                <tr key={quotation.id}>
                  <td className="font-medium text-primary">{quotation.quotation_number}</td>
                  <td>
                    <div>
                      <p className="font-medium">{quotation.insured_name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {quotation.insured_address}
                      </p>
                    </div>
                  </td>
                  <td className="text-sm">
                    <div>
                      <p>{format(new Date(quotation.start_date), "MMM d, yyyy")}</p>
                      <p className="text-muted-foreground">
                        to {format(new Date(quotation.end_date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </td>
                  <td>
                    <span className="text-sm">{getBenefitsSummary(quotation.benefits)}</span>
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {quotation.insurance_companies?.map((ins: string) => (
                        <span 
                          key={ins} 
                          className="text-[10px] font-medium px-1.5 py-0.5 bg-secondary/50 text-secondary-foreground rounded"
                        >
                          {ins.toUpperCase()}
                        </span>
                      ))}
                    </div>
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
                  <td className="text-sm text-muted-foreground">
                    {quotation.creator?.full_name || "Unknown"}
                  </td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
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
                        <DropdownMenuItem 
                          disabled={quotation.status === "locked" || quotation.status === "approved"}
                          asChild={quotation.status !== "locked" && quotation.status !== "approved"}
                        >
                          {quotation.status !== "locked" && quotation.status !== "approved" ? (
                            <Link to={`/quotation/edit/${quotation.id}`}>Edit</Link>
                          ) : (
                            <span>Edit</span>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem>Download PDF</DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/audit-log?quotation=${quotation.id}`}>View Audit Log</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredQuotations.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <p>No quotations found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
