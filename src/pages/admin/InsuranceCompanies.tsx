import { useState } from "react";
import {
  useInsuranceCompanies,
  useCreateInsuranceCompany,
  useUpdateInsuranceCompany,
  useDeleteInsuranceCompany,
} from "@/hooks/useInsuranceCompanies";
import { Building2, Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
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

  const stats = {
    total: companies?.length || 0,
    active: companies?.filter(c => c.is_active).length || 0,
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Insurance Companies</h1>
          <p className="text-muted-foreground">Manage insurance companies for quotations</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Company
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Companies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-700">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active Companies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            All Insurance Companies
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              {companies?.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-mono font-medium uppercase">{company.code}</TableCell>
                  <TableCell>{company.name}</TableCell>
                  <TableCell>
                    <Badge variant={company.is_active ? "default" : "secondary"}>
                      {company.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(company.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(company)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(company)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>{selectedCompany ? "Edit" : "Add"} Insurance Company</DialogTitle>
            <DialogDescription>
              {selectedCompany ? "Update company details" : "Add a new insurance company"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toLowerCase() })}
                placeholder="e.g., aca"
                className="uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., PT Asuransi Central Asia"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!form.code || !form.name || createCompany.isPending || updateCompany.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Delete Insurance Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCompany?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteCompany.isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
