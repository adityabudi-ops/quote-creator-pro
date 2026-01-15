import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Edit, Download, FileText, Users, Calendar, Shield, Building2, ClipboardCheck, Clock, User, Hash, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/quotation/StatusBadge";
import { ApprovalInfo } from "@/components/quotation/ApprovalInfo";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useApprovalHistory, getApprovalByRole } from "@/hooks/useApprovalHistory";
import { useInsurers } from "@/hooks/useMasterData";
import { useQuotationPackages, useQuotationPremiums } from "@/hooks/useQuotationWorkflow";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type QuotationStatus = Database["public"]["Enums"]["quotation_status"];

const SECTION_LABELS: Record<string, string> = {
  IP: "In-Patient",
  OP: "Out-Patient",
  DE: "Dental",
  MA: "Maternity",
};

export default function QuotationDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: insurersList } = useInsurers(false);
  
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

  const { data: packages } = useQuotationPackages(id || "");
  const { data: premiums } = useQuotationPremiums(id || "");
  const { data: approvals } = useApprovalHistory(id);

  const getInsurerName = (code: string): string => {
    return insurersList?.find(i => i.insurer_code === code)?.insurer_name || code;
  };

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
    if (packages && packages.length > 0) {
      return packages.reduce((sum, pkg) => {
        const census = pkg.census as any[] || [];
        return sum + census.reduce((s, c) => s + (c.lives || 0), 0);
      }, 0);
    }
    // Fallback to legacy insured_groups
    const groups = quotation.insured_groups as any[];
    if (!groups) return 0;
    return groups
      .filter(g => g.planName?.startsWith("IP") || g.planName?.startsWith("Package"))
      .reduce((sum, g) => {
        const m = g.members || {};
        return sum + (m.male0to59 || 0) + (m.female0to59 || 0) + (m.child0to59 || 0) + (m.male60to64 || 0) + (m.female60to64 || 0);
      }, 0);
  };

  const editableStatuses: QuotationStatus[] = ["draft", "rejected"];
  const canEdit = editableStatuses.includes(quotation.status);
  
  const benefits = quotation.benefits as any || {};
  
  const pialangApproval = approvals ? getApprovalByRole(approvals, "tenaga_pialang") : null;
  const ahliApproval = approvals ? getApprovalByRole(approvals, "tenaga_ahli") : null;

  // Build tier mapping from packages data
  const buildTierMapping = () => {
    if (!packages || packages.length === 0) return null;

    const mapping: Record<string, Record<string, Record<string, { tierCode: string | null; status: string }>>> = {};
    
    packages.forEach(pkg => {
      const offers = pkg.insurer_offers as any[] || [];
      mapping[pkg.package_id] = {};
      
      offers.forEach(offer => {
        if (!mapping[pkg.package_id][offer.insurer_code]) {
          mapping[pkg.package_id][offer.insurer_code] = {};
        }
        mapping[pkg.package_id][offer.insurer_code][offer.section_code] = {
          tierCode: offer.offered_tier_code,
          status: offer.status,
        };
      });
    });

    return mapping;
  };

  const tierMapping = buildTierMapping();
  const selectedSections = Object.keys(benefits).filter(k => benefits[k]) as string[];
  const sectionCodes = selectedSections.map(s => {
    if (s === "inPatient") return "IP";
    if (s === "outPatient") return "OP";
    if (s === "dental") return "DE";
    if (s === "maternity") return "MA";
    return s;
  });

  // Get requested tiers from first package
  const getRequestedTiers = () => {
    if (!packages || packages.length === 0) return {};
    const firstPkg = packages[0];
    const requested = firstPkg.requested_tiers as any[] || [];
    return Object.fromEntries(requested.map(rt => [rt.section_code, rt.requested_tier_code]));
  };

  const requestedTiers = getRequestedTiers();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-6 md:p-8 text-white">
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
            <p className="text-white/60 text-xs uppercase tracking-wider mb-1">Packages</p>
            <p className="text-2xl font-bold">{packages?.length || 1}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tier Mapping Card - NEW */}
          {tierMapping && Object.keys(tierMapping).length > 0 && (
            <Card className="overflow-hidden border-0 shadow-card">
              <CardHeader className="bg-indigo-500/10 border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 rounded-lg bg-indigo-500/20">
                    <Layers className="w-5 h-5 text-indigo-600" />
                  </div>
                  Tier Mapping by Insurer
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    Shows offered tier per insurer per benefit
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {packages?.map(pkg => (
                  <div key={pkg.package_id} className="mb-6 last:mb-0">
                    <h4 className="font-semibold mb-3">{pkg.package_name}</h4>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Benefit</TableHead>
                            <TableHead className="w-[80px]">Requested</TableHead>
                            {quotation.insurance_companies?.map((code: string) => (
                              <TableHead key={code} className="text-center min-w-[100px]">
                                {getInsurerName(code)}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sectionCodes.map(sectionCode => {
                            const requested = requestedTiers[sectionCode];
                            return (
                              <TableRow key={sectionCode}>
                                <TableCell className="font-medium">
                                  {SECTION_LABELS[sectionCode] || sectionCode}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {requested || "—"}
                                </TableCell>
                                {quotation.insurance_companies?.map((insurerCode: string) => {
                                  const offer = tierMapping[pkg.package_id]?.[insurerCode]?.[sectionCode];
                                  const isDifferent = requested && offer?.tierCode && offer.tierCode !== requested;
                                  
                                  return (
                                    <TableCell key={insurerCode} className="text-center">
                                      {offer?.status === "QUOTED" ? (
                                        <Badge 
                                          variant={isDifferent ? "secondary" : "default"}
                                          className={cn(
                                            "font-mono text-xs",
                                            isDifferent && "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                          )}
                                        >
                                          {offer.tierCode}
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-muted-foreground text-xs">
                                          N/A
                                        </Badge>
                                      )}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}

                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Badge className="text-xs">IP1500</Badge>
                    <span className="text-muted-foreground">Matches requested</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100 text-amber-800 text-xs">IP1000</Badge>
                    <span className="text-muted-foreground">Alternative offered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-muted-foreground text-xs">N/A</Badge>
                    <span className="text-muted-foreground">Not available</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Premium Comparison Card - NEW */}
          {premiums && premiums.overalls && premiums.overalls.length > 0 && (
            <Card className="overflow-hidden border-0 shadow-card">
              <CardHeader className="bg-green-500/10 border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  Annual Premium Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Insurer</TableHead>
                        <TableHead className="text-right">Gross Premium</TableHead>
                        <TableHead className="text-right">Fees & Tax</TableHead>
                        <TableHead className="text-right">Grand Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {premiums.overalls.map((overall: any) => (
                        <TableRow key={overall.insurer_code}>
                          <TableCell className="font-medium">
                            {getInsurerName(overall.insurer_code)}
                          </TableCell>
                          <TableCell className="text-right">
                            Rp {overall.gross_total_all_packages?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            Rp {((overall.admin_fee || 0) + (overall.stamp_duty || 0) + (overall.vat_amount || 0)).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-bold text-primary">
                            Rp {overall.grand_total?.toLocaleString() || 0}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Policy Period Card */}
          <Card className="overflow-hidden border-0 shadow-card">
            <CardHeader className="bg-blue-500/10 border-b">
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
                  <div className="w-12 h-0.5 bg-primary"></div>
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
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
            <CardHeader className="bg-emerald-500/10 border-b">
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

          {/* Packages Card */}
          {packages && packages.length > 0 && (
            <Card className="overflow-hidden border-0 shadow-card">
              <CardHeader className="bg-violet-500/10 border-b">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="p-2 rounded-lg bg-violet-500/20">
                    <Users className="w-5 h-5 text-violet-600" />
                  </div>
                  Packages & Census
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {packages.map(pkg => {
                  const census = pkg.census as any[] || [];
                  const totalLives = census.reduce((sum, c) => sum + (c.lives || 0), 0);
                  return (
                    <div key={pkg.package_id} className="p-4 bg-muted/30 rounded-xl">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold">{pkg.package_name}</h4>
                          {pkg.package_description && (
                            <p className="text-sm text-muted-foreground">{pkg.package_description}</p>
                          )}
                        </div>
                        <Badge variant="secondary">{totalLives} lives</Badge>
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-sm">
                        {census.map((c: any) => (
                          <div key={c.demographic} className="text-center">
                            <p className="text-xs text-muted-foreground">{c.demographic}</p>
                            <p className="font-medium">{c.lives}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Insurance Companies Card */}
          <Card className="overflow-hidden border-0 shadow-card">
            <CardHeader className="bg-amber-500/10 border-b">
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
                    className="p-3 bg-primary/5 border border-primary/20 rounded-xl"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {getInsurerName(insurer)}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase mt-0.5">{insurer}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Approval Status Card */}
          <Card className="overflow-hidden border-0 shadow-card">
            <CardHeader className="bg-rose-500/10 border-b">
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
            <CardHeader className="bg-slate-500/10 border-b">
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
