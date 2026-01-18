import { useState, useRef } from "react";
import { DollarSign, Plus, Upload, Download, Filter } from "lucide-react";
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
import { toast } from "sonner";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import {
  useCoverageRules,
  useInsurers,
  useBenefitSections,
  useTiers,
  usePricing,
  useUpsertPricing,
  useBulkUpsertPricing,
  type PricingSectionAge,
  type DemographicType,
  DEMOGRAPHIC_LABELS,
} from "@/hooks/useMasterData";

const DEMOGRAPHICS: DemographicType[] = ["M_0_59", "F_0_59", "C_0_59", "M_60_64", "F_60_64"];

export default function PricingManagement() {
  const { data: coverageRules } = useCoverageRules();
  const { data: insurers } = useInsurers();
  const { data: sections } = useBenefitSections();
  const { data: tiers } = useTiers();

  // Filters
  const [filterRule, setFilterRule] = useState<string>("");
  const [filterInsurer, setFilterInsurer] = useState<string>("");
  const [filterSection, setFilterSection] = useState<string>("");
  const [filterTier, setFilterTier] = useState<string>("");

  const { data: pricing, isLoading } = usePricing({
    coverageRuleCode: filterRule || undefined,
    insurerCode: filterInsurer || undefined,
    sectionCode: filterSection || undefined,
    tierCode: filterTier || undefined,
  });

  const upsertPricing = useUpsertPricing();
  const bulkUpsertPricing = useBulkUpsertPricing();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [priceDialog, setPriceDialog] = useState(false);

  const defaultForm = {
    coverage_rule_code: "",
    insurer_code: "",
    section_code: "",
    tier_code: "",
    effective_date: format(new Date(), "yyyy-MM-dd"),
    demographic: "M_0_59" as DemographicType,
    annual_premium: 0,
    currency: "IDR",
  };
  const [form, setForm] = useState(defaultForm);

  const filteredTiers = tiers?.filter(t => !form.section_code || t.section_code === form.section_code);

  const openPriceDialog = (row?: PricingSectionAge) => {
    if (row) {
      setForm({
        coverage_rule_code: row.coverage_rule_code,
        insurer_code: row.insurer_code,
        section_code: row.section_code,
        tier_code: row.tier_code,
        effective_date: row.effective_date,
        demographic: row.demographic,
        annual_premium: row.annual_premium,
        currency: row.currency,
      });
    } else {
      setForm(defaultForm);
    }
    setPriceDialog(true);
  };

  const savePricing = async () => {
    try {
      await upsertPricing.mutateAsync(form);
      toast.success("Pricing saved");
      setPriceDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  const downloadTemplate = () => {
    const template = DEMOGRAPHICS.map(demo => ({
      coverage_rule_code: "inner_limit_all",
      insurer_code: "ACA",
      section_code: "IP",
      tier_code: "IP300",
      effective_date: format(new Date(), "yyyy-MM-dd"),
      demographic: demo,
      annual_premium: 0,
      currency: "IDR",
    }));
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pricing");
    XLSX.writeFile(wb, "pricing_template.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet);

      const validRows: Omit<PricingSectionAge, "created_at" | "updated_at">[] = rows
        .filter(row => row.coverage_rule_code && row.insurer_code && row.section_code && row.tier_code && row.effective_date && row.demographic)
        .map(row => ({
          coverage_rule_code: String(row.coverage_rule_code).trim(),
          insurer_code: String(row.insurer_code).trim().toUpperCase(),
          section_code: String(row.section_code).trim().toUpperCase(),
          tier_code: String(row.tier_code).trim().toUpperCase(),
          effective_date: String(row.effective_date).trim(),
          demographic: String(row.demographic).trim() as DemographicType,
          annual_premium: parseFloat(row.annual_premium) || 0,
          currency: row.currency || "IDR",
        }));

      if (validRows.length === 0) {
        toast.error("No valid rows found");
        return;
      }

      await bulkUpsertPricing.mutateAsync(validRows);
      toast.success(`${validRows.length} pricing records imported`);
    } catch (error: any) {
      toast.error(error.message || "Failed to import");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Group pricing by composite key (excluding demographic)
  const groupedPricing = pricing?.reduce((acc, row) => {
    const key = `${row.coverage_rule_code}|${row.insurer_code}|${row.section_code}|${row.tier_code}|${row.effective_date}`;
    if (!acc[key]) {
      acc[key] = {
        coverage_rule_code: row.coverage_rule_code,
        insurer_code: row.insurer_code,
        section_code: row.section_code,
        tier_code: row.tier_code,
        effective_date: row.effective_date,
        currency: row.currency,
        demographics: {} as Record<DemographicType, number>,
      };
    }
    acc[key].demographics[row.demographic] = row.annual_premium;
    return acc;
  }, {} as Record<string, {
    coverage_rule_code: string;
    insurer_code: string;
    section_code: string;
    tier_code: string;
    effective_date: string;
    currency: string;
    demographics: Record<DemographicType, number>;
  }>);

  const groupedRows = Object.values(groupedPricing || {});

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
            <DollarSign className="w-5 h-5 opacity-80" />
            <span className="text-sm font-medium opacity-90">Admin Settings</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-1">Pricing Management</h1>
          <p className="text-white/80 text-sm md:text-base">
            Configure annual premiums per coverage rule, insurer, section, tier, and demographic
          </p>
        </div>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Filters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Coverage Rule</Label>
                <Select value={filterRule} onValueChange={setFilterRule}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {coverageRules?.map(r => (
                      <SelectItem key={r.coverage_rule_code} value={r.coverage_rule_code}>
                        {r.coverage_rule_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Insurer</Label>
                <Select value={filterInsurer} onValueChange={setFilterInsurer}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {insurers?.map(i => (
                      <SelectItem key={i.insurer_code} value={i.insurer_code}>
                        {i.insurer_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Section</Label>
                <Select value={filterSection} onValueChange={setFilterSection}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {sections?.map(s => (
                      <SelectItem key={s.section_code} value={s.section_code}>
                        {s.section_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tier</Label>
                <Select value={filterTier} onValueChange={setFilterTier}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {tiers?.map(t => (
                      <SelectItem key={t.tier_code} value={t.tier_code}>
                        {t.tier_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 justify-end pt-2 border-t">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Download</span> Template
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button size="sm" onClick={() => openPriceDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Pricing
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Table - Desktop */}
      <Card className="hidden lg:block">
        <CardHeader>
          <CardTitle>Pricing Records ({pricing?.length || 0} entries)</CardTitle>
          <CardDescription>Annual premiums by demographic band</CardDescription>
        </CardHeader>
        <CardContent>
          {groupedRows.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No pricing records found</p>
              <p className="text-sm text-muted-foreground/70">Add pricing or adjust filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Insurer</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Effective</TableHead>
                    {DEMOGRAPHICS.map(d => (
                      <TableHead key={d} className="text-right text-xs">{DEMOGRAPHIC_LABELS[d]}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedRows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs">{row.coverage_rule_code}</TableCell>
                      <TableCell className="font-mono text-xs">{row.insurer_code}</TableCell>
                      <TableCell>{row.section_code}</TableCell>
                      <TableCell>{row.tier_code}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(row.effective_date), "MMM d, yyyy")}
                      </TableCell>
                      {DEMOGRAPHICS.map(d => (
                        <TableCell key={d} className="text-right font-mono text-sm">
                          {row.demographics[d] != null ? row.demographics[d].toLocaleString() : "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Cards - Mobile/Tablet */}
      <div className="lg:hidden space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Pricing Records ({pricing?.length || 0})</h3>
        </div>
        {groupedRows.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No pricing records found</p>
            </CardContent>
          </Card>
        ) : (
          groupedRows.map((row, idx) => (
            <Card key={idx}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="outline" className="font-mono text-xs">{row.insurer_code}</Badge>
                  <Badge variant="secondary" className="text-xs">{row.section_code}</Badge>
                  <Badge className="text-xs">{row.tier_code}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-3">
                  <span className="font-mono">{row.coverage_rule_code}</span>
                  <span className="mx-2">•</span>
                  <span>Effective: {format(new Date(row.effective_date), "MMM d, yyyy")}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEMOGRAPHICS.map(d => (
                    <div key={d} className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">{DEMOGRAPHIC_LABELS[d]}</p>
                      <p className="font-mono text-sm font-medium">
                        {row.demographics[d] != null ? row.demographics[d].toLocaleString() : "-"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Pricing Dialog */}
      <Dialog open={priceDialog} onOpenChange={setPriceDialog}>
        <DialogContent className="bg-background max-w-md">
          <DialogHeader>
            <DialogTitle>Add Pricing</DialogTitle>
            <DialogDescription>Set annual premium for a specific combination</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Coverage Rule</Label>
                <Select value={form.coverage_rule_code} onValueChange={(v) => setForm({ ...form, coverage_rule_code: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {coverageRules?.map(r => (
                      <SelectItem key={r.coverage_rule_code} value={r.coverage_rule_code}>
                        {r.coverage_rule_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Insurer</Label>
                <Select value={form.insurer_code} onValueChange={(v) => setForm({ ...form, insurer_code: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {insurers?.map(i => (
                      <SelectItem key={i.insurer_code} value={i.insurer_code}>
                        {i.insurer_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={form.section_code} onValueChange={(v) => setForm({ ...form, section_code: v, tier_code: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {sections?.map(s => (
                      <SelectItem key={s.section_code} value={s.section_code}>
                        {s.section_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select value={form.tier_code} onValueChange={(v) => setForm({ ...form, tier_code: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {filteredTiers?.map(t => (
                      <SelectItem key={t.tier_code} value={t.tier_code}>
                        {t.tier_code}
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
                />
              </div>
              <div className="space-y-2">
                <Label>Demographic</Label>
                <Select value={form.demographic} onValueChange={(v) => setForm({ ...form, demographic: v as DemographicType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEMOGRAPHICS.map(d => (
                      <SelectItem key={d} value={d}>
                        {DEMOGRAPHIC_LABELS[d]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Annual Premium</Label>
                <Input
                  type="number"
                  value={form.annual_premium}
                  onChange={(e) => setForm({ ...form, annual_premium: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDR">IDR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceDialog(false)}>Cancel</Button>
            <Button
              onClick={savePricing}
              disabled={!form.coverage_rule_code || !form.insurer_code || !form.section_code || !form.tier_code}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}