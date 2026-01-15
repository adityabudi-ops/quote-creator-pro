import { useState } from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { DemographicType } from "@/hooks/useMasterData";

export interface Package {
  id: string;
  name: string;
  description?: string;
  census: Record<DemographicType, number>;
}

interface PackageEditorProps {
  packages: Package[];
  onPackagesChange: (packages: Package[]) => void;
  errors?: string[];
}

const DEMOGRAPHIC_LABELS: Record<DemographicType, string> = {
  M_0_59: "Male (0-59)",
  F_0_59: "Female (0-59)",
  C_0_59: "Child (0-59)",
  M_60_64: "Male (60-64)",
  F_60_64: "Female (60-64)",
};

const DEFAULT_CENSUS: Record<DemographicType, number> = {
  M_0_59: 0,
  F_0_59: 0,
  C_0_59: 0,
  M_60_64: 0,
  F_60_64: 0,
};

export function PackageEditor({ packages, onPackagesChange, errors = [] }: PackageEditorProps) {
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const addPackage = () => {
    const newPackage: Package = {
      id: `pkg-${Date.now()}`,
      name: `Package ${String.fromCharCode(65 + packages.length)}`, // A, B, C...
      description: "",
      census: { ...DEFAULT_CENSUS },
    };
    setEditingPackage(newPackage);
    setIsDialogOpen(true);
  };

  const editPackage = (pkg: Package) => {
    setEditingPackage({ ...pkg, census: { ...pkg.census } });
    setIsDialogOpen(true);
  };

  const savePackage = () => {
    if (!editingPackage) return;

    const existingIndex = packages.findIndex(p => p.id === editingPackage.id);
    if (existingIndex >= 0) {
      const updated = [...packages];
      updated[existingIndex] = editingPackage;
      onPackagesChange(updated);
    } else {
      onPackagesChange([...packages, editingPackage]);
    }
    setEditingPackage(null);
    setIsDialogOpen(false);
  };

  const removePackage = (id: string) => {
    if (packages.length <= 1) return;
    onPackagesChange(packages.filter(p => p.id !== id));
  };

  const updateEditingCensus = (demographic: DemographicType, value: number) => {
    if (!editingPackage) return;
    setEditingPackage({
      ...editingPackage,
      census: {
        ...editingPackage.census,
        [demographic]: Math.max(0, value),
      },
    });
  };

  const getTotalLives = (census: Record<DemographicType, number>) => {
    return Object.values(census).reduce((sum, v) => sum + v, 0);
  };

  const getGrandTotalLives = () => {
    return packages.reduce((sum, pkg) => sum + getTotalLives(pkg.census), 0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Census & Package Structure</h3>
          <p className="text-sm text-muted-foreground">
            Define packages (e.g., Staff, Management) with census breakdown
          </p>
        </div>
        <Button type="button" onClick={addPackage} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Package
        </Button>
      </div>

      {/* Package Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {packages.map((pkg) => (
          <Card key={pkg.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{pkg.name}</CardTitle>
                  {pkg.description && (
                    <p className="text-xs text-muted-foreground mt-1">{pkg.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => editPackage(pkg)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removePackage(pkg.id)}
                    disabled={packages.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Age 0-59</p>
                  <div className="flex justify-between">
                    <span>Male:</span>
                    <span className="font-medium">{pkg.census.M_0_59}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Female:</span>
                    <span className="font-medium">{pkg.census.F_0_59}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Child:</span>
                    <span className="font-medium">{pkg.census.C_0_59}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Age 60-64</p>
                  <div className="flex justify-between">
                    <span>Male:</span>
                    <span className="font-medium">{pkg.census.M_60_64}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Female:</span>
                    <span className="font-medium">{pkg.census.F_60_64}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-center">
                  <p className="text-xs text-muted-foreground">Total Lives</p>
                  <p className="text-2xl font-bold text-primary">{getTotalLives(pkg.census)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium">Total Packages: {packages.length}</span>
          <span className="text-lg font-bold">Grand Total: {getGrandTotalLives()} lives</span>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((error, i) => (
            <p key={i} className="text-sm text-destructive">{error}</p>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {packages.find(p => p.id === editingPackage?.id) ? "Edit Package" : "Add Package"}
            </DialogTitle>
          </DialogHeader>

          {editingPackage && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pkg-name">Package Name *</Label>
                <Input
                  id="pkg-name"
                  value={editingPackage.name}
                  onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                  placeholder="e.g., Package A - Staff"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pkg-desc">Description (Optional)</Label>
                <Input
                  id="pkg-desc"
                  value={editingPackage.description || ""}
                  onChange={(e) => setEditingPackage({ ...editingPackage, description: e.target.value })}
                  placeholder="e.g., Regular employees"
                />
              </div>

              <div className="space-y-3">
                <Label>Census Breakdown</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Age 0-59</p>
                    {(["M_0_59", "F_0_59", "C_0_59"] as DemographicType[]).map((demo) => (
                      <div key={demo} className="flex items-center gap-2">
                        <Label className="w-16 text-xs">{DEMOGRAPHIC_LABELS[demo].split(" ")[0]}</Label>
                        <Input
                          type="number"
                          min="0"
                          className="text-center"
                          value={editingPackage.census[demo] || ""}
                          onChange={(e) => updateEditingCensus(demo, parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Age 60-64</p>
                    {(["M_60_64", "F_60_64"] as DemographicType[]).map((demo) => (
                      <div key={demo} className="flex items-center gap-2">
                        <Label className="w-16 text-xs">{DEMOGRAPHIC_LABELS[demo].split(" ")[0]}</Label>
                        <Input
                          type="number"
                          min="0"
                          className="text-center"
                          value={editingPackage.census[demo] || ""}
                          onChange={(e) => updateEditingCensus(demo, parseInt(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t flex justify-between">
                  <span className="text-sm font-medium">Total Lives</span>
                  <span className="text-lg font-bold text-primary">{getTotalLives(editingPackage.census)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  type="button"
                  onClick={savePackage}
                  disabled={!editingPackage.name || getTotalLives(editingPackage.census) === 0}
                >
                  Save Package
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
