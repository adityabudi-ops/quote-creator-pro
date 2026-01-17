import { useState, useEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { DemographicType } from "@/hooks/useMasterData";

interface Package {
  id: string;
  name: string;
  census: Record<DemographicType, number>;
}

interface RequestedTier {
  sectionCode: string;
  tierCode: string | null;
}

interface PackageRequestedTiers {
  packageId: string;
  tiers: RequestedTier[];
}

interface TierOffer {
  packageId: string;
  insurerCode: string;
  sectionCode: string;
  offeredTierCode: string | null;
  status: "QUOTED" | "NA" | "ERROR";
  notes?: string;
}

interface TierMappingPreviewProps {
  coverageRuleCode: string;
  insurerCodes: string[];
  packages: Package[];
  packageRequestedTiers: PackageRequestedTiers[];
  benefitSections: string[];
  policyStartDate: Date;
  insurerNames: Record<string, string>;
  onTierResolutionComplete?: (offers: TierOffer[]) => void;
}

const SECTION_LABELS: Record<string, string> = {
  IP: "In-Patient",
  OP: "Out-Patient",
  DE: "Dental",
  MA: "Maternity",
};

async function checkAvailability(
  coverageRuleCode: string,
  insurerCode: string,
  sectionCode: string,
  tierCode: string,
  effectiveDate: string
): Promise<{ templateAvailable: boolean; pricingAvailable: boolean }> {
  const [templateResult, pricingResult] = await Promise.all([
    supabase
      .from("schedule_template_section_header")
      .select("template_id")
      .eq("coverage_rule_code", coverageRuleCode)
      .eq("insurer_code", insurerCode)
      .eq("section_code", sectionCode)
      .eq("tier_code", tierCode)
      .eq("status", "ACTIVE")
      .lte("effective_date", effectiveDate)
      .limit(1),
    supabase
      .from("pricing_section_age")
      .select("effective_date")
      .eq("coverage_rule_code", coverageRuleCode)
      .eq("insurer_code", insurerCode)
      .eq("section_code", sectionCode)
      .eq("tier_code", tierCode)
      .lte("effective_date", effectiveDate)
      .limit(1),
  ]);

  return {
    templateAvailable: (templateResult.data?.length || 0) > 0,
    pricingAvailable: (pricingResult.data?.length || 0) > 0,
  };
}

async function findAlternativeTier(
  coverageRuleCode: string,
  insurerCode: string,
  sectionCode: string,
  effectiveDate: string
): Promise<string | null> {
  // Find any available tier with both template and pricing
  const { data: templates } = await supabase
    .from("schedule_template_section_header")
    .select("tier_code")
    .eq("coverage_rule_code", coverageRuleCode)
    .eq("insurer_code", insurerCode)
    .eq("section_code", sectionCode)
    .eq("status", "ACTIVE")
    .lte("effective_date", effectiveDate)
    .order("effective_date", { ascending: false });

  if (!templates || templates.length === 0) return null;

  for (const template of templates) {
    const { data: pricing } = await supabase
      .from("pricing_section_age")
      .select("effective_date")
      .eq("coverage_rule_code", coverageRuleCode)
      .eq("insurer_code", insurerCode)
      .eq("section_code", sectionCode)
      .eq("tier_code", template.tier_code)
      .lte("effective_date", effectiveDate)
      .limit(1);

    if (pricing && pricing.length > 0) {
      return template.tier_code;
    }
  }

  return null;
}

export function TierMappingPreview({
  coverageRuleCode,
  insurerCodes,
  packages,
  packageRequestedTiers,
  benefitSections,
  policyStartDate,
  insurerNames,
  onTierResolutionComplete,
}: TierMappingPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [tierOffers, setTierOffers] = useState<TierOffer[]>([]);

  useEffect(() => {
    const resolveTiers = async () => {
      setIsLoading(true);
      const offers: TierOffer[] = [];
      const effectiveDate = format(policyStartDate, "yyyy-MM-dd");

      for (const pkg of packages) {
        // Get requested tiers for this specific package
        const pkgRequestedTiers = packageRequestedTiers.find(p => p.packageId === pkg.id)?.tiers || [];

        for (const insurerCode of insurerCodes) {
          for (const sectionCode of benefitSections) {
            const requestedTier = pkgRequestedTiers.find(t => t.sectionCode === sectionCode);
            let offeredTierCode: string | null = null;
            let status: "QUOTED" | "NA" | "ERROR" = "QUOTED";
            let notes = "";

            if (requestedTier?.tierCode) {
              // Check if requested tier is available
              const availability = await checkAvailability(
                coverageRuleCode,
                insurerCode,
                sectionCode,
                requestedTier.tierCode,
                effectiveDate
              );

              if (availability.templateAvailable && availability.pricingAvailable) {
                offeredTierCode = requestedTier.tierCode;
              } else {
                // Try alternative
                const alternative = await findAlternativeTier(
                  coverageRuleCode,
                  insurerCode,
                  sectionCode,
                  effectiveDate
                );

                if (alternative) {
                  offeredTierCode = alternative;
                  notes = `Requested: ${requestedTier.tierCode}`;
                } else {
                  status = "NA";
                  notes = "No tier available";
                }
              }
            } else {
              // No tier requested - find any available
              const alternative = await findAlternativeTier(
                coverageRuleCode,
                insurerCode,
                sectionCode,
                effectiveDate
              );

              if (alternative) {
                offeredTierCode = alternative;
              } else {
                status = "NA";
              }
            }

            offers.push({
              packageId: pkg.id,
              insurerCode,
              sectionCode,
              offeredTierCode,
              status,
              notes,
            });
          }
        }
      }

      setTierOffers(offers);
      setIsLoading(false);
      onTierResolutionComplete?.(offers);
    };

    if (coverageRuleCode && insurerCodes.length > 0 && packages.length > 0 && benefitSections.length > 0) {
      resolveTiers();
    }
  }, [coverageRuleCode, insurerCodes, packages, packageRequestedTiers, benefitSections, policyStartDate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
        <span className="text-muted-foreground">Resolving tier availability...</span>
      </div>
    );
  }

  // Group offers by package for display
  const getOfferForCell = (packageId: string, insurerCode: string, sectionCode: string): TierOffer | undefined => {
    return tierOffers.find(
      o => o.packageId === packageId && o.insurerCode === insurerCode && o.sectionCode === sectionCode
    );
  };

  const getRequestedTier = (packageId: string, sectionCode: string): string | null => {
    const pkgTiers = packageRequestedTiers.find(p => p.packageId === packageId)?.tiers || [];
    return pkgTiers.find(t => t.sectionCode === sectionCode)?.tierCode || null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Tier Mapping Preview</h3>
        <p className="text-sm text-muted-foreground">
          Shows which tier each insurer will offer per benefit type. Differences from requested tiers are highlighted.
        </p>
      </div>

      {packages.map((pkg) => (
        <Card key={pkg.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{pkg.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Benefit</TableHead>
                    <TableHead className="w-[100px]">Requested</TableHead>
                    {insurerCodes.map(code => (
                      <TableHead key={code} className="text-center min-w-[120px]">
                        {insurerNames[code] || code}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benefitSections.map(sectionCode => {
                    const requestedTier = getRequestedTier(pkg.id, sectionCode);
                    return (
                      <TableRow key={sectionCode}>
                        <TableCell className="font-medium">
                          {SECTION_LABELS[sectionCode] || sectionCode}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {requestedTier || "—"}
                        </TableCell>
                        {insurerCodes.map(insurerCode => {
                          const offer = getOfferForCell(pkg.id, insurerCode, sectionCode);
                          const isDifferent = requestedTier && offer?.offeredTierCode && offer.offeredTierCode !== requestedTier;
                          
                          return (
                            <TableCell key={insurerCode} className="text-center">
                              {offer?.status === "QUOTED" ? (
                                <div className="flex flex-col items-center gap-1">
                                  <Badge 
                                    variant={isDifferent ? "secondary" : "default"}
                                    className={cn(
                                      "font-mono",
                                      isDifferent && "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                    )}
                                  >
                                    {offer.offeredTierCode}
                                  </Badge>
                                  {isDifferent && (
                                    <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                                      <AlertTriangle className="w-3 h-3" />
                                      differs
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <Badge variant="outline" className="text-muted-foreground">
                                    N/A
                                  </Badge>
                                  <span className="text-[10px] text-muted-foreground">
                                    {offer?.notes || "Not available"}
                                  </span>
                                </div>
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
          </CardContent>
        </Card>
      ))}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Badge>IP1500</Badge>
          <span className="text-muted-foreground">Matches requested</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">IP1000</Badge>
          <span className="text-muted-foreground">Alternative tier offered</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-muted-foreground">N/A</Badge>
          <span className="text-muted-foreground">Benefit not available</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary">
              {tierOffers.filter(o => o.status === "QUOTED").length}
            </p>
            <p className="text-xs text-muted-foreground">Available Offers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">
              {tierOffers.filter(o => o.status === "QUOTED" && o.notes).length}
            </p>
            <p className="text-xs text-muted-foreground">Alternative Tiers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-muted-foreground">
              {tierOffers.filter(o => o.status === "NA").length}
            </p>
            <p className="text-xs text-muted-foreground">Not Available</p>
          </div>
        </div>
      </div>
    </div>
  );
}
