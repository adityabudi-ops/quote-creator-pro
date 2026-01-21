import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMonths, subDays } from "date-fns";
import { CalendarIcon, Save, Loader2, Plus, GitBranch, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { createNotification } from "@/hooks/useNotifications";
import { useInsurers, useCoverageRules } from "@/hooks/useMasterData";
import { useGenerateScenario, type Package as WorkflowPackage, type PackageRequestedTiers as WorkflowPackageRequestedTiers } from "@/hooks/useScenarioWorkflow";
import { PackageEditor, type Package } from "./PackageEditor";
import { RequestedTiersEditor, type PackageRequestedTiers } from "./RequestedTiersEditor";
import { ScenarioPreview } from "./ScenarioPreview";
import { getLineOfBusinessLabel } from "@/types/lineOfBusiness";
import type { QuotationData } from "@/types/quotation";
import type { Json } from "@/integrations/supabase/types";
import type { DemographicType } from "@/hooks/useMasterData";

const quotationSchema = z.object({
  insuredName: z.string().min(1, "Insured name is required").max(200, "Name too long"),
  insuredAddress: z.string().min(1, "Address is required").max(500, "Address too long"),
  lineOfBusiness: z.string().min(1, "Line of business is required").max(200, "Too long"),
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

// Updated steps with Pre-Review gate
const steps = [
  { id: 1, title: "Insured Info" },
  { id: 2, title: "Policy Period" },
  { id: 3, title: "Benefits" },
  { id: 4, title: "Insurers" },
  { id: 5, title: "Packages" },
  { id: 6, title: "Tiers" },
  { id: 7, title: "Preview" },      // Base quote preview
  { id: 8, title: "Alternatives" }, // Pre-review gate for alternatives
  { id: 9, title: "Review" },       // Final review
];

interface ScenarioConfig {
  scenarioName: string;
  coverageRuleCode: string;
  insurerCodes: string[];
  benefits: {
    inPatient: boolean;
    outPatient: boolean;
    dental: boolean;
    maternity: boolean;
  };
  packageRequestedTiers: PackageRequestedTiers[];
}

interface GeneratedScenario {
  id: string;
  name: string;
  isBase: boolean;
  scenarioId?: string;
  config: ScenarioConfig;
  result?: any;
}

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
  const generateScenario = useGenerateScenario();

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
  const [packageRequestedTiers, setPackageRequestedTiers] = useState<PackageRequestedTiers[]>([]);
  
  // Scenario state
  const [quotationId, setQuotationId] = useState<string | null>(null);
  const [generatedScenarios, setGeneratedScenarios] = useState<GeneratedScenario[]>([]);
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
  const [showAlternativeDialog, setShowAlternativeDialog] = useState(false);
  const [alternativeConfig, setAlternativeConfig] = useState<ScenarioConfig | null>(null);

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      insuredName: initialData?.insuredName || "",
      insuredAddress: initialData?.insuredAddress || "",
      lineOfBusiness: (initialData as any)?.lineOfBusiness || "",
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

  useEffect(() => {
    if (watchStartDate) {
      const newEndDate = subDays(addMonths(watchStartDate, 12), 1);
      form.setValue("endDate", newEndDate);
    }
  }, [watchStartDate, form]);

  const getSelectedBenefitSections = (): string[] => {
    const sections: string[] = [];
    if (watchInPatient) sections.push("IP");
    if (watchOutPatient) sections.push("OP");
    if (watchDental) sections.push("DE");
    if (watchMaternity) sections.push("MA");
    return sections;
  };

  const getCurrentBenefits = () => ({
    inPatient: watchInPatient,
    outPatient: watchOutPatient,
    dental: watchDental,
    maternity: watchMaternity,
  });

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

    const names = packages.map(p => p.name.toLowerCase());
    const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
    if (duplicates.length > 0) {
      errors.push("Package names must be unique");
    }

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

  // Create quotation and generate base scenario
  const createQuotationAndBaseScenario = async (data: QuotationFormData): Promise<string> => {
    if (!profile?.id) throw new Error("Not authenticated");

    const year = new Date().getFullYear();
    const randomNum = String(Date.now()).slice(-4);
    const quotationNumber = `Q-${year}-${randomNum}`;

    const benefitsJson: Json = {
      inPatient: data.inPatient,
      outPatient: data.outPatient,
      dental: data.dental,
      maternity: data.maternity,
    };

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

    // Create quotation
    const { data: newQuotation, error } = await supabase
      .from("quotations")
      .insert({
        quotation_number: quotationNumber,
        insured_name: data.insuredName,
        insured_address: data.insuredAddress,
        line_of_business: data.lineOfBusiness,
        start_date: format(data.startDate, "yyyy-MM-dd"),
        end_date: format(data.endDate, "yyyy-MM-dd"),
        coverage_rule_code: data.coverageRuleCode,
        benefits_option: data.coverageRuleCode,
        insurance_companies: selectedInsurers,
        benefits: benefitsJson,
        insured_groups: insuredGroupsJson,
        status: "draft",
        created_by: profile.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Generate base scenario
    const result = await generateScenario.mutateAsync({
      quotationId: newQuotation.id,
      scenarioName: "Base Quote",
      isBase: true,
      coverageRuleCode: data.coverageRuleCode,
      insurerCodes: selectedInsurers,
      benefits: getCurrentBenefits(),
      packages: packages as WorkflowPackage[],
      packageRequestedTiers: packageRequestedTiers as WorkflowPackageRequestedTiers[],
      policyStartDate: data.startDate,
    });

    setQuotationId(newQuotation.id);
    setGeneratedScenarios([{
      id: "base",
      name: "Base Quote",
      isBase: true,
      scenarioId: result.scenarioId,
      config: {
        scenarioName: "Base Quote",
        coverageRuleCode: data.coverageRuleCode,
        insurerCodes: selectedInsurers,
        benefits: getCurrentBenefits(),
        packageRequestedTiers,
      },
      result,
    }]);

    return newQuotation.id;
  };

  const handleGenerateAlternative = async () => {
    if (!quotationId || !alternativeConfig) return;

    setIsGeneratingScenario(true);
    try {
      const result = await generateScenario.mutateAsync({
        quotationId,
        scenarioName: alternativeConfig.scenarioName,
        isBase: false,
        coverageRuleCode: alternativeConfig.coverageRuleCode,
        insurerCodes: alternativeConfig.insurerCodes,
        benefits: alternativeConfig.benefits,
        packages: packages as WorkflowPackage[],
        packageRequestedTiers: alternativeConfig.packageRequestedTiers,
        policyStartDate: form.getValues("startDate"),
      });

      setGeneratedScenarios(prev => [...prev, {
        id: `alt-${Date.now()}`,
        name: alternativeConfig.scenarioName,
        isBase: false,
        scenarioId: result.scenarioId,
        config: alternativeConfig,
        result,
      }]);

      setShowAlternativeDialog(false);
      setAlternativeConfig(null);
      toast.success(`Alternative "${alternativeConfig.scenarioName}" generated!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate alternative");
    } finally {
      setIsGeneratingScenario(false);
    }
  };

  const openAlternativeDialog = () => {
    // Pre-fill with base config
    setAlternativeConfig({
      scenarioName: `Alternative ${generatedScenarios.length}`,
      coverageRuleCode: watchCoverageRule,
      insurerCodes: [...selectedInsurers],
      benefits: getCurrentBenefits(),
      packageRequestedTiers: [...packageRequestedTiers],
    });
    setShowAlternativeDialog(true);
  };

  const nextStep = async () => {
    let isValid = true;

    if (currentStep === 1) {
      isValid = await form.trigger(["insuredName", "insuredAddress", "lineOfBusiness"]);
    } else if (currentStep === 2) {
      isValid = await form.trigger(["startDate", "endDate", "coverageRuleCode"]);
    } else if (currentStep === 3) {
      isValid = await form.trigger(["inPatient", "outPatient", "dental", "maternity"]);
    } else if (currentStep === 4) {
      isValid = validateInsurers();
    } else if (currentStep === 5) {
      isValid = validatePackages();
    } else if (currentStep === 6) {
      // After Tiers step, generate base scenario
      isValid = true;
      if (!quotationId) {
        setIsGeneratingScenario(true);
        try {
          await createQuotationAndBaseScenario(form.getValues());
          toast.success("Base quote generated successfully!");
        } catch (error: any) {
          toast.error(error.message || "Failed to generate quote");
          isValid = false;
        } finally {
          setIsGeneratingScenario(false);
        }
      }
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

  const onSubmit = async () => {
    if (!quotationId) {
      toast.error("Please complete the quotation generation first");
      return;
    }

    setIsSubmitting(true);

    try {
      // Update quotation status to pending approval
      const { error } = await supabase
        .from("quotations")
        .update({ status: "pending_pialang" })
        .eq("id", quotationId);

      if (error) throw error;

      await createNotification({
        targetRole: "tenaga_pialang",
        type: "pending_approval",
        title: "New Quotation Pending Approval",
        message: `Quotation for ${form.getValues("insuredName")} requires your review.`,
        quotationId,
      });

      if (profile?.user_id) {
        await createNotification({
          userId: profile.user_id,
          type: "quotation_created",
          title: "Quotation Created",
          message: `Your quotation for ${form.getValues("insuredName")} has been submitted for approval.`,
          quotationId,
        });
      }

      toast.success("Quotation submitted successfully!");
      navigate(`/quotation/${quotationId}`);
    } catch (error: any) {
      console.error("Error submitting quotation:", error);
      toast.error(error.message || "Failed to submit quotation");
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
                    {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
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
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
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
                <FormField
                  control={form.control}
                  name="lineOfBusiness"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Line of Business *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select line of business" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover">
                          <SelectItem value="eb_medical">Employee Benefits – Medical</SelectItem>
                          <SelectItem value="eb_medical_life">Employee Benefits – Medical + Life (Bundle)</SelectItem>
                          <SelectItem value="eb_life">Employee Benefits – Life Only</SelectItem>
                          <SelectItem value="eb_pa">Employee Benefits – Personal Accident</SelectItem>
                          <SelectItem value="eb_other">Employee Benefits – Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Type of insurance coverage</FormDescription>
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
                  packages={packages}
                  selectedBenefits={getSelectedBenefitSections()}
                  selectedInsurers={selectedInsurers}
                  packageRequestedTiers={packageRequestedTiers}
                  onPackageRequestedTiersChange={setPackageRequestedTiers}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 7: Base Quote Preview */}
          {currentStep === 7 && (
            <Card className="form-section">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  Base Quote Generated
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {generatedScenarios.length > 0 && generatedScenarios[0].result && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-green-700 dark:text-green-300 font-medium">
                      ✓ Base quote has been generated with {generatedScenarios[0].result.tierResolution?.offers?.length || 0} tier offers
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      Premium calculations and benefit schedules are ready.
                    </p>
                  </div>
                )}

                {/* Summary */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Coverage Rule</h4>
                    <p className="font-medium">{getCoverageRuleName(watchCoverageRule)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Insurers</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedInsurers.map(code => (
                        <Badge key={code} variant="secondary">{getInsurerName(code)}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Benefits</h4>
                  <div className="flex flex-wrap gap-2">
                    {watchInPatient && <Badge>In-Patient</Badge>}
                    {watchOutPatient && <Badge>Out-Patient</Badge>}
                    {watchDental && <Badge>Dental</Badge>}
                    {watchMaternity && <Badge>Maternity</Badge>}
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Click "Next" to proceed to the Alternative Quote options, or skip directly to Review.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 8: Alternative Quote Gate */}
          {currentStep === 8 && (
            <Card className="form-section">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Create Alternative Quotes?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-6 bg-muted/50 rounded-lg text-center">
                  <p className="text-lg font-medium mb-2">
                    Do you need to create an Alternative Quote?
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Alternative quotes allow you to compare different configurations (coverage rules, insurers, or tiers) within the same quotation.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => setCurrentStep(9)}
                    >
                      No, Proceed to Review
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      onClick={openAlternativeDialog}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Yes, Create Alternative
                    </Button>
                  </div>
                </div>

                {/* List of generated scenarios */}
                {generatedScenarios.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Generated Scenarios ({generatedScenarios.length})</h4>
                    {generatedScenarios.map(scenario => (
                      <div
                        key={scenario.id}
                        className={cn(
                          "flex items-center justify-between p-4 border rounded-lg",
                          scenario.isBase ? "bg-primary/5 border-primary" : "bg-pink-50 dark:bg-pink-900/20 border-pink-300"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            scenario.isBase ? "bg-primary text-primary-foreground" : "bg-pink-500 text-white"
                          )}>
                            {scenario.isBase ? "B" : "A"}
                          </div>
                          <div>
                            <p className="font-medium">{scenario.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {getCoverageRuleName(scenario.config.coverageRuleCode)} • {scenario.config.insurerCodes.length} insurers
                            </p>
                          </div>
                        </div>
                        <Badge variant={scenario.isBase ? "default" : "secondary"}>
                          {scenario.isBase ? "Base" : "Alternative"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 9: Final Review */}
          {currentStep === 9 && (
            <Card className="form-section">
              <CardHeader>
                <CardTitle>Final Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Insured Info */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Insured Name</h4>
                    <p className="font-medium">{form.getValues("insuredName")}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Line of Business</h4>
                    <p className="font-medium">{getLineOfBusinessLabel(form.getValues("lineOfBusiness"))}</p>
                  </div>
                  <div className="md:col-span-1">
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
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Total Lives</h4>
                    <p className="text-2xl font-bold text-primary">{getTotalLives()}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Scenarios</h4>
                    <p className="text-2xl font-bold text-primary">{generatedScenarios.length}</p>
                  </div>
                </div>

                {/* Scenarios Summary */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Quote Scenarios</h4>
                  <div className="space-y-2">
                    {generatedScenarios.map(scenario => (
                      <div
                        key={scenario.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg",
                          scenario.isBase ? "bg-primary/10" : "bg-pink-100 dark:bg-pink-900/20"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant={scenario.isBase ? "default" : "outline"}>
                            {scenario.isBase ? "Base" : "Alt"}
                          </Badge>
                          <span className="font-medium">{scenario.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {getCoverageRuleName(scenario.config.coverageRuleCode)}
                        </span>
                      </div>
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

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-amber-700 dark:text-amber-300 text-sm">
                    <strong>Note:</strong> All scenarios (Base + Alternatives) will be included in the generated PDF quotation.
                  </p>
                </div>
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
                <Button 
                  type="button" 
                  onClick={nextStep}
                  disabled={isGeneratingScenario}
                >
                  {isGeneratingScenario ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Next"
                  )}
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Submit for Approval
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>

      {/* Alternative Quote Dialog */}
      <Dialog open={showAlternativeDialog} onOpenChange={setShowAlternativeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Alternative Quote</DialogTitle>
            <DialogDescription>
              Configure a different scenario with modified coverage rules, insurers, or tiers.
            </DialogDescription>
          </DialogHeader>

          {alternativeConfig && (
            <div className="space-y-6 py-4">
              <div>
                <label className="text-sm font-medium">Scenario Name</label>
                <Input
                  value={alternativeConfig.scenarioName}
                  onChange={e => setAlternativeConfig(prev => prev ? { ...prev, scenarioName: e.target.value } : null)}
                  placeholder="e.g., Budget Option, Premium Plan"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Coverage Rule</label>
                <Select
                  value={alternativeConfig.coverageRuleCode}
                  onValueChange={v => setAlternativeConfig(prev => prev ? { ...prev, coverageRuleCode: v } : null)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {coverageRulesList?.map(rule => (
                      <SelectItem key={rule.coverage_rule_code} value={rule.coverage_rule_code}>
                        {rule.coverage_rule_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Insurance Companies</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {insurersList?.map(insurer => (
                    <label
                      key={insurer.insurer_code}
                      className={cn(
                        "flex items-center gap-2 p-2 border rounded cursor-pointer",
                        alternativeConfig.insurerCodes.includes(insurer.insurer_code)
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      )}
                    >
                      <Checkbox
                        checked={alternativeConfig.insurerCodes.includes(insurer.insurer_code)}
                        onCheckedChange={checked => {
                          setAlternativeConfig(prev => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              insurerCodes: checked
                                ? [...prev.insurerCodes, insurer.insurer_code]
                                : prev.insurerCodes.filter(c => c !== insurer.insurer_code),
                            };
                          });
                        }}
                      />
                      <span className="text-sm">{insurer.insurer_name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Benefits</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  <label className="flex items-center gap-2 p-2 border rounded">
                    <Checkbox checked={alternativeConfig.benefits.inPatient} disabled />
                    <span className="text-sm">In-Patient</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded cursor-pointer">
                    <Checkbox
                      checked={alternativeConfig.benefits.outPatient}
                      onCheckedChange={checked => setAlternativeConfig(prev => prev ? {
                        ...prev,
                        benefits: { ...prev.benefits, outPatient: !!checked },
                      } : null)}
                    />
                    <span className="text-sm">Out-Patient</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded cursor-pointer">
                    <Checkbox
                      checked={alternativeConfig.benefits.dental}
                      onCheckedChange={checked => setAlternativeConfig(prev => prev ? {
                        ...prev,
                        benefits: { ...prev.benefits, dental: !!checked },
                      } : null)}
                    />
                    <span className="text-sm">Dental</span>
                  </label>
                  <label className="flex items-center gap-2 p-2 border rounded cursor-pointer">
                    <Checkbox
                      checked={alternativeConfig.benefits.maternity}
                      onCheckedChange={checked => setAlternativeConfig(prev => prev ? {
                        ...prev,
                        benefits: { ...prev.benefits, maternity: !!checked },
                      } : null)}
                    />
                    <span className="text-sm">Maternity</span>
                  </label>
                </div>
              </div>

              {/* Requested Tiers for Alternative */}
              {alternativeConfig.insurerCodes.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Requested Tiers</label>
                  <div className="mt-2">
                    <RequestedTiersEditor
                      packages={packages}
                      selectedBenefits={Object.entries(alternativeConfig.benefits)
                        .filter(([_, v]) => v)
                        .map(([k]) => {
                          if (k === "inPatient") return "IP";
                          if (k === "outPatient") return "OP";
                          if (k === "dental") return "DE";
                          if (k === "maternity") return "MA";
                          return k;
                        })}
                      selectedInsurers={alternativeConfig.insurerCodes}
                      packageRequestedTiers={alternativeConfig.packageRequestedTiers}
                      onPackageRequestedTiersChange={tiers => setAlternativeConfig(prev => prev ? {
                        ...prev,
                        packageRequestedTiers: tiers,
                      } : null)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAlternativeDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateAlternative}
              disabled={isGeneratingScenario || !alternativeConfig?.scenarioName.trim() || alternativeConfig?.insurerCodes.length === 0}
            >
              {isGeneratingScenario ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Generate Alternative
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
