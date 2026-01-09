import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Edit, Download, FileText, Users, Calendar, Shield, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/quotation/StatusBadge";
import type { QuotationData } from "@/types/quotation";
import { INSURANCE_COMPANIES } from "@/types/quotation";

// Default member breakdown helper
const defaultMembers = {
  male0to59: 0,
  female0to59: 0,
  child0to59: 0,
  male60to64: 0,
  female60to64: 0,
};

// Mock data - in real app this would be fetched
const mockQuotations: Record<string, QuotationData> = {
  "Q-2024-001": {
    id: "Q-2024-001",
    insuredName: "PT Maju Bersama",
    insuredAddress: "Jl. Sudirman No. 123, Jakarta",
    startDate: new Date("2024-02-01"),
    endDate: new Date("2025-01-31"),
    benefitsOption: "inner_limit_all",
    insuranceCompanies: ["aca", "asm"],
    benefits: { inPatient: true, outPatient: true, dental: false, maternity: false },
    insuredGroups: [{ id: "1", planName: "IP 500", members: { ...defaultMembers, male0to59: 5, female0to59: 5 } }],
    status: "approved",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
    createdBy: "John Doe",
    version: 1,
  },
  "Q-2024-002": {
    id: "Q-2024-002",
    insuredName: "CV Sentosa Abadi",
    insuredAddress: "Jl. Gatot Subroto No. 45, Bandung",
    startDate: new Date("2024-03-01"),
    endDate: new Date("2025-02-28"),
    benefitsOption: "inner_limit_ip_ma_as_charge_op_de",
    insuranceCompanies: ["sompo"],
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
  "Q-2024-003": {
    id: "Q-2024-003",
    insuredName: "PT Teknologi Nusantara",
    insuredAddress: "Jl. HR Rasuna Said Kav. 5, Jakarta",
    startDate: new Date("2024-04-01"),
    endDate: new Date("2025-03-31"),
    benefitsOption: "semi_as_charge_ip_inner_limit_ma_as_charge_op_de",
    insuranceCompanies: ["aca"],
    benefits: { inPatient: true, outPatient: false, dental: false, maternity: false },
    insuredGroups: [{ id: "1", planName: "IP 1000", members: { ...defaultMembers, male0to59: 25, female0to59: 20, child0to59: 5 } }],
    status: "draft",
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
    createdBy: "John Doe",
    version: 1,
  },
};

export default function QuotationDetails() {
  const { id } = useParams<{ id: string }>();
  const quotation = id ? mockQuotations[id] : null;

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold text-foreground mb-2">Quotation Not Found</h1>
        <p className="text-muted-foreground mb-4">The quotation you're looking for doesn't exist.</p>
        <Link to="/quotations">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Quotations
          </Button>
        </Link>
      </div>
    );
  }

  const getTotalMembers = () => {
    return quotation.insuredGroups.reduce((sum, g) => {
      const m = g.members;
      return sum + m.male0to59 + m.female0to59 + m.child0to59 + m.male60to64 + m.female60to64;
    }, 0);
  };

  const canEdit = quotation.status !== "locked" && quotation.status !== "approved";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/quotations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{quotation.id}</h1>
              <StatusBadge status={quotation.status} />
            </div>
            <p className="text-muted-foreground">{quotation.insuredName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          {canEdit && (
            <Link to={`/quotation/edit/${quotation.id}`}>
              <Button>
                <Edit className="w-4 h-4 mr-2" />
                Edit Quotation
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Insured Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" />
              Insured Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Insured Name</p>
              <p className="font-medium">{quotation.insuredName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Insured Address</p>
              <p className="font-medium">{quotation.insuredAddress}</p>
            </div>
          </CardContent>
        </Card>

        {/* Policy Period */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="w-5 h-5 text-primary" />
              Policy Period
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Start Date</p>
                <p className="font-medium">{format(quotation.startDate, "MMMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">{format(quotation.endDate, "MMMM d, yyyy")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insurance Companies */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-primary" />
              Insurance Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {quotation.insuranceCompanies.map((insurer) => (
                <div
                  key={insurer}
                  className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg"
                >
                  <p className="text-sm font-medium text-primary">
                    {INSURANCE_COMPANIES[insurer]}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-primary" />
              Benefits Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg border ${quotation.benefits.inPatient ? 'bg-primary/10 border-primary/30' : 'bg-muted/50'}`}>
                <p className={`font-medium ${quotation.benefits.inPatient ? 'text-primary' : 'text-muted-foreground'}`}>
                  In-Patient
                </p>
                <p className="text-sm text-muted-foreground">
                  {quotation.benefits.inPatient ? "Included" : "Not included"}
                </p>
              </div>
              <div className={`p-3 rounded-lg border ${quotation.benefits.outPatient ? 'bg-primary/10 border-primary/30' : 'bg-muted/50'}`}>
                <p className={`font-medium ${quotation.benefits.outPatient ? 'text-primary' : 'text-muted-foreground'}`}>
                  Out-Patient
                </p>
                <p className="text-sm text-muted-foreground">
                  {quotation.benefits.outPatient ? "Included" : "Not included"}
                </p>
              </div>
              <div className={`p-3 rounded-lg border ${quotation.benefits.dental ? 'bg-primary/10 border-primary/30' : 'bg-muted/50'}`}>
                <p className={`font-medium ${quotation.benefits.dental ? 'text-primary' : 'text-muted-foreground'}`}>
                  Dental
                </p>
                <p className="text-sm text-muted-foreground">
                  {quotation.benefits.dental ? "Included" : "Not included"}
                </p>
              </div>
              <div className={`p-3 rounded-lg border ${quotation.benefits.maternity ? 'bg-primary/10 border-primary/30' : 'bg-muted/50'}`}>
                <p className={`font-medium ${quotation.benefits.maternity ? 'text-primary' : 'text-muted-foreground'}`}>
                  Maternity
                </p>
                <p className="text-sm text-muted-foreground">
                  {quotation.benefits.maternity ? "Included" : "Not included"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insured Groups */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5 text-primary" />
              Insured Groups
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                Total: {getTotalMembers()} members
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-sm font-medium text-muted-foreground">Plan Name</th>
                    <th className="text-right py-2 text-sm font-medium text-muted-foreground">Members</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.insuredGroups.map((group) => {
                    const total = group.members.male0to59 + group.members.female0to59 + group.members.child0to59 + group.members.male60to64 + group.members.female60to64;
                    return (
                      <tr key={group.id} className="border-b last:border-0">
                        <td className="py-3 font-medium">{group.planName}</td>
                        <td className="py-3 text-right">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Created by:</span>{" "}
              <span className="font-medium">{quotation.createdBy}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>{" "}
              <span className="font-medium">{format(quotation.createdAt, "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Last updated:</span>{" "}
              <span className="font-medium">{format(quotation.updatedAt, "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Version:</span>{" "}
              <span className="font-medium">{quotation.version}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
