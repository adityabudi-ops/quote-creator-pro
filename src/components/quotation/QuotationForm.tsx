import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMonths, subDays } from "date-fns";
import { CalendarIcon, Save, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { createNotification } from "@/hooks/useNotifications";
import { useInsurers, useCoverageRules, useBenefitSections } from "@/hooks/useMasterData";
import { useGenerateQuotation, type Package as WorkflowPackage, type RequestedTier as WorkflowRequestedTier } from "@/hooks/useQuotationWorkflow";
import { PackageEditor, type Package } from "./PackageEditor";
import { RequestedTiersEditor, type RequestedTier } from "./RequestedTiersEditor";
import type { QuotationData } from "@/types/quotation";
import { BENEFITS_OPTIONS_LABELS, type BenefitsOption } from "@/types/quotation";
import type { Json } from "@/integrations/supabase/types";
import type { DemographicType } from "@/hooks/useMasterData";

const BENEFITS_OPTIONS: BenefitsOption[] = [
  'inner_limit_all',
  'inner_limit_ip_ma_as_charge_op_de',
  'semi_as_charge_ip_inner_limit_ma_as_charge_op_de',
  'as_charge_ip_op_de_inner_limit_ma',
];

// Map benefits option to coverage rule code
const BENEFITS_TO_COVERAGE_RULE: Record<BenefitsOption, string> = {
  'inner_limit_all': 'inner_limit_all',
  'inner_limit_ip_ma_as_charge_op_de': 'inner_limit_ip_ma',
  'semi_as_charge_ip_inner_limit_ma_as_charge_op_de': 'semi_as_charge_ip',
  'as_charge_ip_op_de_inner_limit_ma': 'as_charge_all',
};

const quotationSchema = z.object({
  insuredName: z.string().min(1, "Insured name is required").max(200, "Name too long"),
  insuredAddress: z.string().min(1, "Address is required").max(500, "Address too long"),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
  coverageRuleCode: z.string().min(1, "Coverage rule is required"),
  inPatient: z.boolean(),
  outPatient: z.boolean(),
  dental: z.boolean(),
  maternity: z.boolean(),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
}).refine((data) => data.inPatient, {
  message: "In-Patient coverage is mandatory",
  path: ["inPatient"],
});

type QuotationFormData = z.infer<typeof quotationSchema>;

const steps = [
  { id: 1, title: "Insured Info" },
  { id: 2, title: "Policy Period" },
  { id: 3, title: "Benefits" },
  { id: 4, title: "Insurers" },
  { id: 5, title: "Packages" },
  { id: 6, title: "Tiers" },
  { id: 7, title: "Review" },
];

interface QuotationFormProps {
  mode?: "create" | "edit";
  initialData?: QuotationData;
  onCancel?: () => void;
}

const DEFAULT_CENSUS: Record<DemographicType, number> = {
  M_0_59: 0,
  F_0_59: 0,
  C_0_59: 0,
  M_60_64: 0,
  F_60_64: 0,
};

export function QuotationForm({ mode = "create", initialData, onCancel }: QuotationFormProps) {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { data: insurersList, isLoading: loadingInsurers } = useInsurers(true);
  const { data: coverageRulesList, isLoading: loadingRules } = useCoverageRules(true);
  const { data: sectionsList } = useBenefitSections(true);
  const generateQuotation = useGenerateQuotation();

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedInsurers, setSelectedInsurers] = useState<string[]>(
    initialData?.insuranceCompanies || []
  );
  const [insurerError, setInsurerError] = useState<string>("");
  const [packages, setPackages] = useState<Package[]>([
    { id: `pkg-${Date.now()}`, name: "Package A", census: { ...DEFAULT_CENSUS } },
  ]);
  const [packageErrors, setPackageErrors] = useState<string[]>([]);
  const [requestedTiers, setRequestedTiers] = useState<RequestedTier[]>([]);

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      insuredName: initialData?.insuredName || "",
      insuredAddress: initialData?.insuredAddress || "",
      startDate: initialData?.startDate || new Date(),
      endDate: initialData?.endDate || subDays(addMonths(new Date(), 12), 1),
      coverageRuleCode: initialData?.benefitsOption || "",
      inPatient: initialData?.benefits?.inPatient ?? true,
      outPatient: initialData?.benefits?.outPatient ?? false,
      dental: initialData?.benefits?.dental ?? false,
      maternity: initialData?.benefits?.maternity ?? false,
    },
  });

  const watchStartDate = form.watch("startDate");
  const watchInPatient = form.watch("inPatient");
  const watchOutPatient = form.watch("outPatient");
  const watchDental = form.watch("dental");
  const watchMaternity = form.watch("maternity");
  const watchCoverageRule = form.watch("coverageRuleCode");

  // Auto-calculate end date when start date changes
  useEffect(() => {
    if (watchStartDate) {
      const newEndDate = subDays(addMonths(watchStartDate, 12), 1);
      form.setValue("endDate", newEndDate);
    }
  }, [watchStartDate, form]);

  // Get selected benefit section codes
  const getSelectedBenefitSections = (): string[] => {
    const sections: string[] = [];
    if (watchInPatient) sections.push("IP");
    if (watchOutPatient) sections.push("OP");
    if (watchDental) sections.push("DE");
    if (watchMaternity) sections.push("MA");
    return sections;
  };

  const validatePackages = (): boolean => {
    const errors: string[] = [];
    
    if (packages.length === 0) {
      errors.push("At least one package is required");
    }

    packages.forEach((pkg, index) => {
      const totalLives = Object.values(pkg.census).reduce((sum, v) => sum + v, 0);
      if (totalLives === 0) {
        errors.push(`${pkg.name} must have at least one member`);
      }
      if (!pkg.name.trim()) {
        errors.push(`Package ${index + 1} requires a name`);
      }
    });

    // Check duplicate names
    const names = packages.map(p => p.name.toLowerCase());
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
    if (duplicates.length > 0) {
      errors.push("Package names must be unique");
    }

    // Maternity validation: minimum 5 females
    if (watchMaternity) {
      const totalFemales = packages.reduce((sum, pkg) => sum + pkg.census.F_0_59, 0);
      if (totalFemales < 5) {
        errors.push(`Maternity requires minimum 5 female members (age 0-59). Current: ${totalFemales}`);
      }
    }

    setPackageErrors(errors);
    return errors.length === 0;
  };

  const validateInsurers = (): boolean => {
    if (selectedInsurers.length === 0) {
      setInsurerError("Please select at least one insurance company");
      return false;
    }
    setInsurerError("");
    return true;
  };

  const toggleInsurer = (insurerCode: string) => {
    setSelectedInsurers(prev => 
      prev.includes(insurerCode) 
        ? prev.filter(i => i !== insurerCode)
        : [...prev, insurerCode]
    );
    setInsurerError("");
  };

  const nextStep = async () => {
    let isValid = true;

    if (currentStep === 1) {
      isValid = await form.trigger(["insuredName", "insuredAddress"]);
    } else if (currentStep === 2) {
      isValid = await form.trigger(["startDate", "endDate", "coverageRuleCode"]);
    } else if (currentStep === 3) {
      isValid = await form.trigger(["inPatient", "outPatient", "dental", "maternity"]);
    } else if (currentStep === 4) {
      isValid = validateInsurers();
    } else if (currentStep === 5) {
      isValid = validatePackages();
    }

    if (isValid && currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: QuotationFormData) => {
    if (!validatePackages()) {
      toast.error("Please fix package errors");
      return;
    }
    if (!validateInsurers()) {
      toast.error("Please select at least one insurance company");
      return;
    }
    if (!profile?.id) {
      toast.error("You must be logged in to create a quotation");
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate quotation number
      const year = new Date().getFullYear();
      const randomNum = String(Date.now()).slice(-4);
      const quotationNumber = `Q-${year}-${randomNum}`;

      const selectedBenefits = getSelectedBenefitSections();

      // Prepare benefits JSON
      const benefitsJson: Json = {
        inPatient: data.inPatient,
        outPatient: data.outPatient,
        dental: data.dental,
        maternity: data.maternity,
      };

      // Legacy insured_groups format for backward compatibility
      const insuredGroupsJson: Json = packages.map(pkg => ({
        id: pkg.id,
        planName: pkg.name,
        members: {
          male0to59: pkg.census.M_0_59,
          female0to59: pkg.census.F_0_59,
          child0to59: pkg.census.C_0_59,
          male60to64: pkg.census.M_60_64,
          female60to64: pkg.census.F_60_64,
        },
      }));

      if (mode === "edit" && initialData) {
        // Update existing quotation
        const { error } = await supabase
          .from("quotations")
          .update({
            insured_name: data.insuredName,
            insured_address: data.insuredAddress,
            start_date: format(data.startDate, "yyyy-MM-dd"),
            end_date: format(data.endDate, "yyyy-MM-dd"),
            coverage_rule_code: data.coverageRuleCode,
            benefits_option: data.coverageRuleCode,
            insurance_companies: selectedInsurers,
            benefits: benefitsJson,
            insured_groups: insuredGroupsJson,
            version: (initialData.version || 1) + 1,
            status: "pending_pialang",
          })
          .eq("id", initialData.id);

        if (error) throw error;

        // Generate quotation data (tier resolution, pricing, schedule capture)
        await generateQuotation.mutateAsync({
          quotationId: initialData.id,
          coverageRuleCode: data.coverageRuleCode,
          insurerCodes: selectedInsurers,
          packages: packages.map(p => ({
            ...p,
            census: p.census,
          })) as WorkflowPackage[],
          requestedTiers: requestedTiers.map(rt => ({
            sectionCode: rt.sectionCode,
            tierCode: rt.tierCode,
          })) as WorkflowRequestedTier[],
          benefitSections: selectedBenefits,
          policyStartDate: data.startDate,
        });

        await createNotification({
          targetRole: "tenaga_pialang",
          type: "pending_approval",
          title: "Amended Quotation Pending Approval",
          message: `Quotation ${initialData.id} for ${data.insuredName} has been amended and requires your review.`,
          quotationId: initialData.id,
        });

        toast.success("Quotation updated successfully!");
        navigate(`/quotation/${initialData.id}`);
      } else {
        // Create new quotation
        const { data: newQuotation, error } = await supabase
          .from("quotations")
          .insert({
            quotation_number: quotationNumber,
            insured_name: data.insuredName,
            insured_address: data.insuredAddress,
            start_date: format(data.startDate, "yyyy-MM-dd"),
            end_date: format(data.endDate, "yyyy-MM-dd"),
            coverage_rule_code: data.coverageRuleCode,
            benefits_option: data.coverageRuleCode,
            insurance_companies: selectedInsurers,
            benefits: benefitsJson,
            insured_groups: insuredGroupsJson,
            status: "pending_pialang",
            created_by: profile.id,
          })
          .select()
          .single();

        if (error) throw error;

        // Generate quotation data (tier resolution, pricing, schedule capture)
        await generateQuotation.mutateAsync({
          quotationId: newQuotation.id,
          coverageRuleCode: data.coverageRuleCode,
          insurerCodes: selectedInsurers,
          packages: packages.map(p => ({
            ...p,
            census: p.census,
          })) as WorkflowPackage[],
          requestedTiers: requestedTiers.map(rt => ({
            sectionCode: rt.sectionCode,
            tierCode: rt.tierCode,
          })) as WorkflowRequestedTier[],
          benefitSections: selectedBenefits,
          policyStartDate: data.startDate,
        });

        await createNotification({
          targetRole: "tenaga_pialang",
          type: "pending_approval",
          title: "New Quotation Pending Approval",
          message: `Quotation ${quotationNumber} for ${data.insuredName} requires your review.`,
          quotationId: newQuotation.id,
        });

        await createNotification({
          userId: profile.user_id,
          type: "quotation_created",
          title: "Quotation Created",
          message: `Your quotation ${quotationNumber} for ${data.insuredName} has been submitted for approval.`,
          quotationId: newQuotation.id,
        });

        toast.success("Quotation created successfully!");
        navigate("/");
      }
    } catch (error: any) {
      console.error("Error saving quotation:", error);
      toast.error(error.message || "Failed to save quotation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInsurerName = (code: string): string => {
    return insurersList?.find(i => i.insurer_code === code)?.insurer_name || code;
  };

  const getCoverageRuleName = (code: string): string => {
    return coverageRulesList?.find(r => r.coverage_rule_code === code)?.coverage_rule_name || code;
  };

  const getTotalLives = () => {
    return packages.reduce((sum, pkg) => 
      sum + Object.values(pkg.census).reduce((s, v) => s + v, 0), 0
    );
  };

  if (authLoading || loadingInsurers || loadingRules) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="hidden lg:block">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all shadow-sm",
                      currentStep >= step.id
                        ? "bg-primary text-primary-foreground shadow-primary/30"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {step.id}
                  </div>
                  <span
                    className={cn(
                      "mt-2 text-xs font-medium text-center whitespace-nowrap",
                      currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-2 mt-[-1.5rem]",
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="lg:hidden">
          <div className="flex items-center justify-center gap-1 mb-3">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all",
                    currentStep === step.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : currentStep > step.id
                        ? "bg-primary/80 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {step.id}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-3 h-0.5 mx-0.5",
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm font-medium text-foreground">
            Step {currentStep}: <span className="text-primary">{steps[currentStep - 1]?.title}</span>
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Step 1: Insured Information */}
          {currentStep === 1 && (
            <Card className="form-section">
              <CardHeader>
                <CardTitle>Insured Information</CardTitle>
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
                        <Textarea placeholder="Enter full address" className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormDescription>Complete registered business address</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Policy Period & Coverage Rule */}
          {currentStep === 2 && (
            <Card className="form-section">
              <CardHeader>
                <CardTitle>Policy Period & Coverage Rule</CardTitle>
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
                          <PopoverContent className="w-auto p-0 bg-popover" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>Policy coverage begins on this date</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date (Auto-calculated)</FormLabel>
                        <FormControl>
                          <Button variant="outline" className="w-full pl-3 text-left font-normal" disabled>
                            {field.value ? format(field.value, "PPP") : "Select start date first"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                        <FormDescription>12 months minus 1 day from start date</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="coverageRuleCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coverage Rule *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a coverage rule" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover">
                          {coverageRulesList?.map((rule) => (
                            <SelectItem key={rule.coverage_rule_code} value={rule.coverage_rule_code}>
                              {rule.coverage_rule_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Determines coverage limits and charging method</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 3: Benefits */}
          {currentStep === 3 && (
            <Card className="form-section">
              <CardHeader>
                <CardTitle>Benefits Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Select the coverage benefits. In-Patient is mandatory.
                </p>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="inPatient"
                    render={({ field }) => (
                      <FormItem className="relative flex flex-row items-center gap-4 rounded-xl border-2 border-primary bg-primary/5 p-5 shadow-sm">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled className="h-5 w-5" />
                        </FormControl>
                        <div className="flex-1 min-w-0">
                          <FormLabel className="cursor-pointer text-base font-semibold">In-Patient</FormLabel>
                          <FormDescription className="text-xs mt-1">Hospital admission coverage</FormDescription>
                        </div>
                        <span className="absolute top-2 right-2 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          Mandatory
                        </span>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="outPatient"
                    render={({ field }) => (
                      <FormItem className={cn(
                        "flex flex-row items-center gap-4 rounded-xl border-2 p-5 transition-all",
                        field.value ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/50"
                      )}>
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={!watchInPatient} className="h-5 w-5" />
                        </FormControl>
                        <div className="flex-1 min-w-0">
                          <FormLabel className={cn("cursor-pointer text-base font-semibold", !watchInPatient && "text-muted-foreground")}>
                            Out-Patient
                          </FormLabel>
                          <FormDescription className="text-xs mt-1">Clinic and doctor visits</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dental"
                    render={({ field }) => (
                      <FormItem className={cn(
                        "flex flex-row items-center gap-4 rounded-xl border-2 p-5 transition-all",
                        field.value ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/50"
                      )}>
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={!watchInPatient} className="h-5 w-5" />
                        </FormControl>
                        <div className="flex-1 min-w-0">
                          <FormLabel className={cn("cursor-pointer text-base font-semibold", !watchInPatient && "text-muted-foreground")}>
                            Dental
                          </FormLabel>
                          <FormDescription className="text-xs mt-1">Dental care coverage</FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maternity"
                    render={({ field }) => (
                      <FormItem className={cn(
                        "flex flex-row items-center gap-4 rounded-xl border-2 p-5 transition-all",
                        field.value ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/50"
                      )}>
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={!watchInPatient} className="h-5 w-5" />
                        </FormControl>
                        <div className="flex-1 min-w-0">
                          <FormLabel className={cn("cursor-pointer text-base font-semibold", !watchInPatient && "text-muted-foreground")}>
                            Maternity
                          </FormLabel>
                          <FormDescription className="text-xs mt-1">
                            Pregnancy & childbirth
                            <span className="block text-[10px] text-muted-foreground/80 mt-0.5">Min. 5 females required</span>
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Insurance Companies */}
          {currentStep === 4 && (
            <Card className="form-section">
              <CardHeader>
                <CardTitle>Insurance Companies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select insurers to request quotations from
                </p>
                <div className="space-y-3">
                  {insurersList?.map((insurer) => (
                    <label
                      key={insurer.insurer_code}
                      className={cn(
                        "flex flex-row items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-muted/50",
                        selectedInsurers.includes(insurer.insurer_code) && "border-primary bg-primary/5"
                      )}
                    >
                      <Checkbox
                        checked={selectedInsurers.includes(insurer.insurer_code)}
                        onCheckedChange={() => toggleInsurer(insurer.insurer_code)}
                      />
                      <span className="font-medium">{insurer.insurer_name}</span>
                    </label>
                  ))}
                </div>
                {insurerError && <p className="text-sm text-destructive">{insurerError}</p>}
              </CardContent>
            </Card>
          )}

          {/* Step 5: Packages */}
          {currentStep === 5 && (
            <Card className="form-section">
              <CardHeader>
                <CardTitle>Census & Package Structure</CardTitle>
              </CardHeader>
              <CardContent>
                <PackageEditor
                  packages={packages}
                  onPackagesChange={setPackages}
                  errors={packageErrors}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 6: Requested Tiers */}
          {currentStep === 6 && (
            <Card className="form-section">
              <CardHeader>
                <CardTitle>Requested Coverage Tiers</CardTitle>
              </CardHeader>
              <CardContent>
                <RequestedTiersEditor
                  selectedBenefits={getSelectedBenefitSections()}
                  requestedTiers={requestedTiers}
                  onRequestedTiersChange={setRequestedTiers}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 7: Review */}
          {currentStep === 7 && (
            <Card className="form-section">
              <CardHeader>
                <CardTitle>Review Quotation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Insured Info */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Insured Name</h4>
                    <p className="font-medium">{form.getValues("insuredName")}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Address</h4>
                    <p className="text-sm">{form.getValues("insuredAddress")}</p>
                  </div>
                </div>

                {/* Policy Period */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Policy Period</h4>
                    <p className="font-medium">
                      {format(form.getValues("startDate"), "dd MMM yyyy")} - {format(form.getValues("endDate"), "dd MMM yyyy")}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Coverage Rule</h4>
                    <p className="font-medium">{getCoverageRuleName(watchCoverageRule)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Total Lives</h4>
                    <p className="text-2xl font-bold text-primary">{getTotalLives()}</p>
                  </div>
                </div>

                {/* Benefits */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Selected Benefits</h4>
                  <div className="flex flex-wrap gap-2">
                    {watchInPatient && <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">In-Patient</span>}
                    {watchOutPatient && <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">Out-Patient</span>}
                    {watchDental && <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">Dental</span>}
                    {watchMaternity && <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">Maternity</span>}
                  </div>
                </div>

                {/* Insurers */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Insurance Companies</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedInsurers.map(code => (
                      <span key={code} className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                        {getInsurerName(code)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Packages Summary */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Packages ({packages.length})</h4>
                  <div className="space-y-2">
                    {packages.map(pkg => {
                      const lives = Object.values(pkg.census).reduce((s, v) => s + v, 0);
                      return (
                        <div key={pkg.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="font-medium">{pkg.name}</span>
                          <span className="text-sm text-muted-foreground">{lives} lives</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Requested Tiers */}
                {requestedTiers.filter(t => t.tierCode).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Requested Tiers</h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      {requestedTiers.filter(t => t.tierCode).map(rt => (
                        <div key={rt.sectionCode} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                          <span className="text-sm">{rt.sectionCode}</span>
                          <span className="font-medium">{rt.tierCode}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <div>
              {currentStep > 1 && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              {onCancel && (
                <Button type="button" variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              {currentStep < steps.length ? (
                <Button type="button" onClick={nextStep}>
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {mode === "edit" ? "Update & Resubmit" : "Generate Quotation"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
