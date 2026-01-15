import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTiers, useInsurers, type MasterTier } from "@/hooks/useMasterData";
import { Badge } from "@/components/ui/badge";

export interface RequestedTier {
  sectionCode: string;
  tierCode: string | null;
}

interface RequestedTiersEditorProps {
  selectedBenefits: string[]; // Section codes: IP, OP, DE, MA
  selectedInsurers: string[]; // Insurer codes
  requestedTiers: RequestedTier[];
  onRequestedTiersChange: (tiers: RequestedTier[]) => void;
}

const SECTION_LABELS: Record<string, string> = {
  IP: "In-Patient",
  OP: "Out-Patient",
  DE: "Dental",
  MA: "Maternity",
};

export function RequestedTiersEditor({
  selectedBenefits,
  selectedInsurers,
  requestedTiers,
  onRequestedTiersChange,
}: RequestedTiersEditorProps) {
  const { data: allTiers, isLoading: loadingTiers } = useTiers(undefined, true);
  const { data: insurers } = useInsurers(true);

  // Get tiers for a section, grouped by insurer
  const getTiersForSection = (sectionCode: string): MasterTier[] => {
    if (!allTiers) return [];
    
    // Filter tiers by section and selected insurers
    return allTiers.filter(t => 
      t.section_code === sectionCode && 
      t.insurer_code && 
      selectedInsurers.includes(t.insurer_code)
    );
  };

  // Get unique tier options (deduplicated by tier_code for selection)
  const getUniqueTiersForSection = (sectionCode: string): { tierCode: string; tierLabel: string; insurers: string[] }[] => {
    const sectionTiers = getTiersForSection(sectionCode);
    const tierMap = new Map<string, { tierCode: string; tierLabel: string; insurers: string[] }>();
    
    sectionTiers.forEach(tier => {
      if (tierMap.has(tier.tier_code)) {
        tierMap.get(tier.tier_code)!.insurers.push(tier.insurer_code!);
      } else {
        tierMap.set(tier.tier_code, {
          tierCode: tier.tier_code,
          tierLabel: tier.tier_label,
          insurers: [tier.insurer_code!]
        });
      }
    });
    
    return Array.from(tierMap.values());
  };

  const getSelectedTier = (sectionCode: string): string => {
    return requestedTiers.find(t => t.sectionCode === sectionCode)?.tierCode || "";
  };

  const updateTier = (sectionCode: string, tierCode: string | null) => {
    const existing = requestedTiers.filter(t => t.sectionCode !== sectionCode);
    onRequestedTiersChange([...existing, { sectionCode, tierCode }]);
  };

  const getInsurerName = (code: string) => {
    return insurers?.find(i => i.insurer_code === code)?.insurer_name || code;
  };

  if (loadingTiers) {
    return <div className="text-sm text-muted-foreground">Loading tiers...</div>;
  }

  if (selectedInsurers.length === 0) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground">
        Please select at least one insurer to see available tiers.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Requested Coverage Tiers</h3>
        <p className="text-sm text-muted-foreground">
          Select target tiers for each benefit type. These are benchmarks - actual offered tiers may vary by insurer.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {selectedBenefits.map((sectionCode) => {
          const uniqueTiers = getUniqueTiersForSection(sectionCode);
          const selectedTier = getSelectedTier(sectionCode);
          const selectedTierInfo = uniqueTiers.find(t => t.tierCode === selectedTier);

          return (
            <div key={sectionCode} className="space-y-2">
              <Label className="flex items-center gap-2">
                {SECTION_LABELS[sectionCode] || sectionCode}
                {sectionCode === "IP" && (
                  <span className="text-xs text-primary font-normal">(Mandatory)</span>
                )}
              </Label>
              <Select
                value={selectedTier}
                onValueChange={(value) => updateTier(sectionCode, value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${SECTION_LABELS[sectionCode]} tier`} />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="">No preference</SelectItem>
                  {uniqueTiers.map((tier) => (
                    <SelectItem key={tier.tierCode} value={tier.tierCode}>
                      <div className="flex items-center gap-2">
                        <span>{tier.tierLabel}</span>
                        <span className="text-xs text-muted-foreground">
                          ({tier.insurers.length === selectedInsurers.length 
                            ? "all insurers" 
                            : tier.insurers.map(getInsurerName).join(", ")})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Show which insurers have the selected tier */}
              {selectedTierInfo && selectedTierInfo.insurers.length < selectedInsurers.length && (
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="text-xs text-amber-600">Available for:</span>
                  {selectedTierInfo.insurers.map(code => (
                    <Badge key={code} variant="outline" className="text-[10px] px-1.5 py-0">
                      {getInsurerName(code)}
                    </Badge>
                  ))}
                </div>
              )}
              
              {uniqueTiers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No tiers available for selected insurers
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Tier Availability Summary */}
      <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-2">
        <p className="font-medium">Tier Resolution Note</p>
        <p className="text-muted-foreground">
          Since each insurer defines their own tiers, the system will resolve the best matching tier for each insurer during quotation generation. 
          If a requested tier is not available for an insurer, an alternative will be offered.
        </p>
      </div>
    </div>
  );
}
