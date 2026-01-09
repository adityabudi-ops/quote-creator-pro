import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Edit, Download, FileText, Users, Calendar, Shield, Building2, ClipboardCheck, Clock, User, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/quotation/StatusBadge";
import { ApprovalInfo } from "@/components/quotation/ApprovalInfo";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApprovalHistory, getApprovalByRole } from "@/hooks/useApprovalHistory";
import { useInsuranceCompanies } from "@/hooks/useInsuranceCompanies";
import type { Database } from "@/integrations/supabase/types";

type QuotationStatus = Database["public"]["Enums"]["quotation_status"];

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
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20"></div>
          <p className="text-muted-foreground">Loading quotation...</p>
        </div>
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
    // Only count In-Patient (IP) groups for total member count
    return groups
      .filter(g => g.planName?.startsWith("IP"))
      .reduce((sum, g) => {
        const m = g.members || {};
        return sum + (m.male0to59 || 0) + (m.female0to59 || 0) + (m.child0to59 || 0) + (m.male60to64 || 0) + (m.female60to64 || 0);
      }, 0);
  };

  // Quotations can only be edited when in draft or rejected status
  const editableStatuses: QuotationStatus[] = ["draft", "rejected"];
  const canEdit = editableStatuses.includes(quotation.status);
  
  const benefits = quotation.benefits as any || {};
  const insuredGroups = quotation.insured_groups as any[] || [];
  
  // Group insured groups by benefit type
  const ipGroups = insuredGroups.filter(g => g.planName?.startsWith("IP"));
  const opGroups = insuredGroups.filter(g => g.planName?.startsWith("OP"));
  const deGroups = insuredGroups.filter(g => g.planName?.startsWith("DE"));
  const maGroups = insuredGroups.filter(g => g.planName?.startsWith("MA"));
  
  const pialangApproval = approvals ? getApprovalByRole(approvals, "tenaga_pialang") : null;
  const ahliApproval = approvals ? getApprovalByRole(approvals, "tenaga_ahli") : null;

  const getInsuranceCompanyName = (code: string) => {
    const company = insuranceCompanies?.find(c => c.code === code);
    return company?.name || code.toUpperCase();
  };

  const getGroupTotal = (group: any) => {
    const m = group.members || {};
    return (m.male0to59 || 0) + (m.female0to59 || 0) + (m.child0to59 || 0) + (m.male60to64 || 0) + (m.female60to64 || 0);
  };

  const BenefitGroupTable = ({ groups, title, colorClass }: { groups: any[], title: string, colorClass: string }) => {
    if (groups.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
          {title}
        </div>
        <div className="space-y-2">
          {groups.map((group, index) => (
            <div key={group.id || index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
              <span className="font-medium text-sm">{group.planName}</span>
              <span className="text-sm text-muted-foreground">{getGroupTotal(group)} members</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent p-6 md:p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOGM5Ljk0MSAwIDE4LTguMDU5IDE4LTE4cy04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link to="/quotations">
              <Button variant="ghost" size="icon" className="text-white/80 hover:text-white hover:bg-white/10 shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold">{quotation.quotation_number}</h1>
                <StatusBadge status={quotation.status} />
              </div>
              <p className="text-white/80 text-lg">{quotation.insured_name}</p>
              <p className="text-white/60 text-sm max-w-md">{quotation.insured_address}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 ml-12 md:ml-0">
            <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-white/20">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            {canEdit && (
              <Link to={`/quotation/edit/${quotation.id}`}>
                <Button className="bg-white text-primary hover:bg-white/90">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/20">
          <div className="text-center md:text-left">
            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Total Members</p>
            <p className="text-2xl font-bold">{getTotalMembers()}</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Policy Duration</p>
            <p className="text-2xl font-bold">12 <span className="text-base font-normal">months</span></p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Insurers</p>
            <p className="text-2xl font-bold">{quotation.insurance_companies?.length || 0}</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Version</p>
            <p className="text-2xl font-bold">v{quotation.version}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Policy Period Card */}
          <Card className="overflow-hidden border-0 shadow-card">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                Policy Period
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1 p-4 bg-muted/30 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Start Date</p>
                  <p className="text-xl font-semibold">{format(new Date(quotation.start_date), "dd MMM yyyy")}</p>
                </div>
                <div className="hidden md:flex items-center justify-center">
                  <div className="w-12 h-0.5 bg-gradient-to-r from-primary to-accent"></div>
                  <div className="w-3 h-3 rounded-full bg-accent"></div>
                </div>
                <div className="flex-1 p-4 bg-muted/30 rounded-xl text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">End Date</p>
                  <p className="text-xl font-semibold">{format(new Date(quotation.end_date), "dd MMM yyyy")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefits Coverage Card */}
          <Card className="overflow-hidden border-0 shadow-card">
            <CardHeader className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-emerald-500/20">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                Benefits Coverage
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: 'inPatient', label: 'In-Patient', icon: '🏥' },
                  { key: 'outPatient', label: 'Out-Patient', icon: '👨‍⚕️' },
                  { key: 'dental', label: 'Dental', icon: '🦷' },
                  { key: 'maternity', label: 'Maternity', icon: '👶' },
                ].map(benefit => (
                  <div 
                    key={benefit.key}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      benefits[benefit.key] 
                        ? 'bg-primary/5 border-primary/30 shadow-sm' 
                        : 'bg-muted/30 border-transparent opacity-50'
                    }`}
                  >
                    <div className="text-2xl mb-2">{benefit.icon}</div>
                    <p className={`font-medium text-sm ${benefits[benefit.key] ? 'text-primary' : 'text-muted-foreground'}`}>
                      {benefit.label}
                    </p>
                    <p className={`text-xs mt-1 ${benefits[benefit.key] ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                      {benefits[benefit.key] ? "✓ Included" : "Not included"}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Insured Groups Card */}
          <Card className="overflow-hidden border-0 shadow-card">
            <CardHeader className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-violet-500/20">
                  <Users className="w-5 h-5 text-violet-600" />
                </div>
                Insured Groups
                <span className="ml-auto px-3 py-1 text-sm font-semibold bg-primary/10 text-primary rounded-full">
                  {getTotalMembers()} total members
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <BenefitGroupTable 
                groups={ipGroups} 
                title="In-Patient" 
                colorClass="bg-blue-100 text-blue-700"
              />
              <BenefitGroupTable 
                groups={opGroups} 
                title="Out-Patient" 
                colorClass="bg-emerald-100 text-emerald-700"
              />
              <BenefitGroupTable 
                groups={deGroups} 
                title="Dental" 
                colorClass="bg-amber-100 text-amber-700"
              />
              <BenefitGroupTable 
                groups={maGroups} 
                title="Maternity" 
                colorClass="bg-pink-100 text-pink-700"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Insurance Companies Card */}
          <Card className="overflow-hidden border-0 shadow-card">
            <CardHeader className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Building2 className="w-5 h-5 text-amber-600" />
                </div>
                Insurance Companies
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {quotation.insurance_companies?.map((insurer: string) => (
                  <div
                    key={insurer}
                    className="p-3 bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-xl"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {getInsuranceCompanyName(insurer)}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase mt-0.5">{insurer}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Approval Status Card */}
          <Card className="overflow-hidden border-0 shadow-card">
            <CardHeader className="bg-gradient-to-r from-rose-500/10 to-pink-500/10 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-rose-500/20">
                  <ClipboardCheck className="w-5 h-5 text-rose-600" />
                </div>
                Approval Status
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ApprovalInfo
                pialangApproval={pialangApproval}
                ahliApproval={ahliApproval}
                status={quotation.status}
              />
            </CardContent>
          </Card>

          {/* Metadata Card */}
          <Card className="overflow-hidden border-0 shadow-card">
            <CardHeader className="bg-gradient-to-r from-slate-500/10 to-gray-500/10 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="p-2 rounded-lg bg-slate-500/20">
                  <FileText className="w-5 h-5 text-slate-600" />
                </div>
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created by</p>
                  <p className="text-sm font-medium">{quotation.creator?.full_name || "Unknown"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">{format(new Date(quotation.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last updated</p>
                  <p className="text-sm font-medium">{format(new Date(quotation.updated_at), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Version</p>
                  <p className="text-sm font-medium">v{quotation.version}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
