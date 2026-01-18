import { useState, useRef } from "react";
import { DollarSign, Plus, Upload, Download, Filter, TrendingUp, Users, Calendar, Building2 } from "lucide-react";
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

const DEMOGRAPHIC_ICONS: Record<DemographicType, string> = {
  M_0_59: "👨",
  F_0_59: "👩",
  C_0_59: "👶",
  M_60_64: "👴",
  F_60_64: "👵",
};

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

  // Stats
  const uniqueInsurers = new Set(pricing?.map(p => p.insurer_code) || []).size;
  const uniqueTiers = new Set(pricing?.map(p => p.tier_code) || []).size;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading pricing data...</p>
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
                <DollarSign className="w-5 h-5 opacity-80" />
                <span className="text-sm font-medium opacity-90">Administration</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Pricing Management</h1>
              <p className="text-white/80 text-sm md:text-base max-w-xl">
                Configure annual premiums by coverage rule, insurer, section, tier, and demographic band
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap gap-3">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[100px]">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 opacity-70" />
                  <span className="text-2xl font-bold">{pricing?.length || 0}</span>
                </div>
                <p className="text-xs text-white/70">Records</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[100px]">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 opacity-70" />
                  <span className="text-2xl font-bold">{uniqueInsurers}</span>
                </div>
                <p className="text-xs text-white/70">Insurers</p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 min-w-[100px]">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 opacity-70" />
                  <span className="text-2xl font-bold">{uniqueTiers}</span>
                </div>
                <p className="text-xs text-white/70">Tiers</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Filters Card */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">Filters</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Coverage Rule</Label>
                <Select value={filterRule} onValueChange={setFilterRule}>
                  <SelectTrigger className="h-9 bg-muted/30 border-0"><SelectValue placeholder="All" /></SelectTrigger>
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
                  <SelectTrigger className="h-9 bg-muted/30 border-0"><SelectValue placeholder="All" /></SelectTrigger>
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
                  <SelectTrigger className="h-9 bg-muted/30 border-0"><SelectValue placeholder="All" /></SelectTrigger>
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
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tier</Label>
                <Select value={filterTier} onValueChange={setFilterTier}>
                  <SelectTrigger className="h-9 bg-muted/30 border-0"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    {tiers?.map(t => (
                      <SelectItem key={t.tier_code} value={t.tier_code}>
                        {t.tier_label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card className="lg:w-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="flex-1 lg:flex-none">
                <Download className="w-4 h-4 mr-2" />
                Template
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1 lg:flex-none">
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
              <Button size="sm" onClick={() => openPriceDialog()} className="flex-1 lg:flex-none">
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Grid */}
      {groupedRows.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No pricing records found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add pricing records or adjust your filters to see results
            </p>
            <Button onClick={() => openPriceDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Pricing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {groupedRows.map((row, idx) => (
            <Card key={idx} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
              {/* Card Header */}
              <div className="p-4 bg-muted/30 border-b">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <Badge variant="default" className="text-xs font-semibold">{row.insurer_code}</Badge>
                      <Badge variant="secondary" className="text-xs">{row.section_code}</Badge>
                      <Badge variant="outline" className="text-xs font-mono">{row.tier_code}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{row.coverage_rule_code}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(row.effective_date), "MMM yyyy")}
                  </div>
                </div>
              </div>

              {/* Demographics Grid */}
              <CardContent className="p-4">
                <div className="grid grid-cols-5 gap-2">
                  {DEMOGRAPHICS.map(d => (
                    <div 
                      key={d} 
                      className="text-center p-2 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                    >
                      <span className="text-lg mb-0.5 block">{DEMOGRAPHIC_ICONS[d]}</span>
                      <p className="font-mono text-sm font-semibold">
                        {row.demographics[d] != null 
                          ? (row.demographics[d] / 1000000).toFixed(1) + "M"
                          : "-"
                        }
                      </p>
                      <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">
                        {DEMOGRAPHIC_LABELS[d].split(' ')[0]}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Pricing Dialog */}
      <Dialog open={priceDialog} onOpenChange={setPriceDialog}>
        <DialogContent className="bg-background sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Add Pricing Record
            </DialogTitle>
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
                        {r.coverage_rule_name}
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
                <Select value={form.section_code} onValueChange={(v) => setForm({ ...form, section_code: v, tier_code: "" })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                <Select value={form.tier_code} onValueChange={(v) => setForm({ ...form, tier_code: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                />
              </div>
              <div className="space-y-2">
                <Label>Demographic</Label>
                <Select value={form.demographic} onValueChange={(v) => setForm({ ...form, demographic: v as DemographicType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEMOGRAPHICS.map(d => (
                      <SelectItem key={d} value={d}>
                        <span className="flex items-center gap-2">
                          <span>{DEMOGRAPHIC_ICONS[d]}</span>
                          {DEMOGRAPHIC_LABELS[d]}
                        </span>
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
                  placeholder="0"
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
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPriceDialog(false)}>Cancel</Button>
            <Button
              onClick={savePricing}
              disabled={
                !form.coverage_rule_code ||
                !form.insurer_code ||
                !form.section_code ||
                !form.tier_code ||
                upsertPricing.isPending
              }
            >
              {upsertPricing.isPending ? "Saving..." : "Save Pricing"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
