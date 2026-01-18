import { useState } from "react";
import {
  useInsuranceCompanies,
  useCreateInsuranceCompany,
  useUpdateInsuranceCompany,
  useDeleteInsuranceCompany,
} from "@/hooks/useInsuranceCompanies";
import { Building2, Plus, Edit2, Trash2, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type InsuranceCompany = Database["public"]["Tables"]["insurance_companies"]["Row"];

export default function InsuranceCompanies() {
  const { data: companies, isLoading } = useInsuranceCompanies(false);
  const createCompany = useCreateInsuranceCompany();
  const updateCompany = useUpdateInsuranceCompany();
  const deleteCompany = useDeleteInsuranceCompany();

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<InsuranceCompany | null>(null);
  const [form, setForm] = useState({ code: "", name: "", is_active: true });
  const [searchTerm, setSearchTerm] = useState("");

  const openCreateDialog = () => {
    setSelectedCompany(null);
    setForm({ code: "", name: "", is_active: true });
    setFormDialogOpen(true);
  };

  const openEditDialog = (company: InsuranceCompany) => {
    setSelectedCompany(company);
    setForm({ code: company.code, name: company.name, is_active: company.is_active });
    setFormDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (selectedCompany) {
        await updateCompany.mutateAsync({
          id: selectedCompany.id,
          code: form.code,
          name: form.name,
          is_active: form.is_active,
        });
        toast.success("Insurance company updated");
      } else {
        await createCompany.mutateAsync({
          code: form.code,
          name: form.name,
          is_active: form.is_active,
        });
        toast.success("Insurance company created");
      }
      setFormDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    }
  };

  const openDeleteDialog = (company: InsuranceCompany) => {
    setSelectedCompany(company);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCompany) return;
    try {
      await deleteCompany.mutateAsync(selectedCompany.id);
      toast.success("Insurance company deleted");
      setDeleteDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const filteredCompanies = companies?.filter(
    (c) =>
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const stats = {
    total: companies?.length || 0,
    active: companies?.filter(c => c.is_active).length || 0,
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
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-primary p-6 md:p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 opacity-80" />
                <span className="text-sm font-medium opacity-90">Administration</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">Insurance Companies</h1>
              <p className="text-white/80 text-sm md:text-base">
                Manage insurance company master data for quotations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[80px]">
                <p className="text-2xl md:text-3xl font-bold">{stats.total}</p>
                <p className="text-xs text-white/80">Total</p>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[80px]">
                <p className="text-2xl md:text-3xl font-bold">{stats.active}</p>
                <p className="text-xs text-white/80">Active</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 bg-background"
          />
        </div>
        <Button onClick={openCreateDialog} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      </div>

      {/* Companies Table - Desktop */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            All Insurance Companies
          </CardTitle>
          <CardDescription>
            {filteredCompanies.length} of {companies?.length || 0} companies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCompanies.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No companies found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id} className={!company.is_active ? "opacity-60" : ""}>
                    <TableCell className="font-mono font-medium uppercase">{company.code}</TableCell>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>
                      <Badge variant={company.is_active ? "default" : "secondary"}>
                        {company.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(company.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(company)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeleteDialog(company)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
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

      {/* Companies Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {filteredCompanies.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No companies found</p>
            </CardContent>
          </Card>
        ) : (
          filteredCompanies.map((company) => (
            <Card key={company.id} className={`${!company.is_active ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-medium text-primary uppercase">{company.code}</span>
                      <Badge variant={company.is_active ? "default" : "secondary"} className="text-xs">
                        {company.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <h3 className="font-medium truncate">{company.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {format(new Date(company.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(company)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDeleteDialog(company)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {selectedCompany ? "Edit" : "Add"} Insurance Company
            </DialogTitle>
            <DialogDescription>
              {selectedCompany ? "Update company details" : "Add a new insurance company to the system"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Company Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g., ACA"
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">A unique short code for the company</p>
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., PT Asuransi Central Asia"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <Label className="font-normal">Active Status</Label>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setFormDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!form.code || !form.name || createCompany.isPending || updateCompany.isPending}
            >
              {(createCompany.isPending || updateCompany.isPending) ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Insurance Company
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedCompany?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteCompany.isPending}>
              {deleteCompany.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
