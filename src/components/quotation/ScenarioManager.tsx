import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Copy, Check, Loader2, GitBranch, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInsurers, useCoverageRules } from "@/hooks/useMasterData";
import { RequestedTiersEditor, type PackageRequestedTiers } from "./RequestedTiersEditor";
import type { DemographicType } from "@/hooks/useMasterData";

interface Package {
  id: string;
  name: string;
  census: Record<DemographicType, number>;
}

interface ScenarioConfig {
  scenarioName: string;
  coverageRuleCode: string;
  insurerCodes: string[];
  benefits: {
    inPatient: boolean;
    outPatient: boolean;
    dental: boolean;
    maternity: boolean;
  };
  packageRequestedTiers: PackageRequestedTiers[];
}

export interface ScenarioState {
  id: string;
  number: number;
  name: string;
  isBase: boolean;
  status: "draft" | "resolved" | "finalized";
  config: ScenarioConfig;
}

interface ScenarioManagerProps {
  packages: Package[];
  baseScenario: ScenarioConfig;
  scenarios: ScenarioState[];
  onAddScenario: (config: ScenarioConfig) => void;
  onSelectScenario: (scenarioId: string) => void;
  selectedScenarioId: string | null;
  isGenerating: boolean;
}

export function ScenarioManager({
  packages,
  baseScenario,
  scenarios,
  onAddScenario,
  onSelectScenario,
  selectedScenarioId,
  isGenerating,
}: ScenarioManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newScenarioName, setNewScenarioName] = useState("Alternative 1");
  const [newConfig, setNewConfig] = useState<ScenarioConfig>(baseScenario);

  const { data: insurersList } = useInsurers(true);
  const { data: coverageRulesList } = useCoverageRules(true);

  const handleCreateAlternative = () => {
    onAddScenario({
      ...newConfig,
      scenarioName: newScenarioName,
    });
    setShowAddDialog(false);
    setNewScenarioName(`Alternative ${scenarios.length + 1}`);
    setNewConfig(baseScenario);
  };

  const handleCopyFromBase = () => {
    setNewConfig({ ...baseScenario });
  };

  const toggleInsurer = (code: string) => {
    setNewConfig(prev => ({
      ...prev,
      insurerCodes: prev.insurerCodes.includes(code)
        ? prev.insurerCodes.filter(c => c !== code)
        : [...prev.insurerCodes, code],
    }));
  };

  const getInsurerName = (code: string) => {
    return insurersList?.find(i => i.insurer_code === code)?.insurer_name || code;
  };

  const getCoverageRuleName = (code: string) => {
    return coverageRulesList?.find(r => r.coverage_rule_code === code)?.coverage_rule_name || code;
  };

  const getSelectedBenefitSections = (benefits: ScenarioConfig["benefits"]): string[] => {
    const sections: string[] = [];
    if (benefits.inPatient) sections.push("IP");
    if (benefits.outPatient) sections.push("OP");
    if (benefits.dental) sections.push("DE");
    if (benefits.maternity) sections.push("MA");
    return sections;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Quote Scenarios
          </h3>
          <p className="text-sm text-muted-foreground">
            Base scenario plus any alternative configurations
          </p>
        </div>

        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Alternative
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Alternative Scenario</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Scenario Name</Label>
                  <Input
                    value={newScenarioName}
                    onChange={e => setNewScenarioName(e.target.value)}
                    placeholder="e.g., Alternative 1, Budget Option, Premium Plan"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={handleCopyFromBase}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy from Base
                </Button>
              </div>

              {/* Coverage Rule */}
              <div className="space-y-2">
                <Label>Coverage Rule</Label>
                <Select
                  value={newConfig.coverageRuleCode}
                  onValueChange={v => setNewConfig(prev => ({ ...prev, coverageRuleCode: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select coverage rule" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {coverageRulesList?.map(rule => (
                      <SelectItem key={rule.coverage_rule_code} value={rule.coverage_rule_code}>
                        {rule.coverage_rule_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Benefits */}
              <div className="space-y-2">
                <Label>Benefits</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2 p-2 border rounded">
                    <Checkbox
                      checked={newConfig.benefits.inPatient}
                      disabled
                    />
                    <span className="text-sm">In-Patient</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border rounded">
                    <Checkbox
                      checked={newConfig.benefits.outPatient}
                      onCheckedChange={checked => setNewConfig(prev => ({
                        ...prev,
                        benefits: { ...prev.benefits, outPatient: !!checked },
                      }))}
                    />
                    <span className="text-sm">Out-Patient</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border rounded">
                    <Checkbox
                      checked={newConfig.benefits.dental}
                      onCheckedChange={checked => setNewConfig(prev => ({
                        ...prev,
                        benefits: { ...prev.benefits, dental: !!checked },
                      }))}
                    />
                    <span className="text-sm">Dental</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border rounded">
                    <Checkbox
                      checked={newConfig.benefits.maternity}
                      onCheckedChange={checked => setNewConfig(prev => ({
                        ...prev,
                        benefits: { ...prev.benefits, maternity: !!checked },
                      }))}
                    />
                    <span className="text-sm">Maternity</span>
                  </div>
                </div>
              </div>

              {/* Insurers */}
              <div className="space-y-2">
                <Label>Insurance Companies</Label>
                <div className="grid grid-cols-2 gap-2">
                  {insurersList?.map(insurer => (
                    <div
                      key={insurer.insurer_code}
                      className={cn(
                        "flex items-center gap-2 p-3 border rounded cursor-pointer transition-colors",
                        newConfig.insurerCodes.includes(insurer.insurer_code)
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      )}
                      onClick={() => toggleInsurer(insurer.insurer_code)}
                    >
                      <Checkbox checked={newConfig.insurerCodes.includes(insurer.insurer_code)} />
                      <span className="text-sm">{insurer.insurer_name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Requested Tiers */}
              {newConfig.insurerCodes.length > 0 && packages.length > 0 && (
                <div className="space-y-2">
                  <Label>Requested Tiers</Label>
                  <RequestedTiersEditor
                    packages={packages}
                    selectedBenefits={getSelectedBenefitSections(newConfig.benefits)}
                    selectedInsurers={newConfig.insurerCodes}
                    packageRequestedTiers={newConfig.packageRequestedTiers}
                    onPackageRequestedTiersChange={tiers => setNewConfig(prev => ({
                      ...prev,
                      packageRequestedTiers: tiers,
                    }))}
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateAlternative} disabled={!newScenarioName.trim()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Alternative
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scenario Cards */}
      <div className="grid gap-3">
        {scenarios.map(scenario => (
          <Card
            key={scenario.id}
            className={cn(
              "cursor-pointer transition-all",
              selectedScenarioId === scenario.id
                ? "ring-2 ring-primary"
                : "hover:border-primary/50"
            )}
            onClick={() => onSelectScenario(scenario.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    scenario.isBase ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  )}>
                    {scenario.isBase ? <FileText className="w-5 h-5" /> : scenario.number}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{scenario.name}</span>
                      {scenario.isBase && (
                        <Badge variant="default" className="text-xs">Base</Badge>
                      )}
                      {scenario.status === "resolved" && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="w-3 h-3 mr-1" />
                          Resolved
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {getCoverageRuleName(scenario.config.coverageRuleCode)} •{" "}
                      {scenario.config.insurerCodes.map(getInsurerName).join(", ")}
                    </div>
                  </div>
                </div>

                {selectedScenarioId === scenario.id && isGenerating && (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {scenarios.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No scenarios yet. Configure your base quote first.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
