import { useState } from "react";
import { Database, Building2, Layers, Tag, FileText, Plus, Edit2, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useCoverageRules,
  useCreateCoverageRule,
  useUpdateCoverageRule,
  useDeleteCoverageRule,
  useInsurers,
  useCreateInsurer,
  useUpdateInsurer,
  useDeleteInsurer,
  useBenefitSections,
  useCreateBenefitSection,
  useUpdateBenefitSection,
  useDeleteBenefitSection,
  useTiers,
  useCreateTier,
  useUpdateTier,
  useDeleteTier,
  type MasterCoverageRule,
  type MasterInsurer,
  type MasterBenefitSection,
  type MasterTier,
} from "@/hooks/useMasterData";

export default function MasterDataManagement() {
  const { data: coverageRules, isLoading: loadingRules } = useCoverageRules(false);
  const { data: insurers, isLoading: loadingInsurers } = useInsurers(false);
  const { data: sections, isLoading: loadingSections } = useBenefitSections(false);
  const { data: tiers, isLoading: loadingTiers } = useTiers(undefined, false);

  const createRule = useCreateCoverageRule();
  const updateRule = useUpdateCoverageRule();
  const deleteRule = useDeleteCoverageRule();

  const createInsurer = useCreateInsurer();
  const updateInsurer = useUpdateInsurer();
  const deleteInsurer = useDeleteInsurer();

  const createSection = useCreateBenefitSection();
  const updateSection = useUpdateBenefitSection();
  const deleteSection = useDeleteBenefitSection();

  const createTier = useCreateTier();
  const updateTier = useUpdateTier();
  const deleteTier = useDeleteTier();

  // Dialog states
  const [ruleDialog, setRuleDialog] = useState(false);
  const [insurerDialog, setInsurerDialog] = useState(false);
  const [sectionDialog, setSectionDialog] = useState(false);
  const [tierDialog, setTierDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ type: string; code: string; name: string } | null>(null);

  // Form states
  const [selectedRule, setSelectedRule] = useState<MasterCoverageRule | null>(null);
  const [selectedInsurer, setSelectedInsurer] = useState<MasterInsurer | null>(null);
  const [selectedSection, setSelectedSection] = useState<MasterBenefitSection | null>(null);
  const [selectedTier, setSelectedTier] = useState<MasterTier | null>(null);

  const [ruleForm, setRuleForm] = useState({ coverage_rule_code: "", coverage_rule_name: "", is_active: true });
  const [insurerForm, setInsurerForm] = useState({ insurer_code: "", insurer_name: "", is_active: true });
  const [sectionForm, setSectionForm] = useState({ section_code: "", section_name: "", display_order: 0, is_active: true });
  const [tierForm, setTierForm] = useState({ tier_code: "", section_code: "", tier_label: "", insurer_code: "", is_active: true });
  
  // Tier filter by insurer
  const [tierInsurerFilter, setTierInsurerFilter] = useState<string>("all");

  // Expanded states
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleExpanded = (code: string) => {
    setExpandedSections(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  // Coverage Rule handlers
  const openRuleDialog = (rule?: MasterCoverageRule) => {
    if (rule) {
      setSelectedRule(rule);
      setRuleForm({ coverage_rule_code: rule.coverage_rule_code, coverage_rule_name: rule.coverage_rule_name, is_active: rule.is_active });
    } else {
      setSelectedRule(null);
      setRuleForm({ coverage_rule_code: "", coverage_rule_name: "", is_active: true });
    }
    setRuleDialog(true);
  };

  const saveRule = async () => {
    try {
      if (selectedRule) {
        await updateRule.mutateAsync({ coverage_rule_code: selectedRule.coverage_rule_code, coverage_rule_name: ruleForm.coverage_rule_name, is_active: ruleForm.is_active });
        toast.success("Coverage rule updated");
      } else {
        await createRule.mutateAsync(ruleForm);
        toast.success("Coverage rule created");
      }
      setRuleDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  // Insurer handlers
  const openInsurerDialog = (insurer?: MasterInsurer) => {
    if (insurer) {
      setSelectedInsurer(insurer);
      setInsurerForm({ insurer_code: insurer.insurer_code, insurer_name: insurer.insurer_name, is_active: insurer.is_active });
    } else {
      setSelectedInsurer(null);
      setInsurerForm({ insurer_code: "", insurer_name: "", is_active: true });
    }
    setInsurerDialog(true);
  };

  const saveInsurer = async () => {
    try {
      if (selectedInsurer) {
        await updateInsurer.mutateAsync({ insurer_code: selectedInsurer.insurer_code, insurer_name: insurerForm.insurer_name, is_active: insurerForm.is_active });
        toast.success("Insurer updated");
      } else {
        await createInsurer.mutateAsync(insurerForm);
        toast.success("Insurer created");
      }
      setInsurerDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  // Section handlers
  const openSectionDialog = (section?: MasterBenefitSection) => {
    if (section) {
      setSelectedSection(section);
      setSectionForm({ section_code: section.section_code, section_name: section.section_name, display_order: section.display_order, is_active: section.is_active });
    } else {
      setSelectedSection(null);
      setSectionForm({ section_code: "", section_name: "", display_order: (sections?.length || 0) + 1, is_active: true });
    }
    setSectionDialog(true);
  };

  const saveSection = async () => {
    try {
      if (selectedSection) {
        await updateSection.mutateAsync({ section_code: selectedSection.section_code, section_name: sectionForm.section_name, display_order: sectionForm.display_order, is_active: sectionForm.is_active });
        toast.success("Section updated");
      } else {
        await createSection.mutateAsync(sectionForm);
        toast.success("Section created");
      }
      setSectionDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  // Tier handlers
  const openTierDialog = (tier?: MasterTier, sectionCode?: string, insurerCode?: string) => {
    if (tier) {
      setSelectedTier(tier);
      setTierForm({ 
        tier_code: tier.tier_code, 
        section_code: tier.section_code, 
        tier_label: tier.tier_label, 
        insurer_code: tier.insurer_code || "",
        is_active: tier.is_active 
      });
    } else {
      setSelectedTier(null);
      setTierForm({ 
        tier_code: "", 
        section_code: sectionCode || "", 
        tier_label: "", 
        insurer_code: insurerCode || tierInsurerFilter !== "all" ? tierInsurerFilter : "",
        is_active: true 
      });
    }
    setTierDialog(true);
  };

  const saveTier = async () => {
    try {
      if (selectedTier) {
        await updateTier.mutateAsync({ 
          tier_code: selectedTier.tier_code, 
          tier_label: tierForm.tier_label, 
          insurer_code: tierForm.insurer_code || null,
          is_active: tierForm.is_active 
        });
        toast.success("Tier updated");
      } else {
        await createTier.mutateAsync({
          ...tierForm,
          insurer_code: tierForm.insurer_code || null
        });
        toast.success("Tier created");
      }
      setTierDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  // Delete handler
  const confirmDelete = async () => {
    if (!deleteDialog) return;
    try {
      if (deleteDialog.type === "rule") {
        await deleteRule.mutateAsync(deleteDialog.code);
      } else if (deleteDialog.type === "insurer") {
        await deleteInsurer.mutateAsync(deleteDialog.code);
      } else if (deleteDialog.type === "section") {
        await deleteSection.mutateAsync(deleteDialog.code);
      } else if (deleteDialog.type === "tier") {
        await deleteTier.mutateAsync(deleteDialog.code);
      }
      toast.success("Deleted successfully");
      setDeleteDialog(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const isLoading = loadingRules || loadingInsurers || loadingSections || loadingTiers;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-6 md:p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 opacity-80" />
            <span className="text-sm font-medium opacity-90">Admin Settings</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Master Data Management</h1>
          <p className="text-white/80 text-sm md:text-base">
            Configure coverage rules, insurers, benefit sections, and tiers
          </p>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-1 p-1">
          <TabsTrigger value="rules" className="flex items-center gap-2 py-2.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Coverage</span> Rules
          </TabsTrigger>
          <TabsTrigger value="insurers" className="flex items-center gap-2 py-2.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="w-4 h-4" />
            Insurers
          </TabsTrigger>
          <TabsTrigger value="sections" className="flex items-center gap-2 py-2.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Sections &</span> Tiers
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center gap-2 py-2.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Tag className="w-4 h-4" />
            <span className="hidden sm:inline">Benefit</span> Items
          </TabsTrigger>
        </TabsList>

        {/* Coverage Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openRuleDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Coverage Rule
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Coverage Rules</CardTitle>
              <CardDescription>Define coverage configuration options (e.g., Inner Limit, As Charged)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {coverageRules?.map((rule) => (
                  <div
                    key={rule.coverage_rule_code}
                    className={`flex items-center justify-between p-4 rounded-lg border ${!rule.is_active ? "opacity-50 bg-muted/30" : "bg-card"}`}
                  >
                    <div>
                      <p className="font-mono text-sm text-primary">{rule.coverage_rule_code}</p>
                      <p className="font-medium">{rule.coverage_rule_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!rule.is_active && <Badge variant="secondary">Inactive</Badge>}
                      <Button variant="ghost" size="icon" onClick={() => openRuleDialog(rule)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: "rule", code: rule.coverage_rule_code, name: rule.coverage_rule_name })}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!coverageRules || coverageRules.length === 0) && (
                  <p className="text-center text-muted-foreground py-8">No coverage rules configured</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insurers Tab */}
        <TabsContent value="insurers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openInsurerDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Insurer
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Insurance Companies</CardTitle>
              <CardDescription>Manage insurance company master data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {insurers?.map((insurer) => (
                  <div
                    key={insurer.insurer_code}
                    className={`flex items-center justify-between p-4 rounded-lg border ${!insurer.is_active ? "opacity-50 bg-muted/30" : "bg-card"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-xs text-primary">{insurer.insurer_code}</p>
                      <p className="font-medium truncate">{insurer.insurer_name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openInsurerDialog(insurer)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteDialog({ type: "insurer", code: insurer.insurer_code, name: insurer.insurer_name })}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!insurers || insurers.length === 0) && (
                  <p className="text-center text-muted-foreground py-8 col-span-full">No insurers configured</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sections & Tiers Tab */}
        <TabsContent value="sections" className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Label className="text-sm text-muted-foreground whitespace-nowrap">Filter by Insurer:</Label>
              <Select value={tierInsurerFilter} onValueChange={setTierInsurerFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Insurers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Insurers</SelectItem>
                  {insurers?.map((ins) => (
                    <SelectItem key={ins.insurer_code} value={ins.insurer_code}>
                      {ins.insurer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => openSectionDialog()} className="shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              Add Section
            </Button>
          </div>
          <div className="space-y-3">
            {sections?.map((section) => {
              const sectionTiers = tiers?.filter(t => 
                t.section_code === section.section_code && 
                (tierInsurerFilter === "all" || t.insurer_code === tierInsurerFilter)
              ) || [];
              const isExpanded = expandedSections.includes(section.section_code);

              return (
                <Collapsible key={section.section_code} open={isExpanded} onOpenChange={() => toggleExpanded(section.section_code)}>
                  <Card className={!section.is_active ? "opacity-60" : ""}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                            <div>
                              <CardTitle className="flex items-center gap-2 text-lg">
                                <span className="font-mono text-primary">{section.section_code}</span>
                                <span>{section.section_name}</span>
                                {!section.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                              </CardTitle>
                            </div>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Badge variant="outline">{sectionTiers.length} tiers</Badge>
                            <Button variant="ghost" size="icon" onClick={() => openSectionDialog(section)}>
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ type: "section", code: section.section_code, name: section.section_name })}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-sm text-muted-foreground">
                              Plan Tiers {tierInsurerFilter !== "all" && `(${insurers?.find(i => i.insurer_code === tierInsurerFilter)?.insurer_name})`}
                            </h4>
                            <Button variant="outline" size="sm" onClick={() => openTierDialog(undefined, section.section_code, tierInsurerFilter !== "all" ? tierInsurerFilter : undefined)}>
                              <Plus className="w-3 h-3 mr-1" />
                              Add Tier
                            </Button>
                          </div>
                          {sectionTiers.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              {tierInsurerFilter !== "all" 
                                ? `No tiers configured for ${insurers?.find(i => i.insurer_code === tierInsurerFilter)?.insurer_name}`
                                : "No tiers configured"}
                            </p>
                          ) : (
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {sectionTiers.map((tier) => (
                                <div
                                  key={tier.tier_code}
                                  className={`flex items-center justify-between p-3 rounded-lg border ${!tier.is_active ? "opacity-50 bg-muted/30" : "bg-card"}`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="font-mono text-xs text-primary">{tier.tier_code}</p>
                                      {tier.insurer_code && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                          {tier.insurer?.insurer_name || tier.insurer_code}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="font-medium text-sm">{tier.tier_label}</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openTierDialog(tier)}>
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteDialog({ type: "tier", code: tier.tier_code, name: tier.tier_label })}>
                                      <Trash2 className="w-3 h-3 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
            {(!sections || sections.length === 0) && (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">No benefit sections configured</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Benefit Items Tab - Placeholder */}
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Benefit Items</CardTitle>
              <CardDescription>Configure master benefit items for each section (coming soon)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground py-8">Benefit items management will be implemented in the next phase</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Coverage Rule Dialog */}
      <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>{selectedRule ? "Edit" : "Add"} Coverage Rule</DialogTitle>
            <DialogDescription>Configure coverage rule settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={ruleForm.coverage_rule_code}
                onChange={(e) => setRuleForm({ ...ruleForm, coverage_rule_code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="e.g., inner_limit_all"
                disabled={!!selectedRule}
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={ruleForm.coverage_rule_name}
                onChange={(e) => setRuleForm({ ...ruleForm, coverage_rule_name: e.target.value })}
                placeholder="e.g., Inner Limit For All Benefits"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={ruleForm.is_active} onCheckedChange={(checked) => setRuleForm({ ...ruleForm, is_active: checked })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialog(false)}>Cancel</Button>
            <Button onClick={saveRule} disabled={!ruleForm.coverage_rule_code || !ruleForm.coverage_rule_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insurer Dialog */}
      <Dialog open={insurerDialog} onOpenChange={setInsurerDialog}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>{selectedInsurer ? "Edit" : "Add"} Insurer</DialogTitle>
            <DialogDescription>Configure insurer settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={insurerForm.insurer_code}
                onChange={(e) => setInsurerForm({ ...insurerForm, insurer_code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                placeholder="e.g., AXA"
                disabled={!!selectedInsurer}
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={insurerForm.insurer_name}
                onChange={(e) => setInsurerForm({ ...insurerForm, insurer_name: e.target.value })}
                placeholder="e.g., AXA Financial Indonesia"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={insurerForm.is_active} onCheckedChange={(checked) => setInsurerForm({ ...insurerForm, is_active: checked })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInsurerDialog(false)}>Cancel</Button>
            <Button onClick={saveInsurer} disabled={!insurerForm.insurer_code || !insurerForm.insurer_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Dialog */}
      <Dialog open={sectionDialog} onOpenChange={setSectionDialog}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>{selectedSection ? "Edit" : "Add"} Benefit Section</DialogTitle>
            <DialogDescription>Configure benefit section settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={sectionForm.section_code}
                onChange={(e) => setSectionForm({ ...sectionForm, section_code: e.target.value.toUpperCase() })}
                placeholder="e.g., IP"
                disabled={!!selectedSection}
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={sectionForm.section_name}
                onChange={(e) => setSectionForm({ ...sectionForm, section_name: e.target.value })}
                placeholder="e.g., In-Patient"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={sectionForm.display_order}
                onChange={(e) => setSectionForm({ ...sectionForm, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={sectionForm.is_active} onCheckedChange={(checked) => setSectionForm({ ...sectionForm, is_active: checked })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialog(false)}>Cancel</Button>
            <Button onClick={saveSection} disabled={!sectionForm.section_code || !sectionForm.section_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tier Dialog */}
      <Dialog open={tierDialog} onOpenChange={setTierDialog}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>{selectedTier ? "Edit" : "Add"} Plan Tier</DialogTitle>
            <DialogDescription>Configure plan tier for a specific insurer and benefit section</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Insurer <span className="text-destructive">*</span></Label>
              <Select
                value={tierForm.insurer_code}
                onValueChange={(v) => setTierForm({ ...tierForm, insurer_code: v })}
                disabled={!!selectedTier}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select insurer" />
                </SelectTrigger>
                <SelectContent>
                  {insurers?.map((ins) => (
                    <SelectItem key={ins.insurer_code} value={ins.insurer_code}>
                      {ins.insurer_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Each insurer defines their own set of tiers</p>
            </div>
            <div className="space-y-2">
              <Label>Section <span className="text-destructive">*</span></Label>
              <Select
                value={tierForm.section_code}
                onValueChange={(v) => setTierForm({ ...tierForm, section_code: v })}
                disabled={!!selectedTier}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections?.map((s) => (
                    <SelectItem key={s.section_code} value={s.section_code}>
                      {s.section_code} - {s.section_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tier Code <span className="text-destructive">*</span></Label>
              <Input
                value={tierForm.tier_code}
                onChange={(e) => setTierForm({ ...tierForm, tier_code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                placeholder="e.g., IP300"
                disabled={!!selectedTier}
              />
              <p className="text-xs text-muted-foreground">Unique identifier for this tier (e.g., ACA_IP300)</p>
            </div>
            <div className="space-y-2">
              <Label>Display Label <span className="text-destructive">*</span></Label>
              <Input
                value={tierForm.tier_label}
                onChange={(e) => setTierForm({ ...tierForm, tier_label: e.target.value })}
                placeholder="e.g., In-Patient 300M"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={tierForm.is_active} onCheckedChange={(checked) => setTierForm({ ...tierForm, is_active: checked })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialog(false)}>Cancel</Button>
            <Button onClick={saveTier} disabled={!tierForm.tier_code || !tierForm.section_code || !tierForm.tier_label || !tierForm.insurer_code}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog?.name}"? This action cannot be undone and may affect related data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
