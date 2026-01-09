import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Edit, Download, FileText, Users, Calendar, Shield, Building2, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/quotation/StatusBadge";
import { ApprovalInfo } from "@/components/quotation/ApprovalInfo";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApprovalHistory, getApprovalByRole } from "@/hooks/useApprovalHistory";
import { useInsuranceCompanies } from "@/hooks/useInsuranceCompanies";

export default function QuotationDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: insuranceCompanies } = useInsuranceCompanies();
  
  const { data: quotation, isLoading } = useQuery({
    queryKey: ["quotation", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("quotations")
        .select(`
          *,
          creator:profiles!quotations_created_by_fkey(full_name)
        `)
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: approvals } = useApprovalHistory(id);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Loading quotation...</p>
      </div>
    );
  }

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
    const groups = quotation.insured_groups as any[];
    if (!groups) return 0;
    return groups.reduce((sum, g) => {
      const m = g.members || {};
      return sum + (m.male0to59 || 0) + (m.female0to59 || 0) + (m.child0to59 || 0) + (m.male60to64 || 0) + (m.female60to64 || 0);
    }, 0);
  };

  const canEdit = quotation.status !== "locked" && quotation.status !== "approved";
  
  const benefits = quotation.benefits as any || {};
  const insuredGroups = quotation.insured_groups as any[] || [];
  
  const pialangApproval = approvals ? getApprovalByRole(approvals, "tenaga_pialang") : null;
  const ahliApproval = approvals ? getApprovalByRole(approvals, "tenaga_ahli") : null;

  const getInsuranceCompanyName = (code: string) => {
    const company = insuranceCompanies?.find(c => c.code === code);
    return company?.name || code.toUpperCase();
  };

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
              <h1 className="text-2xl font-bold text-foreground">{quotation.quotation_number}</h1>
              <StatusBadge status={quotation.status} />
            </div>
            <p className="text-muted-foreground">{quotation.insured_name}</p>
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
              <p className="font-medium">{quotation.insured_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Insured Address</p>
              <p className="font-medium">{quotation.insured_address}</p>
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
                <p className="font-medium">{format(new Date(quotation.start_date), "MMMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">End Date</p>
                <p className="font-medium">{format(new Date(quotation.end_date), "MMMM d, yyyy")}</p>
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
              {quotation.insurance_companies?.map((insurer: string) => (
                <div
                  key={insurer}
                  className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg"
                >
                  <p className="text-sm font-medium text-primary">
                    {getInsuranceCompanyName(insurer)}
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
              <div className={`p-3 rounded-lg border ${benefits.inPatient ? 'bg-primary/10 border-primary/30' : 'bg-muted/50'}`}>
                <p className={`font-medium ${benefits.inPatient ? 'text-primary' : 'text-muted-foreground'}`}>
                  In-Patient
                </p>
                <p className="text-sm text-muted-foreground">
                  {benefits.inPatient ? "Included" : "Not included"}
                </p>
              </div>
              <div className={`p-3 rounded-lg border ${benefits.outPatient ? 'bg-primary/10 border-primary/30' : 'bg-muted/50'}`}>
                <p className={`font-medium ${benefits.outPatient ? 'text-primary' : 'text-muted-foreground'}`}>
                  Out-Patient
                </p>
                <p className="text-sm text-muted-foreground">
                  {benefits.outPatient ? "Included" : "Not included"}
                </p>
              </div>
              <div className={`p-3 rounded-lg border ${benefits.dental ? 'bg-primary/10 border-primary/30' : 'bg-muted/50'}`}>
                <p className={`font-medium ${benefits.dental ? 'text-primary' : 'text-muted-foreground'}`}>
                  Dental
                </p>
                <p className="text-sm text-muted-foreground">
                  {benefits.dental ? "Included" : "Not included"}
                </p>
              </div>
              <div className={`p-3 rounded-lg border ${benefits.maternity ? 'bg-primary/10 border-primary/30' : 'bg-muted/50'}`}>
                <p className={`font-medium ${benefits.maternity ? 'text-primary' : 'text-muted-foreground'}`}>
                  Maternity
                </p>
                <p className="text-sm text-muted-foreground">
                  {benefits.maternity ? "Included" : "Not included"}
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
                  {insuredGroups.map((group, index) => {
                    const m = group.members || {};
                    const total = (m.male0to59 || 0) + (m.female0to59 || 0) + (m.child0to59 || 0) + (m.male60to64 || 0) + (m.female60to64 || 0);
                    return (
                      <tr key={group.id || index} className="border-b last:border-0">
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

        {/* Approval Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              Approval Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ApprovalInfo
              pialangApproval={pialangApproval}
              ahliApproval={ahliApproval}
              status={quotation.status}
            />
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Created by:</span>{" "}
              <span className="font-medium">{quotation.creator?.full_name || "Unknown"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Created:</span>{" "}
              <span className="font-medium">{format(new Date(quotation.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Last updated:</span>{" "}
              <span className="font-medium">{format(new Date(quotation.updated_at), "MMM d, yyyy 'at' h:mm a")}</span>
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
