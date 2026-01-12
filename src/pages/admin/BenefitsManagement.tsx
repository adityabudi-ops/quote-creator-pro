import { useState } from "react";
import { Link } from "react-router-dom";
import { Shield, Plus, Edit2, Trash2, Layers, Settings2, ChevronDown, ChevronRight, FileText } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  useBenefitTypes,
  usePlanTiers,
  useBenefitsOptions,
  useCreateBenefitType,
  useUpdateBenefitType,
  useDeleteBenefitType,
  useCreatePlanTier,
  useUpdatePlanTier,
  useDeletePlanTier,
  useCreateBenefitsOption,
  useUpdateBenefitsOption,
  useDeleteBenefitsOption,
  type BenefitType,
  type PlanTier,
  type BenefitsOption,
} from "@/hooks/useBenefitsManagement";

export default function BenefitsManagement() {
  const { data: benefitTypes, isLoading: loadingTypes } = useBenefitTypes(false);
  const { data: planTiers, isLoading: loadingTiers } = usePlanTiers(undefined, false);
  const { data: benefitsOptions, isLoading: loadingOptions } = useBenefitsOptions(false);

  const createBenefitType = useCreateBenefitType();
  const updateBenefitType = useUpdateBenefitType();
  const deleteBenefitType = useDeleteBenefitType();

  const createPlanTier = useCreatePlanTier();
  const updatePlanTier = useUpdatePlanTier();
  const deletePlanTier = useDeletePlanTier();

  const createBenefitsOption = useCreateBenefitsOption();
  const updateBenefitsOption = useUpdateBenefitsOption();
  const deleteBenefitsOption = useDeleteBenefitsOption();

  // Dialog states
  const [benefitTypeDialog, setBenefitTypeDialog] = useState(false);
  const [planTierDialog, setPlanTierDialog] = useState(false);
  const [benefitsOptionDialog, setBenefitsOptionDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ type: string; id: string; name: string } | null>(null);

  // Form states
  const [selectedBenefitType, setSelectedBenefitType] = useState<BenefitType | null>(null);
  const [selectedPlanTier, setSelectedPlanTier] = useState<PlanTier | null>(null);
  const [selectedBenefitsOption, setSelectedBenefitsOption] = useState<BenefitsOption | null>(null);

  const [benefitTypeForm, setBenefitTypeForm] = useState({
    code: "",
    name: "",
    description: "",
    is_mandatory: false,
    display_order: 0,
    is_active: true,
  });

  const [planTierForm, setPlanTierForm] = useState({
    benefit_type_id: "",
    name: "",
    limit_value: 0,
    display_order: 0,
    is_active: true,
  });

  const [benefitsOptionForm, setBenefitsOptionForm] = useState({
    code: "",
    name: "",
    description: "",
    display_order: 0,
    is_active: true,
  });

  // Expanded states for benefit types
  const [expandedTypes, setExpandedTypes] = useState<string[]>([]);

  const toggleExpanded = (id: string) => {
    setExpandedTypes(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Benefit Type handlers
  const openBenefitTypeDialog = (benefitType?: BenefitType) => {
    if (benefitType) {
      setSelectedBenefitType(benefitType);
      setBenefitTypeForm({
        code: benefitType.code,
        name: benefitType.name,
        description: benefitType.description || "",
        is_mandatory: benefitType.is_mandatory,
        display_order: benefitType.display_order,
        is_active: benefitType.is_active,
      });
    } else {
      setSelectedBenefitType(null);
      setBenefitTypeForm({
        code: "",
        name: "",
        description: "",
        is_mandatory: false,
        display_order: (benefitTypes?.length || 0) + 1,
        is_active: true,
      });
    }
    setBenefitTypeDialog(true);
  };

  const saveBenefitType = async () => {
    try {
      if (selectedBenefitType) {
        await updateBenefitType.mutateAsync({
          id: selectedBenefitType.id,
          ...benefitTypeForm,
        });
        toast.success("Benefit type updated");
      } else {
        await createBenefitType.mutateAsync(benefitTypeForm);
        toast.success("Benefit type created");
      }
      setBenefitTypeDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  // Plan Tier handlers
  const openPlanTierDialog = (planTier?: PlanTier, benefitTypeId?: string) => {
    if (planTier) {
      setSelectedPlanTier(planTier);
      setPlanTierForm({
        benefit_type_id: planTier.benefit_type_id,
        name: planTier.name,
        limit_value: planTier.limit_value,
        display_order: planTier.display_order,
        is_active: planTier.is_active,
      });
    } else {
      setSelectedPlanTier(null);
      const tiersForType = planTiers?.filter(t => t.benefit_type_id === benefitTypeId) || [];
      setPlanTierForm({
        benefit_type_id: benefitTypeId || "",
        name: "",
        limit_value: 0,
        display_order: tiersForType.length + 1,
        is_active: true,
      });
    }
    setPlanTierDialog(true);
  };

  const savePlanTier = async () => {
    try {
      if (selectedPlanTier) {
        await updatePlanTier.mutateAsync({
          id: selectedPlanTier.id,
          ...planTierForm,
        });
        toast.success("Plan tier updated");
      } else {
        await createPlanTier.mutateAsync(planTierForm);
        toast.success("Plan tier created");
      }
      setPlanTierDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  // Benefits Option handlers
  const openBenefitsOptionDialog = (option?: BenefitsOption) => {
    if (option) {
      setSelectedBenefitsOption(option);
      setBenefitsOptionForm({
        code: option.code,
        name: option.name,
        description: option.description || "",
        display_order: option.display_order,
        is_active: option.is_active,
      });
    } else {
      setSelectedBenefitsOption(null);
      setBenefitsOptionForm({
        code: "",
        name: "",
        description: "",
        display_order: (benefitsOptions?.length || 0) + 1,
        is_active: true,
      });
    }
    setBenefitsOptionDialog(true);
  };

  const saveBenefitsOption = async () => {
    try {
      if (selectedBenefitsOption) {
        await updateBenefitsOption.mutateAsync({
          id: selectedBenefitsOption.id,
          ...benefitsOptionForm,
        });
        toast.success("Benefits option updated");
      } else {
        await createBenefitsOption.mutateAsync(benefitsOptionForm);
        toast.success("Benefits option created");
      }
      setBenefitsOptionDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  // Delete handler
  const confirmDelete = async () => {
    if (!deleteDialog) return;
    try {
      if (deleteDialog.type === "benefitType") {
        await deleteBenefitType.mutateAsync(deleteDialog.id);
      } else if (deleteDialog.type === "planTier") {
        await deletePlanTier.mutateAsync(deleteDialog.id);
      } else if (deleteDialog.type === "benefitsOption") {
        await deleteBenefitsOption.mutateAsync(deleteDialog.id);
      }
      toast.success("Deleted successfully");
      setDeleteDialog(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const isLoading = loadingTypes || loadingTiers || loadingOptions;

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
            <Shield className="w-5 h-5 opacity-80" />
            <span className="text-sm font-medium opacity-90">Insurance Settings</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Benefits Management</h1>
          <p className="text-white/80 text-sm md:text-base">
            Configure benefit types, plan tiers, and coverage options
          </p>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Tabs defaultValue="benefits" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="benefits" className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Benefits & Plan Tiers
          </TabsTrigger>
          <TabsTrigger value="options" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            Coverage Options
          </TabsTrigger>
        </TabsList>

        {/* Benefits & Plan Tiers Tab */}
        <TabsContent value="benefits" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openBenefitTypeDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Benefit Type
            </Button>
          </div>

          <div className="space-y-3">
            {benefitTypes?.map((benefitType) => {
              const typeTiers = planTiers?.filter(t => t.benefit_type_id === benefitType.id) || [];
              const isExpanded = expandedTypes.includes(benefitType.id);

              return (
                <Collapsible
                  key={benefitType.id}
                  open={isExpanded}
                  onOpenChange={() => toggleExpanded(benefitType.id)}
                >
                  <Card className={!benefitType.is_active ? "opacity-60" : ""}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            )}
                            <div>
                              <CardTitle className="flex items-center gap-2 text-lg">
                                <span className="font-mono text-primary">{benefitType.code}</span>
                                <span>{benefitType.name}</span>
                                {benefitType.is_mandatory && (
                                  <Badge variant="secondary" className="text-xs">Mandatory</Badge>
                                )}
                                {!benefitType.is_active && (
                                  <Badge variant="outline" className="text-xs">Inactive</Badge>
                                )}
                              </CardTitle>
                              {benefitType.description && (
                                <CardDescription>{benefitType.description}</CardDescription>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Badge variant="outline">{typeTiers.length} tiers</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openBenefitTypeDialog(benefitType)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            {!benefitType.is_mandatory && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteDialog({
                                  type: "benefitType",
                                  id: benefitType.id,
                                  name: benefitType.name,
                                })}
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="border-t pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-sm text-muted-foreground">Plan Tiers</h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPlanTierDialog(undefined, benefitType.id)}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Tier
                            </Button>
                          </div>

                          {typeTiers.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No plan tiers configured
                            </p>
                          ) : (
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {typeTiers.map((tier) => (
                                <div
                                  key={tier.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    !tier.is_active ? "opacity-50 bg-muted/30" : "bg-card"
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">{tier.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Limit: {tier.limit_value.toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Link to={`/admin/benefits/coverage/${tier.id}`}>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        title="Manage Coverage Items"
                                      >
                                        <FileText className="w-3 h-3" />
                                      </Button>
                                    </Link>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => openPlanTierDialog(tier)}
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => setDeleteDialog({
                                        type: "planTier",
                                        id: tier.id,
                                        name: tier.name,
                                      })}
                                    >
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
          </div>
        </TabsContent>

        {/* Coverage Options Tab */}
        <TabsContent value="options" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => openBenefitsOptionDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Coverage Option
            </Button>
          </div>

          <div className="space-y-3">
            {benefitsOptions?.map((option) => (
              <Card key={option.id} className={!option.is_active ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          {option.display_order}
                        </Badge>
                        <h3 className="font-semibold truncate">{option.name}</h3>
                        {!option.is_active && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      {option.description && (
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        Code: {option.code}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openBenefitsOptionDialog(option)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteDialog({
                          type: "benefitsOption",
                          id: option.id,
                          name: option.name,
                        })}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Benefit Type Dialog */}
      <Dialog open={benefitTypeDialog} onOpenChange={setBenefitTypeDialog}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>
              {selectedBenefitType ? "Edit" : "Add"} Benefit Type
            </DialogTitle>
            <DialogDescription>
              Configure a benefit type category
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={benefitTypeForm.code}
                  onChange={(e) => setBenefitTypeForm({ ...benefitTypeForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., IP"
                  className="uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={benefitTypeForm.display_order}
                  onChange={(e) => setBenefitTypeForm({ ...benefitTypeForm, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={benefitTypeForm.name}
                onChange={(e) => setBenefitTypeForm({ ...benefitTypeForm, name: e.target.value })}
                placeholder="e.g., In-Patient"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={benefitTypeForm.description}
                onChange={(e) => setBenefitTypeForm({ ...benefitTypeForm, description: e.target.value })}
                placeholder="Brief description of this benefit type"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Mandatory</Label>
              <Switch
                checked={benefitTypeForm.is_mandatory}
                onCheckedChange={(checked) => setBenefitTypeForm({ ...benefitTypeForm, is_mandatory: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={benefitTypeForm.is_active}
                onCheckedChange={(checked) => setBenefitTypeForm({ ...benefitTypeForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBenefitTypeDialog(false)}>Cancel</Button>
            <Button
              onClick={saveBenefitType}
              disabled={!benefitTypeForm.code || !benefitTypeForm.name || createBenefitType.isPending || updateBenefitType.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Tier Dialog */}
      <Dialog open={planTierDialog} onOpenChange={setPlanTierDialog}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>
              {selectedPlanTier ? "Edit" : "Add"} Plan Tier
            </DialogTitle>
            <DialogDescription>
              Configure a plan tier with limit value
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Benefit Type</Label>
              <Select
                value={planTierForm.benefit_type_id}
                onValueChange={(value) => setPlanTierForm({ ...planTierForm, benefit_type_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select benefit type" />
                </SelectTrigger>
                <SelectContent>
                  {benefitTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.code} - {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={planTierForm.name}
                  onChange={(e) => setPlanTierForm({ ...planTierForm, name: e.target.value })}
                  placeholder="e.g., IP 300"
                />
              </div>
              <div className="space-y-2">
                <Label>Limit Value</Label>
                <Input
                  type="number"
                  value={planTierForm.limit_value}
                  onChange={(e) => setPlanTierForm({ ...planTierForm, limit_value: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={planTierForm.display_order}
                onChange={(e) => setPlanTierForm({ ...planTierForm, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={planTierForm.is_active}
                onCheckedChange={(checked) => setPlanTierForm({ ...planTierForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanTierDialog(false)}>Cancel</Button>
            <Button
              onClick={savePlanTier}
              disabled={!planTierForm.benefit_type_id || !planTierForm.name || createPlanTier.isPending || updatePlanTier.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Benefits Option Dialog */}
      <Dialog open={benefitsOptionDialog} onOpenChange={setBenefitsOptionDialog}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>
              {selectedBenefitsOption ? "Edit" : "Add"} Coverage Option
            </DialogTitle>
            <DialogDescription>
              Configure a benefits coverage configuration
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input
                  value={benefitsOptionForm.code}
                  onChange={(e) => setBenefitsOptionForm({ ...benefitsOptionForm, code: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                  placeholder="e.g., inner_limit_all"
                />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={benefitsOptionForm.display_order}
                  onChange={(e) => setBenefitsOptionForm({ ...benefitsOptionForm, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={benefitsOptionForm.name}
                onChange={(e) => setBenefitsOptionForm({ ...benefitsOptionForm, name: e.target.value })}
                placeholder="e.g., Inner Limit For All Benefits"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={benefitsOptionForm.description}
                onChange={(e) => setBenefitsOptionForm({ ...benefitsOptionForm, description: e.target.value })}
                placeholder="Detailed description of this coverage option"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={benefitsOptionForm.is_active}
                onCheckedChange={(checked) => setBenefitsOptionForm({ ...benefitsOptionForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBenefitsOptionDialog(false)}>Cancel</Button>
            <Button
              onClick={saveBenefitsOption}
              disabled={!benefitsOptionForm.code || !benefitsOptionForm.name || createBenefitsOption.isPending || updateBenefitsOption.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog?.name}"? This action cannot be undone.
              {deleteDialog?.type === "benefitType" && (
                <span className="block mt-2 text-destructive">
                  Warning: This will also delete all associated plan tiers.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteBenefitType.isPending || deletePlanTier.isPending || deleteBenefitsOption.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
