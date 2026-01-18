import { useState, useRef } from "react";
import { Tag, Plus, Edit2, Trash2, Upload, Download, ChevronDown, ChevronRight } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  useBenefitSections,
  useBenefitItems,
  useCreateBenefitItem,
  useUpdateBenefitItem,
  useDeleteBenefitItem,
  useBulkInsertBenefitItems,
  type MasterBenefitItem,
} from "@/hooks/useMasterData";

const defaultForm = {
  item_code: "",
  section_code: "",
  item_name: "",
  unit_text: "",
  limit_period: "",
  display_order: 0,
  is_group_header: false,
  parent_item_code: "",
  sub_label: "",
  is_active: true,
};

export default function BenefitItemsManagement() {
  const { data: sections, isLoading: loadingSections } = useBenefitSections(false);
  const { data: items, isLoading: loadingItems } = useBenefitItems(undefined, false);
  
  const createItem = useCreateBenefitItem();
  const updateItem = useUpdateBenefitItem();
  const deleteItem = useDeleteBenefitItem();
  const bulkInsertItems = useBulkInsertBenefitItems();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [itemDialog, setItemDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ code: string; name: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<MasterBenefitItem | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleExpanded = (code: string) => {
    setExpandedSections(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const openItemDialog = (item?: MasterBenefitItem, sectionCode?: string) => {
    if (item) {
      setSelectedItem(item);
      setForm({
        item_code: item.item_code,
        section_code: item.section_code,
        item_name: item.item_name,
        unit_text: item.unit_text || "",
        limit_period: item.limit_period || "",
        display_order: item.display_order,
        is_group_header: item.is_group_header,
        parent_item_code: item.parent_item_code || "",
        sub_label: item.sub_label || "",
        is_active: item.is_active,
      });
    } else {
      setSelectedItem(null);
      const sectionItems = items?.filter(i => i.section_code === sectionCode) || [];
      const maxOrder = sectionItems.length > 0 ? Math.max(...sectionItems.map(i => i.display_order)) : 0;
      setForm({ ...defaultForm, section_code: sectionCode || "", display_order: maxOrder + 10 });
    }
    setItemDialog(true);
  };

  const saveItem = async () => {
    try {
      const payload = {
        item_code: form.item_code,
        section_code: form.section_code,
        item_name: form.item_name,
        unit_text: form.unit_text || null,
        limit_period: form.limit_period || null,
        display_order: form.display_order,
        is_group_header: form.is_group_header,
        parent_item_code: form.parent_item_code || null,
        sub_label: form.sub_label || null,
        is_active: form.is_active,
      };

      if (selectedItem) {
        await updateItem.mutateAsync({ item_code: selectedItem.item_code, ...payload });
        toast.success("Benefit item updated");
      } else {
        await createItem.mutateAsync(payload);
        toast.success("Benefit item created");
      }
      setItemDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog) return;
    try {
      await deleteItem.mutateAsync(deleteDialog.code);
      toast.success("Benefit item deleted");
      setDeleteDialog(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        item_code: "IP_ROOM_BOARD",
        section_code: "IP",
        item_name: "Room & Board",
        unit_text: "per day",
        limit_period: "per disability",
        display_order: 10,
        is_group_header: false,
        parent_item_code: "",
        sub_label: "",
        is_active: true,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Benefit Items");
    XLSX.writeFile(wb, "benefit_items_template.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet);

      const validRows = rows.map(row => ({
        item_code: String(row.item_code || "").trim(),
        section_code: String(row.section_code || "").trim().toUpperCase(),
        item_name: String(row.item_name || "").trim(),
        unit_text: row.unit_text ? String(row.unit_text).trim() : null,
        limit_period: row.limit_period ? String(row.limit_period).trim() : null,
        display_order: parseInt(row.display_order) || 0,
        is_group_header: row.is_group_header === true || row.is_group_header === "true",
        parent_item_code: row.parent_item_code ? String(row.parent_item_code).trim() : null,
        sub_label: row.sub_label ? String(row.sub_label).trim() : null,
        is_active: row.is_active !== false && row.is_active !== "false",
      })).filter(r => r.item_code && r.section_code && r.item_name);

      if (validRows.length === 0) {
        toast.error("No valid rows found in the file");
        return;
      }

      await bulkInsertItems.mutateAsync(validRows);
      toast.success(`${validRows.length} benefit items imported successfully`);
    } catch (error: any) {
      toast.error(error.message || "Failed to import file");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isLoading = loadingSections || loadingItems;

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

  const parentItems = items?.filter(i => i.is_group_header) || [];

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-6 md:p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-5 h-5 opacity-80" />
            <span className="text-sm font-medium opacity-90">Admin Settings</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Benefit Items Management</h1>
          <p className="text-white/80 text-sm md:text-base">
            Configure master benefit items for each section
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="justify-center">
          <Download className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Download</span> Template
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="justify-center">
          <Upload className="w-4 h-4 mr-2" />
          Bulk Import
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Sections with Items */}
      <div className="space-y-3">
        {sections?.map((section) => {
          const sectionItems = items?.filter(i => i.section_code === section.section_code) || [];
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
                          </CardTitle>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Badge variant="outline">{sectionItems.length} items</Badge>
                        <Button variant="outline" size="sm" onClick={() => openItemDialog(undefined, section.section_code)}>
                          <Plus className="w-3 h-3 mr-1" />
                          Add Item
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {sectionItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No items configured</p>
                    ) : (
                      <>
                        {/* Desktop Table */}
                        <div className="hidden lg:block">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-16">Order</TableHead>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead>Period</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sectionItems.sort((a, b) => a.display_order - b.display_order).map((item) => (
                                <TableRow key={item.item_code} className={item.is_group_header ? "bg-muted/30 font-medium" : ""}>
                                  <TableCell className="font-mono text-xs">{item.display_order}</TableCell>
                                  <TableCell className="font-mono text-xs">{item.item_code}</TableCell>
                                  <TableCell>
                                    {item.sub_label && <span className="text-muted-foreground mr-1">{item.sub_label}</span>}
                                    {item.item_name}
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">{item.unit_text || "-"}</TableCell>
                                  <TableCell className="text-muted-foreground text-sm">{item.limit_period || "-"}</TableCell>
                                  <TableCell>
                                    {item.is_group_header ? (
                                      <Badge variant="secondary">Header</Badge>
                                    ) : item.parent_item_code ? (
                                      <Badge variant="outline">Child</Badge>
                                    ) : (
                                      <Badge variant="default">Item</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={item.is_active ? "default" : "secondary"}>
                                      {item.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openItemDialog(item)}>
                                        <Edit2 className="w-3 h-3" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteDialog({ code: item.item_code, name: item.item_name })}>
                                        <Trash2 className="w-3 h-3 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="lg:hidden space-y-2">
                          {sectionItems.sort((a, b) => a.display_order - b.display_order).map((item) => (
                            <div 
                              key={item.item_code} 
                              className={`p-3 rounded-lg border ${item.is_group_header ? "bg-muted/30" : "bg-card"} ${!item.is_active ? "opacity-60" : ""}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                    <span className="font-mono text-[10px] text-muted-foreground">#{item.display_order}</span>
                                    {item.is_group_header ? (
                                      <Badge variant="secondary" className="text-[10px] h-5">Header</Badge>
                                    ) : item.parent_item_code ? (
                                      <Badge variant="outline" className="text-[10px] h-5">Child</Badge>
                                    ) : (
                                      <Badge variant="default" className="text-[10px] h-5">Item</Badge>
                                    )}
                                    {!item.is_active && (
                                      <Badge variant="secondary" className="text-[10px] h-5">Inactive</Badge>
                                    )}
                                  </div>
                                  <p className="font-medium text-sm">
                                    {item.sub_label && <span className="text-muted-foreground mr-1">{item.sub_label}</span>}
                                    {item.item_name}
                                  </p>
                                  <p className="font-mono text-[10px] text-muted-foreground mt-0.5">{item.item_code}</p>
                                  {(item.unit_text || item.limit_period) && (
                                    <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                                      {item.unit_text && <span>{item.unit_text}</span>}
                                      {item.limit_period && <span>• {item.limit_period}</span>}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openItemDialog(item)}>
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteDialog({ code: item.item_code, name: item.item_name })}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Item Dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="bg-background max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedItem ? "Edit" : "Add"} Benefit Item</DialogTitle>
            <DialogDescription>Configure benefit item details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item Code</Label>
                <Input
                  value={form.item_code}
                  onChange={(e) => setForm({ ...form, item_code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                  placeholder="e.g., IP_ROOM_BOARD"
                  disabled={!!selectedItem}
                />
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={form.section_code} onValueChange={(v) => setForm({ ...form, section_code: v })} disabled={!!selectedItem}>
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
            </div>
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input
                value={form.item_name}
                onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                placeholder="e.g., Room & Board"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit Text</Label>
                <Input
                  value={form.unit_text}
                  onChange={(e) => setForm({ ...form, unit_text: e.target.value })}
                  placeholder="e.g., per day"
                />
              </div>
              <div className="space-y-2">
                <Label>Limit Period</Label>
                <Input
                  value={form.limit_period}
                  onChange={(e) => setForm({ ...form, limit_period: e.target.value })}
                  placeholder="e.g., per disability"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Sub Label</Label>
                <Input
                  value={form.sub_label}
                  onChange={(e) => setForm({ ...form, sub_label: e.target.value })}
                  placeholder="e.g., a., b."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Parent Item (if child)</Label>
              <Select value={form.parent_item_code} onValueChange={(v) => setForm({ ...form, parent_item_code: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="None (top-level item)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level item)</SelectItem>
                  {parentItems
                    .filter(p => p.section_code === form.section_code && p.item_code !== form.item_code)
                    .map((p) => (
                      <SelectItem key={p.item_code} value={p.item_code}>
                        {p.item_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="is_group_header"
                  checked={form.is_group_header}
                  onCheckedChange={(checked) => setForm({ ...form, is_group_header: !!checked })}
                />
                <Label htmlFor="is_group_header">Is Group Header</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label>Active</Label>
                <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>Cancel</Button>
            <Button onClick={saveItem} disabled={!form.item_code || !form.section_code || !form.item_name}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteDialog?.name}"? This may affect related templates.
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