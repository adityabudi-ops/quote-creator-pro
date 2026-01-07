import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMonths } from "date-fns";
import { CalendarIcon, Plus, Trash2, FileText, ArrowLeft, ArrowRight, Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { InsuredGroup } from "@/types/quotation";

const quotationSchema = z.object({
  insuredName: z.string().min(1, "Insured name is required").max(200, "Name too long"),
  insuredAddress: z.string().min(1, "Address is required").max(500, "Address too long"),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
  inPatient: z.boolean(),
  outPatient: z.boolean(),
  dental: z.boolean(),
  maternity: z.boolean(),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
}).refine((data) => data.inPatient || data.outPatient || data.dental || data.maternity, {
  message: "At least one benefit must be selected",
  path: ["inPatient"],
}).refine((data) => {
  // Out-Patient, Dental, Maternity require In-Patient
  if ((data.outPatient || data.dental || data.maternity) && !data.inPatient) {
    return false;
  }
  return true;
}, {
  message: "Out-Patient, Dental, and Maternity require In-Patient coverage",
  path: ["inPatient"],
});

type QuotationFormData = z.infer<typeof quotationSchema>;

const steps = [
  { id: 1, title: "Insured Information" },
  { id: 2, title: "Policy Period" },
  { id: 3, title: "Benefits" },
  { id: 4, title: "Group Structure" },
  { id: 5, title: "Review" },
];

export function QuotationForm() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [insuredGroups, setInsuredGroups] = useState<InsuredGroup[]>([
    { id: "1", planName: "", numberOfMembers: 0 },
  ]);
  const [groupErrors, setGroupErrors] = useState<string[]>([]);

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      insuredName: "",
      insuredAddress: "",
      startDate: new Date(),
      endDate: addMonths(new Date(), 12),
      inPatient: false,
      outPatient: false,
      dental: false,
      maternity: false,
    },
  });

  const watchInPatient = form.watch("inPatient");

  const addGroup = () => {
    setInsuredGroups([
      ...insuredGroups,
      { id: Date.now().toString(), planName: "", numberOfMembers: 0 },
    ]);
  };

  const removeGroup = (id: string) => {
    if (insuredGroups.length > 1) {
      setInsuredGroups(insuredGroups.filter((g) => g.id !== id));
    }
  };

  const updateGroup = (id: string, field: keyof InsuredGroup, value: string | number) => {
    setInsuredGroups(
      insuredGroups.map((g) =>
        g.id === id ? { ...g, [field]: value } : g
      )
    );
  };

  const validateGroups = (): boolean => {
    const errors: string[] = [];
    const planNames = new Set<string>();

    insuredGroups.forEach((group, index) => {
      if (!group.planName.trim()) {
        errors.push(`Plan name is required for row ${index + 1}`);
      } else if (planNames.has(group.planName.toLowerCase())) {
        errors.push(`Duplicate plan name: ${group.planName}`);
      } else {
        planNames.add(group.planName.toLowerCase());
      }

      if (group.numberOfMembers <= 0) {
        errors.push(`Number of members must be positive for ${group.planName || `row ${index + 1}`}`);
      }
    });

    setGroupErrors(errors);
    return errors.length === 0;
  };

  const nextStep = async () => {
    let isValid = true;

    if (currentStep === 1) {
      isValid = await form.trigger(["insuredName", "insuredAddress"]);
    } else if (currentStep === 2) {
      isValid = await form.trigger(["startDate", "endDate"]);
    } else if (currentStep === 3) {
      isValid = await form.trigger(["inPatient", "outPatient", "dental", "maternity"]);
    } else if (currentStep === 4) {
      isValid = validateGroups();
    }

    if (isValid && currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = (data: QuotationFormData) => {
    if (!validateGroups()) {
      toast.error("Please fix group structure errors");
      return;
    }

    const quotation = {
      ...data,
      insuredGroups,
      id: Date.now().toString(),
      status: "draft" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: "John Doe",
      version: 1,
    };

    console.log("Quotation submitted:", quotation);
    toast.success("Quotation created successfully!");
    navigate("/");
  };

  const totalMembers = insuredGroups.reduce((sum, g) => sum + (g.numberOfMembers || 0), 0);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  currentStep >= step.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {step.id}
              </div>
              <span
                className={cn(
                  "ml-2 text-sm font-medium hidden sm:block",
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-12 h-0.5 mx-4",
                    currentStep > step.id ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Step 1: Insured Information */}
          {currentStep === 1 && (
            <Card className="form-section">
              <CardHeader>
                <CardTitle className="form-section-title">Insured Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="insuredName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name of Insured *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter company name" {...field} />
                      </FormControl>
                      <FormDescription>Legal entity name of the insured company</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="insuredAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Insured Address *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter full address"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>Complete registered business address</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Policy Period */}
          {currentStep === 2 && (
            <Card className="form-section">
              <CardHeader>
                <CardTitle className="form-section-title">Policy Period</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : "Select date"}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? format(field.value, "PPP") : "Select date"}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Policy Duration:</strong>{" "}
                    {form.watch("startDate") && form.watch("endDate")
                      ? `${Math.ceil(
                          (form.watch("endDate").getTime() - form.watch("startDate").getTime()) /
                            (1000 * 60 * 60 * 24 * 30)
                        )} months`
                      : "Select dates"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Benefits */}
          {currentStep === 3 && (
            <Card className="form-section">
              <CardHeader>
                <CardTitle className="form-section-title">Benefits Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="inPatient"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="cursor-pointer">In-Patient</FormLabel>
                          <FormDescription>Hospital admission coverage</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="outPatient"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!watchInPatient}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className={cn("cursor-pointer", !watchInPatient && "text-muted-foreground")}>
                            Out-Patient
                          </FormLabel>
                          <FormDescription>
                            Clinic visits coverage
                            {!watchInPatient && " (requires In-Patient)"}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dental"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!watchInPatient}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className={cn("cursor-pointer", !watchInPatient && "text-muted-foreground")}>
                            Dental
                          </FormLabel>
                          <FormDescription>
                            Dental care coverage
                            {!watchInPatient && " (requires In-Patient)"}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maternity"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!watchInPatient}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className={cn("cursor-pointer", !watchInPatient && "text-muted-foreground")}>
                            Maternity
                          </FormLabel>
                          <FormDescription>
                            Pregnancy & childbirth coverage
                            {!watchInPatient && " (requires In-Patient)"}
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                {form.formState.errors.inPatient && (
                  <p className="text-sm text-destructive">{form.formState.errors.inPatient.message}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Group Structure */}
          {currentStep === 4 && (
            <Card className="form-section">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="form-section-title mb-0 border-b-0 pb-0">
                  Insured Group Structure
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addGroup}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Plan
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-1/2">Plan Name</th>
                        <th className="w-1/3">Number of Members</th>
                        <th className="w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {insuredGroups.map((group) => (
                        <tr key={group.id}>
                          <td>
                            <Input
                              value={group.planName}
                              onChange={(e) => updateGroup(group.id, "planName", e.target.value)}
                              placeholder="e.g., Executive, Staff"
                            />
                          </td>
                          <td>
                            <Input
                              type="number"
                              min="1"
                              value={group.numberOfMembers || ""}
                              onChange={(e) =>
                                updateGroup(group.id, "numberOfMembers", parseInt(e.target.value) || 0)
                              }
                              placeholder="0"
                            />
                          </td>
                          <td>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeGroup(group.id)}
                              disabled={insuredGroups.length === 1}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="font-medium">Total</td>
                        <td className="font-medium">{totalMembers}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {groupErrors.length > 0 && (
                  <div className="mt-4 p-4 bg-destructive/10 rounded-lg">
                    {groupErrors.map((error, idx) => (
                      <p key={idx} className="text-sm text-destructive">{error}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <Card className="form-section">
              <CardHeader>
                <CardTitle className="form-section-title">Review Quotation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      Insured Information
                    </h3>
                    <div className="space-y-2">
                      <p><span className="text-muted-foreground">Name:</span> {form.watch("insuredName")}</p>
                      <p><span className="text-muted-foreground">Address:</span> {form.watch("insuredAddress")}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      Policy Period
                    </h3>
                    <div className="space-y-2">
                      <p>
                        <span className="text-muted-foreground">Start:</span>{" "}
                        {form.watch("startDate") && format(form.watch("startDate"), "PPP")}
                      </p>
                      <p>
                        <span className="text-muted-foreground">End:</span>{" "}
                        {form.watch("endDate") && format(form.watch("endDate"), "PPP")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Benefits
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {form.watch("inPatient") && (
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">In-Patient</span>
                    )}
                    {form.watch("outPatient") && (
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">Out-Patient</span>
                    )}
                    {form.watch("dental") && (
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">Dental</span>
                    )}
                    {form.watch("maternity") && (
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">Maternity</span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Group Structure
                  </h3>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Plan Name</th>
                        <th>Members</th>
                      </tr>
                    </thead>
                    <tbody>
                      {insuredGroups.map((group) => (
                        <tr key={group.id}>
                          <td>{group.planName}</td>
                          <td>{group.numberOfMembers}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td className="font-medium">Total Members</td>
                        <td className="font-medium">{totalMembers}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <div className="flex gap-2">
              {currentStep < 5 ? (
                <Button type="button" onClick={nextStep}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <>
                  <Button type="button" variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview PDF
                  </Button>
                  <Button type="submit">
                    <Save className="w-4 h-4 mr-2" />
                    Save Quotation
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
