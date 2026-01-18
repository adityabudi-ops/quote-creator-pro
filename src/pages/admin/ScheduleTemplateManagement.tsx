import { useState, useRef } from "react";
import { FileText, Plus, Edit2, Trash2, Upload, Download, Settings, Layers, Building2, Calendar, CheckCircle2, XCircle } from "lucide-react";
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

  // Stats
  const activeTemplates = templates?.filter(t => t.status === "ACTIVE").length || 0;
  const uniqueInsurers = new Set(templates?.map(t => t.insurer_code) || []).size;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading templates...</p>
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
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 opacity-80" />
                <span className="text-sm font-medium opacity-90">Administration</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Schedule Templates</h1>
              <p className="text-white/80 text-sm md:text-base max-w-xl">
                Configure benefit schedule templates per coverage rule, insurer, section, and tier
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[100px]">
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="w-4 h-4 opacity-70" />
                  <span className="text-2xl font-bold">{templates?.length || 0}</span>
                </div>
                <p className="text-xs text-white/70">Templates</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[100px]">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 opacity-70" />
                  <span className="text-2xl font-bold">{activeTemplates}</span>
                </div>
                <p className="text-xs text-white/70">Active</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[100px]">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 opacity-70" />
                  <span className="text-2xl font-bold">{uniqueInsurers}</span>
                </div>
                <p className="text-xs text-white/70">Insurers</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Actions Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-end">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Coverage Rule</Label>
                <Select value={filterRule} onValueChange={setFilterRule}>
                  <SelectTrigger className="h-9 bg-muted/30 border-0"><SelectValue placeholder="All rules" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rules</SelectItem>
                    {coverageRules?.map(r => (
                      <SelectItem key={r.coverage_rule_code} value={r.coverage_rule_code}>
                        {r.coverage_rule_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Insurer</Label>
                <Select value={filterInsurer} onValueChange={setFilterInsurer}>
                  <SelectTrigger className="h-9 bg-muted/30 border-0"><SelectValue placeholder="All insurers" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Insurers</SelectItem>
                    {insurers?.map(i => (
                      <SelectItem key={i.insurer_code} value={i.insurer_code}>
                        {i.insurer_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Section</Label>
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger className="h-9 bg-muted/30 border-0"><SelectValue placeholder="All sections" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {sections?.map(s => (
                      <SelectItem key={s.section_code} value={s.section_code}>
                        {s.section_code} - {s.section_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={() => openTemplateDialog()} className="shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              New Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {templates?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No templates found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first schedule template to get started
            </p>
            <Button onClick={() => openTemplateDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates?.map((template) => (
            <Card 
              key={template.template_id} 
              className={`group hover:shadow-lg transition-all duration-300 overflow-hidden ${
                template.status !== "ACTIVE" ? "opacity-70" : ""
              }`}
            >
              {/* Status Indicator */}
              <div className={`h-1 ${template.status === "ACTIVE" ? "bg-emerald-500" : "bg-muted"}`} />
              
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <Badge variant="default" className="text-xs font-semibold">
                        {template.insurer?.insurer_name || template.insurer_code}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {template.section?.section_code || template.section_code}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm">
                      {template.tier?.tier_label || template.tier_code}
                    </h3>
                  </div>
                  <Badge 
                    variant={template.status === "ACTIVE" ? "default" : "secondary"}
                    className={`shrink-0 ${template.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}`}
                  >
                    {template.status === "ACTIVE" ? (
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                    ) : (
                      <XCircle className="w-3 h-3 mr-1" />
                    )}
                    {template.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" />
                    <span className="font-mono">{template.coverage_rule_code}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Effective: {format(new Date(template.effective_date), "MMM d, yyyy")}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => openItemsDialog(template)}
                  >
                    <Settings className="w-3.5 h-3.5 mr-1.5" />
                    Items
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => openTemplateDialog(template)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteDialog(template)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Template Header Dialog */}
      <Dialog open={templateDialog} onOpenChange={setTemplateDialog}>
        <DialogContent className="bg-background sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {selectedTemplate ? "Edit" : "Create"} Template
            </DialogTitle>
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
                    <SelectItem value="ACTIVE">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Active
                      </span>
                    </SelectItem>
                    <SelectItem value="INACTIVE">
                      <span className="flex items-center gap-2">
                        <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        Inactive
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setTemplateDialog(false)}>Cancel</Button>
            <Button
              onClick={saveTemplate}
              disabled={
                (!selectedTemplate && (!form.coverage_rule_code || !form.insurer_code || !form.section_code || !form.tier_code)) ||
                createTemplate.isPending ||
                updateTemplate.isPending
              }
            >
              {(createTemplate.isPending || updateTemplate.isPending) ? "Saving..." : "Save Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Items Dialog */}
      <Dialog open={itemsDialog} onOpenChange={setItemsDialog}>
        <DialogContent className="bg-background max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Manage Template Items
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.insurer?.insurer_name || selectedTemplate?.insurer_code} • {selectedTemplate?.section?.section_name || selectedTemplate?.section_code} • {selectedTemplate?.tier?.tier_label || selectedTemplate?.tier_code}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-wrap gap-2 py-3 border-b">
            <Button variant="outline" size="sm" onClick={downloadItemsTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Import Items
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleItemsUpload}
            />
          </div>

          <div className="flex-1 overflow-auto">
            {templateItems?.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">No items configured</p>
                <p className="text-sm text-muted-foreground/70">Import items using the template above</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Order</TableHead>
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
                      <TableCell className="text-sm">{item.benefit_item?.item_name || item.item_code}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{VALUE_TYPE_LABELS[item.value_type]}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {item.value_type === "AMOUNT" && item.value_amount != null
                          ? `${item.currency} ${item.value_amount.toLocaleString()}`
                          : item.value_type === "TEXT"
                          ? item.value_text
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.unit_text || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setItemsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Template
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the template for{" "}
              <strong>{deleteDialog?.insurer?.insurer_name || deleteDialog?.insurer_code}</strong> •{" "}
              <strong>{deleteDialog?.tier?.tier_label || deleteDialog?.tier_code}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteTemplate.isPending}>
              {deleteTemplate.isPending ? "Deleting..." : "Delete Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
