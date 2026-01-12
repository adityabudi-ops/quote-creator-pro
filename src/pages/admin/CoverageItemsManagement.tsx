import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, Edit2, Trash2, DollarSign, Percent, Ban, CheckCircle2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  usePlanTiers,
  useBenefitsOptions,
  useCoverageItems,
  useCreateCoverageItem,
  useUpdateCoverageItem,
  useDeleteCoverageItem,
  useUpsertCoverageValue,
  usePlanTierOptions,
  useSetPlanTierOptions,
  type CoverageItem,
  type CoverageValue,
} from "@/hooks/useBenefitsManagement";

type ValueType = 'amount' | 'percentage' | 'as_charged' | 'not_covered';

const VALUE_TYPE_LABELS: Record<ValueType, string> = {
  amount: "Amount",
  percentage: "Percentage",
  as_charged: "As Charged",
  not_covered: "Not Covered",
};

export default function CoverageItemsManagement() {
  const { planTierId } = useParams<{ planTierId: string }>();
  
  const { data: planTiers } = usePlanTiers(undefined, false);
  const { data: benefitsOptions } = useBenefitsOptions(true);
  const { data: coverageItems, isLoading } = useCoverageItems(planTierId, false);
  const { data: planTierOptions } = usePlanTierOptions(planTierId);
  
  const createCoverageItem = useCreateCoverageItem();
  const updateCoverageItem = useUpdateCoverageItem();
  const deleteCoverageItem = useDeleteCoverageItem();
  const upsertCoverageValue = useUpsertCoverageValue();
  const setPlanTierOptions = useSetPlanTierOptions();
  
  const [itemDialog, setItemDialog] = useState(false);
  const [valueDialog, setValueDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);
  const [optionsDialog, setOptionsDialog] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<CoverageItem | null>(null);
  const [selectedValueItem, setSelectedValueItem] = useState<CoverageItem | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [selectedOptionsIds, setSelectedOptionsIds] = useState<string[]>([]);
  
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    display_order: 0,
    is_active: true,
  });
  
  const [valueForm, setValueForm] = useState({
    value: 0,
    value_type: "amount" as ValueType,
    notes: "",
  });
  
  const planTier = planTiers?.find(pt => pt.id === planTierId);
  
  // Get the linked options for this plan tier (or show all if none linked)
  const linkedOptionIds = useMemo(() => 
    planTierOptions?.map(pto => pto.benefits_option_id) || [],
    [planTierOptions]
  );
  
  const displayedOptions = useMemo(() => {
    if (!benefitsOptions) return [];
    // If no options are linked yet, show all options
    if (linkedOptionIds.length === 0) return benefitsOptions;
    // Otherwise, show only linked options
    return benefitsOptions.filter(opt => linkedOptionIds.includes(opt.id));
  }, [benefitsOptions, linkedOptionIds]);
  
  const openOptionsDialog = () => {
    setSelectedOptionsIds(linkedOptionIds);
    setOptionsDialog(true);
  };
  
  const saveOptions = async () => {
    if (!planTierId) return;
    try {
      await setPlanTierOptions.mutateAsync({
        planTierId,
        optionIds: selectedOptionsIds,
      });
      toast.success("Coverage options updated");
      setOptionsDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save options");
    }
  };

  
  const openItemDialog = (item?: CoverageItem) => {
    if (item) {
      setSelectedItem(item);
      setItemForm({
        name: item.name,
        description: item.description || "",
        display_order: item.display_order,
        is_active: item.is_active,
      });
    } else {
      setSelectedItem(null);
      setItemForm({
        name: "",
        description: "",
        display_order: (coverageItems?.length || 0) + 1,
        is_active: true,
      });
    }
    setItemDialog(true);
  };
  
  const saveItem = async () => {
    if (!planTierId) return;
    try {
      if (selectedItem) {
        await updateCoverageItem.mutateAsync({
          id: selectedItem.id,
          ...itemForm,
        });
        toast.success("Coverage item updated");
      } else {
        await createCoverageItem.mutateAsync({
          plan_tier_id: planTierId,
          ...itemForm,
        });
        toast.success("Coverage item created");
      }
      setItemDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };
  
  const openValueDialog = (item: CoverageItem, optionId: string) => {
    setSelectedValueItem(item);
    setSelectedOptionId(optionId);
    
    const existingValue = item.coverage_values?.find(
      cv => cv.benefits_option_id === optionId
    );
    
    if (existingValue) {
      setValueForm({
        value: existingValue.value,
        value_type: existingValue.value_type,
        notes: existingValue.notes || "",
      });
    } else {
      setValueForm({
        value: 0,
        value_type: "amount",
        notes: "",
      });
    }
    setValueDialog(true);
  };
  
  const saveValue = async () => {
    if (!selectedValueItem || !selectedOptionId) return;
    try {
      await upsertCoverageValue.mutateAsync({
        coverage_item_id: selectedValueItem.id,
        benefits_option_id: selectedOptionId,
        value: valueForm.value,
        value_type: valueForm.value_type,
        notes: valueForm.notes || null,
      });
      toast.success("Coverage value saved");
      setValueDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };
  
  const confirmDelete = async () => {
    if (!deleteDialog) return;
    try {
      await deleteCoverageItem.mutateAsync(deleteDialog.id);
      toast.success("Coverage item deleted");
      setDeleteDialog(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };
  
  const formatValue = (cv: CoverageValue | undefined) => {
    if (!cv) return "-";
    switch (cv.value_type) {
      case "amount":
        return `Rp ${cv.value.toLocaleString()}`;
      case "percentage":
        return `${cv.value}%`;
      case "as_charged":
        return "As Charged";
      case "not_covered":
        return "Not Covered";
      default:
        return cv.value.toString();
    }
  };
  
  const getValueIcon = (valueType: ValueType) => {
    switch (valueType) {
      case "amount":
        return <DollarSign className="w-4 h-4" />;
      case "percentage":
        return <Percent className="w-4 h-4" />;
      case "as_charged":
        return <CheckCircle2 className="w-4 h-4" />;
      case "not_covered":
        return <Ban className="w-4 h-4" />;
    }
  };
  
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
  
  if (!planTier) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold text-foreground mb-2">Plan Tier Not Found</h1>
        <Link to="/admin/benefits">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Benefits Management
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/admin/benefits">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Coverage Items</h1>
          <p className="text-muted-foreground">
            Configure coverage items and values for{" "}
            <span className="font-semibold text-primary">{planTier.name}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openOptionsDialog}>
            <Settings2 className="w-4 h-4 mr-2" />
            Configure Options
            {linkedOptionIds.length > 0 && (
              <Badge variant="secondary" className="ml-2">{linkedOptionIds.length}</Badge>
            )}
          </Button>
          <Button onClick={() => openItemDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Coverage Item
          </Button>
        </div>
      </div>

      {/* Coverage Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Coverage Items for {planTier.name}</CardTitle>
          <CardDescription>
            Click on a cell to set/edit the value for each coverage option
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coverageItems?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No coverage items configured yet.</p>
              <Button variant="outline" className="mt-4" onClick={() => openItemDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Coverage Item
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[250px]">Coverage Item</TableHead>
                    {displayedOptions.map((option) => (
                      <TableHead key={option.id} className="min-w-[180px] text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {option.code}
                          </Badge>
                          <div className="text-xs font-normal text-muted-foreground leading-tight max-w-[170px]" title={option.name}>
                            {option.name}
                          </div>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coverageItems?.map((item) => (
                    <TableRow key={item.id} className={!item.is_active ? "opacity-50" : ""}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                              {item.description}
                            </p>
                          )}
                          {!item.is_active && (
                            <Badge variant="secondary" className="text-xs mt-1">Inactive</Badge>
                          )}
                        </div>
                      </TableCell>
                      {displayedOptions.map((option) => {
                        const cv = item.coverage_values?.find(
                          v => v.benefits_option_id === option.id
                        );
                        return (
                          <TableCell
                            key={option.id}
                            className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => openValueDialog(item, option.id)}
                          >
                            <span className={cv ? "font-medium" : "text-muted-foreground"}>
                              {formatValue(cv)}
                            </span>
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openItemDialog(item)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDeleteDialog({ id: item.id, name: item.name })}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Coverage Item Dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? "Edit" : "Add"} Coverage Item
            </DialogTitle>
            <DialogDescription>
              Configure a coverage item for {planTier.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="e.g., Biaya Kamar dan Menginap, maks. 365 hari, per-hari"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Additional details about this coverage item"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                value={itemForm.display_order}
                onChange={(e) => setItemForm({ ...itemForm, display_order: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={itemForm.is_active}
                onCheckedChange={(checked) => setItemForm({ ...itemForm, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>Cancel</Button>
            <Button
              onClick={saveItem}
              disabled={!itemForm.name || createCoverageItem.isPending || updateCoverageItem.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coverage Value Dialog */}
      <Dialog open={valueDialog} onOpenChange={setValueDialog}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Set Coverage Value</DialogTitle>
            <DialogDescription>
              {selectedValueItem?.name}
              <br />
              <span className="text-xs">
                Option: {benefitsOptions?.find(o => o.id === selectedOptionId)?.name}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Value Type</Label>
              <Select
                value={valueForm.value_type}
                onValueChange={(v) => setValueForm({ ...valueForm, value_type: v as ValueType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(VALUE_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {getValueIcon(key as ValueType)}
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {(valueForm.value_type === "amount" || valueForm.value_type === "percentage") && (
              <div className="space-y-2">
                <Label>
                  {valueForm.value_type === "amount" ? "Amount (Rp)" : "Percentage (%)"}
                </Label>
                <Input
                  type="number"
                  value={valueForm.value}
                  onChange={(e) => setValueForm({ ...valueForm, value: parseFloat(e.target.value) || 0 })}
                  placeholder={valueForm.value_type === "amount" ? "e.g., 300000" : "e.g., 80"}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={valueForm.notes}
                onChange={(e) => setValueForm({ ...valueForm, notes: e.target.value })}
                placeholder="Additional notes for this value"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValueDialog(false)}>Cancel</Button>
            <Button
              onClick={saveValue}
              disabled={upsertCoverageValue.isPending}
            >
              Save Value
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Delete Coverage Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog?.name}"? 
              This will also delete all associated values.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteCoverageItem.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coverage Options Configuration Dialog */}
      <Dialog open={optionsDialog} onOpenChange={setOptionsDialog}>
        <DialogContent className="bg-background max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Coverage Options</DialogTitle>
            <DialogDescription>
              Select which coverage options apply to {planTier?.name}. 
              Only selected options will be shown in the coverage values table.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {benefitsOptions?.map((option) => (
              <div 
                key={option.id} 
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`option-${option.id}`}
                  checked={selectedOptionsIds.includes(option.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedOptionsIds([...selectedOptionsIds, option.id]);
                    } else {
                      setSelectedOptionsIds(selectedOptionsIds.filter(id => id !== option.id));
                    }
                  }}
                />
                <div className="flex-1">
                  <label 
                    htmlFor={`option-${option.id}`} 
                    className="font-medium cursor-pointer"
                  >
                    {option.name}
                  </label>
                  <Badge variant="outline" className="ml-2 font-mono text-[10px]">
                    {option.code}
                  </Badge>
                  {option.description && (
                    <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOptionsDialog(false)}>Cancel</Button>
            <Button
              onClick={saveOptions}
              disabled={setPlanTierOptions.isPending}
            >
              Save Options ({selectedOptionsIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
