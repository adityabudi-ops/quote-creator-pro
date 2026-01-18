import { useState, useRef } from "react";
import { FileText, Plus, Edit2, Trash2, Upload, Download, Settings, Eye } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import {
  useCoverageRules,
  useInsurers,
  useBenefitSections,
  useTiers,
  useBenefitItems,
  useScheduleTemplates,
  useScheduleTemplateItems,
  useCreateScheduleTemplate,
  useUpdateScheduleTemplate,
  useDeleteScheduleTemplate,
  useBulkUpsertScheduleTemplateItems,
  type ScheduleTemplateHeader,
  type ScheduleTemplateItem,
  type TemplateStatus,
  VALUE_TYPE_LABELS,
  type ValueType,
} from "@/hooks/useMasterData";

export default function ScheduleTemplateManagement() {
  const { data: coverageRules } = useCoverageRules();
  const { data: insurers } = useInsurers();
  const { data: sections } = useBenefitSections();
  const { data: tiers } = useTiers();
  const { data: benefitItems } = useBenefitItems();

  // Filters
  const [filterInsurer, setFilterInsurer] = useState<string>("");
  const [filterSection, setFilterSection] = useState<string>("");
  const [filterRule, setFilterRule] = useState<string>("");

  const { data: templates, isLoading } = useScheduleTemplates({
    insurerCode: filterInsurer || undefined,
    sectionCode: filterSection || undefined,
    coverageRuleCode: filterRule || undefined,
  });

  const createTemplate = useCreateScheduleTemplate();
  const updateTemplate = useUpdateScheduleTemplate();
  const deleteTemplate = useDeleteScheduleTemplate();
  const bulkUpsertItems = useBulkUpsertScheduleTemplateItems();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const { data: templateItems } = useScheduleTemplateItems(selectedTemplateId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [itemsDialog, setItemsDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<ScheduleTemplateHeader | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplateHeader | null>(null);

  const defaultForm = {
    coverage_rule_code: "",
    insurer_code: "",
    section_code: "",
    tier_code: "",
    effective_date: format(new Date(), "yyyy-MM-dd"),
    status: "ACTIVE" as TemplateStatus,
    notes: "",
  };
  const [form, setForm] = useState(defaultForm);

  const filteredTiers = tiers?.filter(t => !form.section_code || t.section_code === form.section_code);
  const filteredBenefitItems = benefitItems?.filter(i => !selectedTemplate?.section_code || i.section_code === selectedTemplate.section_code);

  const openTemplateDialog = (template?: ScheduleTemplateHeader) => {
    if (template) {
      setSelectedTemplate(template);
      setForm({
        coverage_rule_code: template.coverage_rule_code,
        insurer_code: template.insurer_code,
        section_code: template.section_code,
        tier_code: template.tier_code,
        effective_date: template.effective_date,
        status: template.status,
        notes: template.notes || "",
      });
    } else {
      setSelectedTemplate(null);
      setForm(defaultForm);
    }
    setTemplateDialog(true);
  };

  const saveTemplate = async () => {
    try {
      if (selectedTemplate) {
        await updateTemplate.mutateAsync({
          template_id: selectedTemplate.template_id,
          status: form.status,
          notes: form.notes || null,
        });
        toast.success("Template updated");
      } else {
        await createTemplate.mutateAsync({
          coverage_rule_code: form.coverage_rule_code,
          insurer_code: form.insurer_code,
          section_code: form.section_code,
          tier_code: form.tier_code,
          effective_date: form.effective_date,
          status: form.status,
          notes: form.notes || null,
        });
        toast.success("Template created");
      }
      setTemplateDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog) return;
    try {
      await deleteTemplate.mutateAsync(deleteDialog.template_id);
      toast.success("Template deleted");
      setDeleteDialog(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const openItemsDialog = (template: ScheduleTemplateHeader) => {
    setSelectedTemplate(template);
    setSelectedTemplateId(template.template_id);
    setItemsDialog(true);
  };

  const downloadItemsTemplate = () => {
    const sampleItems = filteredBenefitItems?.slice(0, 5) || [];
    const template = sampleItems.map(item => ({
      item_code: item.item_code,
      item_name: item.item_name,
      value_type: "AMOUNT",
      value_amount: 0,
      value_text: "",
      currency: "IDR",
      unit_text: item.unit_text || "",
      limit_period: item.limit_period || "",
      display_order: item.display_order,
    }));
    
    if (template.length === 0) {
      template.push({
        item_code: "ITEM_CODE",
        item_name: "Item Name",
        value_type: "AMOUNT",
        value_amount: 0,
        value_text: "",
        currency: "IDR",
        unit_text: "per day",
        limit_period: "per disability",
        display_order: 10,
      });
    }
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Items");
    XLSX.writeFile(wb, `schedule_items_template_${selectedTemplate?.template_id?.slice(0, 8) || "new"}.xlsx`);
  };

  const handleItemsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTemplateId) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet);

      const validRows: Omit<ScheduleTemplateItem, "created_at" | "updated_at" | "benefit_item">[] = rows
        .filter(row => row.item_code)
        .map(row => ({
          template_id: selectedTemplateId,
          item_code: String(row.item_code).trim(),
          value_type: (["AMOUNT", "TEXT", "BOOLEAN", "NONE"].includes(String(row.value_type)) ? row.value_type : "AMOUNT") as ValueType,
          value_amount: row.value_type === "AMOUNT" ? parseFloat(row.value_amount) || null : null,
          value_text: row.value_type === "TEXT" ? String(row.value_text || "") : null,
          currency: row.currency || "IDR",
          unit_text: row.unit_text || null,
          limit_period: row.limit_period || null,
          display_order: parseInt(row.display_order) || 0,
        }));

      if (validRows.length === 0) {
        toast.error("No valid rows found");
        return;
      }

      await bulkUpsertItems.mutateAsync(validRows);
      toast.success(`${validRows.length} items imported`);
    } catch (error: any) {
      toast.error(error.message || "Failed to import");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-6 md:p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 opacity-80" />
            <span className="text-sm font-medium opacity-90">Admin Settings</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Schedule Templates</h1>
          <p className="text-white/80 text-sm md:text-base">
            Configure benefit schedule templates per coverage rule, insurer, section, and tier
          </p>
        </div>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Coverage Rule</Label>
                <Select value={filterRule} onValueChange={setFilterRule}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All rules" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All rules</SelectItem>
                    {coverageRules?.map(r => (
                      <SelectItem key={r.coverage_rule_code} value={r.coverage_rule_code}>
                        {r.coverage_rule_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Insurer</Label>
                <Select value={filterInsurer} onValueChange={setFilterInsurer}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All insurers" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All insurers</SelectItem>
                    {insurers?.map(i => (
                      <SelectItem key={i.insurer_code} value={i.insurer_code}>
                        {i.insurer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Section</Label>
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All sections" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sections</SelectItem>
                    {sections?.map(s => (
                      <SelectItem key={s.section_code} value={s.section_code}>
                        {s.section_code} - {s.section_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t">
              <Button onClick={() => openTemplateDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table - Desktop */}
      <Card className="hidden lg:block">
        <CardHeader>
          <CardTitle>Templates ({templates?.length || 0})</CardTitle>
          <CardDescription>Manage benefit schedule templates with effective dates</CardDescription>
        </CardHeader>
        <CardContent>
          {templates?.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No templates found</p>
              <p className="text-sm text-muted-foreground/70">Create your first template</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coverage Rule</TableHead>
                  <TableHead>Insurer</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates?.map((template) => (
                  <TableRow key={template.template_id}>
                    <TableCell className="font-mono text-xs">{template.coverage_rule_code}</TableCell>
                    <TableCell>{template.insurer?.insurer_name || template.insurer_code}</TableCell>
                    <TableCell>{template.section?.section_name || template.section_code}</TableCell>
                    <TableCell>{template.tier?.tier_label || template.tier_code}</TableCell>
                    <TableCell>{format(new Date(template.effective_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant={template.status === "ACTIVE" ? "default" : "secondary"}>
                        {template.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openItemsDialog(template)} title="Manage Items">
                          <Settings className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openTemplateDialog(template)} title="Edit">
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteDialog(template)} title="Delete">
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Templates Cards - Mobile/Tablet */}
      <div className="lg:hidden space-y-3">
        <h3 className="font-semibold">Templates ({templates?.length || 0})</h3>
        {templates?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No templates found</p>
            </CardContent>
          </Card>
        ) : (
          templates?.map((template) => (
            <Card key={template.template_id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">{template.insurer?.insurer_name || template.insurer_code}</Badge>
                      <Badge variant="secondary" className="text-xs">{template.section?.section_name || template.section_code}</Badge>
                      <Badge variant={template.status === "ACTIVE" ? "default" : "secondary"} className="text-xs">
                        {template.status}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm">{template.tier?.tier_label || template.tier_code}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      <span className="font-mono">{template.coverage_rule_code}</span>
                      <span className="mx-2">•</span>
                      <span>Effective: {format(new Date(template.effective_date), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openItemsDialog(template)}>
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openTemplateDialog(template)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteDialog(template)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Template Header Dialog */}
      <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <DialogContent className="bg-background max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? "Edit" : "Create"} Template</DialogTitle>
            <DialogDescription>Configure template header settings</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Coverage Rule</Label>
                <Select value={form.coverage_rule_code} onValueChange={(v) => setForm({ ...form, coverage_rule_code: v })} disabled={!!selectedTemplate}>
                  <SelectTrigger><SelectValue placeholder="Select rule" /></SelectTrigger>
                  <SelectContent>
                    {coverageRules?.map(r => (
                      <SelectItem key={r.coverage_rule_code} value={r.coverage_rule_code}>
                        {r.coverage_rule_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Insurer</Label>
                <Select value={form.insurer_code} onValueChange={(v) => setForm({ ...form, insurer_code: v })} disabled={!!selectedTemplate}>
                  <SelectTrigger><SelectValue placeholder="Select insurer" /></SelectTrigger>
                  <SelectContent>
                    {insurers?.map(i => (
                      <SelectItem key={i.insurer_code} value={i.insurer_code}>
                        {i.insurer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={form.section_code} onValueChange={(v) => setForm({ ...form, section_code: v, tier_code: "" })} disabled={!!selectedTemplate}>
                  <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                  <SelectContent>
                    {sections?.map(s => (
                      <SelectItem key={s.section_code} value={s.section_code}>
                        {s.section_code} - {s.section_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select value={form.tier_code} onValueChange={(v) => setForm({ ...form, tier_code: v })} disabled={!!selectedTemplate}>
                  <SelectTrigger><SelectValue placeholder="Select tier" /></SelectTrigger>
                  <SelectContent>
                    {filteredTiers?.map(t => (
                      <SelectItem key={t.tier_code} value={t.tier_code}>
                        {t.tier_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={form.effective_date}
                  onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
                  disabled={!!selectedTemplate}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TemplateStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialog(false)}>Cancel</Button>
            <Button 
              onClick={saveTemplate} 
              disabled={!selectedTemplate && (!form.coverage_rule_code || !form.insurer_code || !form.section_code || !form.tier_code)}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Items Management Dialog */}
      <Dialog open={itemsDialog} onOpenChange={setItemsDialog}>
        <DialogContent className="bg-background max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Items</DialogTitle>
            <DialogDescription>
              {selectedTemplate && `${selectedTemplate.insurer_code} - ${selectedTemplate.section_code} - ${selectedTemplate.tier_code}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={downloadItemsTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Bulk Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleItemsUpload}
            />
          </div>
          {templateItems?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No items configured. Import items via Excel or add them manually.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templateItems?.sort((a, b) => a.display_order - b.display_order).map((item) => (
                  <TableRow key={item.item_code}>
                    <TableCell className="font-mono text-xs">{item.display_order}</TableCell>
                    <TableCell className="font-mono text-xs">{item.item_code}</TableCell>
                    <TableCell>{item.benefit_item?.item_name || item.item_code}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{VALUE_TYPE_LABELS[item.value_type]}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.value_type === "AMOUNT" && item.value_amount != null
                        ? `${item.currency || "IDR"} ${item.value_amount.toLocaleString()}`
                        : item.value_type === "TEXT"
                        ? item.value_text
                        : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{item.unit_text || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? All associated items will also be deleted.
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