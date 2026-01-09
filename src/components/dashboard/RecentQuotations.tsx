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
import type { QuotationData } from "@/types/quotation";

// Default member breakdown helper
const defaultMembers = {
  male0to59: 0,
  female0to59: 0,
  child0to59: 0,
  male60to64: 0,
  female60to64: 0,
};

// Sample data
const sampleQuotations: QuotationData[] = [
  {
    id: "Q-2024-001",
    insuredName: "PT Maju Bersama",
    insuredAddress: "Jl. Sudirman No. 123, Jakarta",
    startDate: new Date("2024-02-01"),
    endDate: new Date("2025-02-01"),
    benefits: { inPatient: true, outPatient: true, dental: false, maternity: false },
    insuredGroups: [{ id: "1", planName: "IP 500", members: { ...defaultMembers, male0to59: 5, female0to59: 5 } }],
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
      { id: "1", planName: "IP 700", members: { ...defaultMembers, male0to59: 3, female0to59: 2 } },
      { id: "2", planName: "IP 500", members: { ...defaultMembers, male0to59: 10, female0to59: 10, child0to59: 5 } },
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
    insuredGroups: [{ id: "1", planName: "IP 1000", members: { ...defaultMembers, male0to59: 25, female0to59: 20, child0to59: 5 } }],
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
      { id: "1", planName: "IP 2000", members: { ...defaultMembers, male0to59: 2, female0to59: 1 } },
      { id: "2", planName: "IP 1000", members: { ...defaultMembers, male0to59: 6, female0to59: 6 } },
      { id: "3", planName: "IP 500", members: { ...defaultMembers, male0to59: 40, female0to59: 35, child0to59: 10 } },
    ],
    status: "locked",
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-10"),
    createdBy: "Jane Smith",
    version: 2,
  },
];

export function RecentQuotations() {
  const getTotalMembers = (groups: QuotationData["insuredGroups"]) => {
    return groups.reduce((sum, g) => {
      const m = g.members;
      return sum + m.male0to59 + m.female0to59 + m.child0to59 + m.male60to64 + m.female60to64;
    }, 0);
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
              <th>Benefits</th>
              <th>Members</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sampleQuotations.map((quotation) => (
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
                <td>
                  <span className="text-sm">{getBenefitsSummary(quotation.benefits)}</span>
                </td>
                <td>{getTotalMembers(quotation.insuredGroups)}</td>
                <td>
                  <StatusBadge status={quotation.status} />
                </td>
                <td className="text-muted-foreground">
                  {format(quotation.createdAt, "MMM d, yyyy")}
                </td>
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
                      <DropdownMenuItem>Edit</DropdownMenuItem>
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
