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
import type { QuotationData, QuotationStatus } from "@/types/quotation";

// Extended sample data
const allQuotations: QuotationData[] = [
  {
    id: "Q-2024-001",
    insuredName: "PT Maju Bersama",
    insuredAddress: "Jl. Sudirman No. 123, Jakarta",
    startDate: new Date("2024-02-01"),
    endDate: new Date("2025-02-01"),
    benefits: { inPatient: true, outPatient: true, dental: false, maternity: false },
    insuredGroups: [{ id: "1", planName: "Executive", numberOfMembers: 10 }],
    status: "approved",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
    createdBy: "John Doe",
    version: 1,
  },
  {
    id: "Q-2024-002",
    insuredName: "CV Sentosa Abadi",
    insuredAddress: "Jl. Gatot Subroto No. 45, Bandung",
    startDate: new Date("2024-03-01"),
    endDate: new Date("2025-03-01"),
    benefits: { inPatient: true, outPatient: true, dental: true, maternity: true },
    insuredGroups: [
      { id: "1", planName: "Executive", numberOfMembers: 5 },
      { id: "2", planName: "Staff", numberOfMembers: 25 },
    ],
    status: "review",
    createdAt: new Date("2024-01-18"),
    updatedAt: new Date("2024-01-18"),
    createdBy: "Jane Smith",
    version: 1,
  },
  {
    id: "Q-2024-003",
    insuredName: "PT Teknologi Nusantara",
    insuredAddress: "Jl. HR Rasuna Said Kav. 5, Jakarta",
    startDate: new Date("2024-04-01"),
    endDate: new Date("2025-04-01"),
    benefits: { inPatient: true, outPatient: false, dental: false, maternity: false },
    insuredGroups: [{ id: "1", planName: "All Staff", numberOfMembers: 50 }],
    status: "draft",
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
    createdBy: "John Doe",
    version: 1,
  },
  {
    id: "Q-2024-004",
    insuredName: "PT Global Prima",
    insuredAddress: "Jl. Thamrin No. 88, Jakarta",
    startDate: new Date("2024-01-15"),
    endDate: new Date("2025-01-15"),
    benefits: { inPatient: true, outPatient: true, dental: true, maternity: false },
    insuredGroups: [
      { id: "1", planName: "Director", numberOfMembers: 3 },
      { id: "2", planName: "Manager", numberOfMembers: 12 },
      { id: "3", planName: "Staff", numberOfMembers: 85 },
    ],
    status: "locked",
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-10"),
    createdBy: "Jane Smith",
    version: 2,
  },
  {
    id: "Q-2024-005",
    insuredName: "PT Karya Mandiri",
    insuredAddress: "Jl. Asia Afrika No. 12, Bandung",
    startDate: new Date("2024-05-01"),
    endDate: new Date("2025-05-01"),
    benefits: { inPatient: true, outPatient: true, dental: false, maternity: true },
    insuredGroups: [
      { id: "1", planName: "Management", numberOfMembers: 8 },
      { id: "2", planName: "Staff", numberOfMembers: 42 },
    ],
    status: "draft",
    createdAt: new Date("2024-01-22"),
    updatedAt: new Date("2024-01-22"),
    createdBy: "John Doe",
    version: 1,
  },
  {
    id: "Q-2024-006",
    insuredName: "CV Sukses Jaya",
    insuredAddress: "Jl. Pemuda No. 56, Surabaya",
    startDate: new Date("2024-06-01"),
    endDate: new Date("2025-06-01"),
    benefits: { inPatient: true, outPatient: false, dental: false, maternity: false },
    insuredGroups: [{ id: "1", planName: "All Employees", numberOfMembers: 15 }],
    status: "review",
    createdAt: new Date("2024-01-23"),
    updatedAt: new Date("2024-01-23"),
    createdBy: "Jane Smith",
    version: 1,
  },
];

export default function AllQuotations() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuotationStatus | "all">("all");

  const filteredQuotations = allQuotations.filter((q) => {
    const matchesSearch =
      q.insuredName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getTotalMembers = (groups: QuotationData["insuredGroups"]) => {
    return groups.reduce((sum, g) => sum + g.numberOfMembers, 0);
  };

  const getBenefitsSummary = (benefits: QuotationData["benefits"]) => {
    const active = [];
    if (benefits.inPatient) active.push("IP");
    if (benefits.outPatient) active.push("OP");
    if (benefits.dental) active.push("D");
    if (benefits.maternity) active.push("M");
    return active.join(", ");
  };

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
              <SelectItem value="review">In Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
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
            Showing {filteredQuotations.length} of {allQuotations.length} quotations
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
                <th>Members</th>
                <th>Status</th>
                <th>Created By</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.map((quotation) => (
                <tr key={quotation.id}>
                  <td className="font-medium text-primary">{quotation.id}</td>
                  <td>
                    <div>
                      <p className="font-medium">{quotation.insuredName}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {quotation.insuredAddress}
                      </p>
                    </div>
                  </td>
                  <td className="text-sm">
                    <div>
                      <p>{format(quotation.startDate, "MMM d, yyyy")}</p>
                      <p className="text-muted-foreground">
                        to {format(quotation.endDate, "MMM d, yyyy")}
                      </p>
                    </div>
                  </td>
                  <td>
                    <span className="text-sm">{getBenefitsSummary(quotation.benefits)}</span>
                  </td>
                  <td>{getTotalMembers(quotation.insuredGroups)}</td>
                  <td>
                    <StatusBadge status={quotation.status} />
                  </td>
                  <td className="text-sm text-muted-foreground">{quotation.createdBy}</td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={quotation.status === "locked"}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>Download PDF</DropdownMenuItem>
                        <DropdownMenuItem>View Audit Log</DropdownMenuItem>
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
