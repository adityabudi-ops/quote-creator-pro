import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useTiers, type MasterTier } from "@/hooks/useMasterData";

export interface RequestedTier {
  sectionCode: string;
  tierCode: string | null;
}

interface RequestedTiersEditorProps {
  selectedBenefits: string[]; // Section codes: IP, OP, DE, MA
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
  requestedTiers,
  onRequestedTiersChange,
}: RequestedTiersEditorProps) {
  const { data: allTiers, isLoading } = useTiers(undefined, true);

  const getTiersForSection = (sectionCode: string): MasterTier[] => {
    return allTiers?.filter(t => t.section_code === sectionCode) || [];
  };

  const getSelectedTier = (sectionCode: string): string => {
    return requestedTiers.find(t => t.sectionCode === sectionCode)?.tierCode || "";
  };

  const updateTier = (sectionCode: string, tierCode: string | null) => {
    const existing = requestedTiers.filter(t => t.sectionCode !== sectionCode);
    onRequestedTiersChange([...existing, { sectionCode, tierCode }]);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading tiers...</div>;
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
          const tiers = getTiersForSection(sectionCode);
          const selectedTier = getSelectedTier(sectionCode);

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
                  {tiers.map((tier) => (
                    <SelectItem key={tier.tier_code} value={tier.tier_code}>
                      {tier.tier_label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tiers.length === 0 && (
                <p className="text-xs text-muted-foreground">No tiers available for this section</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Tier Mapping Preview Note */}
      <div className="p-3 bg-muted/50 rounded-lg text-sm">
        <p className="font-medium">Note on Tier Resolution</p>
        <p className="text-muted-foreground mt-1">
          When the quotation is generated, the system will resolve actual offered tiers per insurer based on available templates and pricing. If a requested tier is not available, an alternative tier will be offered.
        </p>
      </div>
    </div>
  );
}
