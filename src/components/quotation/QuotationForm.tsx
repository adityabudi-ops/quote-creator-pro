import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMonths, subDays } from "date-fns";
import { CalendarIcon, Plus, Trash2, Save, Eye } from "lucide-react";
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
import type { QuotationData, BenefitsOption, InsuranceCompany } from "@/types/quotation";
import { BENEFITS_OPTIONS_LABELS, INSURANCE_COMPANIES } from "@/types/quotation";

// Plan options per benefit type (sorted ascending)
const PLAN_OPTIONS = {
  inPatient: [
    "IP 300", "IP 400", "IP 500", "IP 600", "IP 700", "IP 800",
    "IP 1000", "IP 1250", "IP 1500", "IP 2000", "IP 2500", "IP 3000"
  ],
  dental: [
    "DE 1500", "DE 2000", "DE 2500", "DE 3000", "DE 3500", "DE 4000",
    "DE 4500", "DE 5000", "DE 5500", "DE 6000", "DE 6500", "DE 7000"
  ],
  maternity: [
    "MA 4000", "MA 4500", "MA 5000", "MA 6000", "MA 6500", "MA 7000",
    "MA 7500", "MA 8000", "MA 9000", "MA 10000"
  ],
  outPatient: [
    "OP 150", "OP 175", "OP 200", "OP 225", "OP 250", "OP 300",
    "OP 350", "OP 425", "OP 450", "OP 475", "OP 500", "OP 550"
  ],
};

interface MemberBreakdown {
  male0to59: number;
  female0to59: number;
  child0to59: number;
  male60to64: number;
  female60to64: number;
}

interface BenefitGroup {
  id: string;
  benefitType: 'inPatient' | 'outPatient' | 'dental' | 'maternity';
  planName: string;
  members: MemberBreakdown;
}

const DEFAULT_MEMBERS: MemberBreakdown = {
  male0to59: 0,
  female0to59: 0,
  child0to59: 0,
  male60to64: 0,
  female60to64: 0,
};

const BENEFITS_OPTIONS: BenefitsOption[] = [
  'inner_limit_all',
  'inner_limit_ip_ma_as_charge_op_de',
  'semi_as_charge_ip_inner_limit_ma_as_charge_op_de',
  'as_charge_ip_op_de_inner_limit_ma',
];

const INSURANCE_COMPANY_OPTIONS: InsuranceCompany[] = ['aca', 'asm', 'sompo'];

const quotationSchema = z.object({
  insuredName: z.string().min(1, "Insured name is required").max(200, "Name too long"),
  insuredAddress: z.string().min(1, "Address is required").max(500, "Address too long"),
  startDate: z.date({ required_error: "Start date is required" }),
  endDate: z.date({ required_error: "End date is required" }),
  benefitsOption: z.enum(['inner_limit_all', 'inner_limit_ip_ma_as_charge_op_de', 'semi_as_charge_ip_inner_limit_ma_as_charge_op_de', 'as_charge_ip_op_de_inner_limit_ma'] as const, {
    required_error: "Benefits option is required",
  }),
  inPatient: z.boolean(),
  outPatient: z.boolean(),
  dental: z.boolean(),
  maternity: z.boolean(),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
}).refine((data) => {
  // In-Patient is always required (mandatory)
  return data.inPatient;
}, {
  message: "In-Patient coverage is mandatory",
  path: ["inPatient"],
});

type QuotationFormData = z.infer<typeof quotationSchema>;

const steps = [
  { id: 1, title: "Insured Information" },
  { id: 2, title: "Policy Period" },
  { id: 3, title: "Benefits" },
  { id: 4, title: "Insurance Companies" },
  { id: 5, title: "Group Structure" },
  { id: 6, title: "Review" },
];

const BENEFIT_LABELS: Record<string, string> = {
  inPatient: "In-Patient",
  outPatient: "Out-Patient",
  dental: "Dental",
  maternity: "Maternity",
};

interface QuotationFormProps {
  mode?: "create" | "edit";
  initialData?: QuotationData;
  onCancel?: () => void;
}

export function QuotationForm({ mode = "create", initialData, onCancel }: QuotationFormProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedInsurers, setSelectedInsurers] = useState<InsuranceCompany[]>(
    initialData?.insuranceCompanies || []
  );
  const [insurerError, setInsurerError] = useState<string>("");
  
  // Initialize benefit groups from initial data if in edit mode
  const getInitialBenefitGroups = (): Record<string, BenefitGroup[]> => {
    if (initialData) {
      const groups: Record<string, BenefitGroup[]> = {};
      if (initialData.benefits.inPatient) {
        groups.inPatient = initialData.insuredGroups
          .filter(g => g.planName.startsWith("IP"))
          .map(g => ({ ...g, benefitType: "inPatient" as const }));
        if (groups.inPatient.length === 0) {
          groups.inPatient = [{ id: "ip-1", benefitType: "inPatient", planName: "", members: { ...DEFAULT_MEMBERS } }];
        }
      }
      if (initialData.benefits.outPatient) {
        groups.outPatient = initialData.insuredGroups
          .filter(g => g.planName.startsWith("OP"))
          .map(g => ({ ...g, benefitType: "outPatient" as const }));
        if (groups.outPatient.length === 0) {
          groups.outPatient = [{ id: "op-1", benefitType: "outPatient", planName: "", members: { ...DEFAULT_MEMBERS } }];
        }
      }
      if (initialData.benefits.dental) {
        groups.dental = initialData.insuredGroups
          .filter(g => g.planName.startsWith("DE"))
          .map(g => ({ ...g, benefitType: "dental" as const }));
        if (groups.dental.length === 0) {
          groups.dental = [{ id: "de-1", benefitType: "dental", planName: "", members: { ...DEFAULT_MEMBERS } }];
        }
      }
      if (initialData.benefits.maternity) {
        groups.maternity = initialData.insuredGroups
          .filter(g => g.planName.startsWith("MA"))
          .map(g => ({ ...g, benefitType: "maternity" as const }));
        if (groups.maternity.length === 0) {
          groups.maternity = [{ id: "ma-1", benefitType: "maternity", planName: "", members: { ...DEFAULT_MEMBERS } }];
        }
      }
      // If no groups found, default to inPatient
      if (Object.keys(groups).length === 0) {
        groups.inPatient = [{ id: "ip-1", benefitType: "inPatient", planName: "", members: { ...DEFAULT_MEMBERS } }];
      }
      return groups;
    }
    return {
      inPatient: [{ id: "ip-1", benefitType: "inPatient", planName: "", members: { ...DEFAULT_MEMBERS } }],
    };
  };

  const [benefitGroups, setBenefitGroups] = useState<Record<string, BenefitGroup[]>>(getInitialBenefitGroups);
  const [groupErrors, setGroupErrors] = useState<string[]>([]);

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      insuredName: initialData?.insuredName || "",
      insuredAddress: initialData?.insuredAddress || "",
      startDate: initialData?.startDate || new Date(),
      endDate: initialData?.endDate || subDays(addMonths(new Date(), 12), 1),
      benefitsOption: initialData?.benefitsOption || "inner_limit_all",
      inPatient: initialData?.benefits.inPatient ?? true,
      outPatient: initialData?.benefits.outPatient ?? false,
      dental: initialData?.benefits.dental ?? false,
      maternity: initialData?.benefits.maternity ?? false,
    },
  });

  const watchStartDate = form.watch("startDate");
  const watchInPatient = form.watch("inPatient");
  const watchOutPatient = form.watch("outPatient");
  const watchDental = form.watch("dental");
  const watchMaternity = form.watch("maternity");

  // Auto-calculate end date when start date changes (12 months - 1 day)
  useEffect(() => {
    if (watchStartDate) {
      const newEndDate = subDays(addMonths(watchStartDate, 12), 1);
      form.setValue("endDate", newEndDate);
    }
  }, [watchStartDate, form]);

  // Sync benefit groups: when In-Patient changes, sync rows to other selected benefits
  useEffect(() => {
    const selectedBenefits = {
      inPatient: watchInPatient,
      outPatient: watchOutPatient,
      dental: watchDental,
      maternity: watchMaternity,
    };

    setBenefitGroups((prev) => {
      const inPatientGroups = prev.inPatient || [
        { id: "ip-1", benefitType: "inPatient" as const, planName: "", members: { ...DEFAULT_MEMBERS } }
      ];
      
      const newGroups: Record<string, BenefitGroup[]> = {};

      Object.entries(selectedBenefits).forEach(([benefit, isSelected]) => {
        if (isSelected) {
          if (benefit === 'inPatient') {
            newGroups.inPatient = inPatientGroups;
          } else {
            // Sync rows from In-Patient: same number of rows with same member counts
            newGroups[benefit] = inPatientGroups.map((ipGroup, index) => {
              const existingGroup = prev[benefit]?.[index];
              return {
                id: existingGroup?.id || `${benefit}-${index + 1}`,
                benefitType: benefit as BenefitGroup['benefitType'],
                planName: existingGroup?.planName || "",
                members: { ...ipGroup.members }, // Copy member counts from In-Patient
              };
            });
          }
        }
      });

      return newGroups;
    });
  }, [watchInPatient, watchOutPatient, watchDental, watchMaternity]);

  // When In-Patient group structure changes, sync to other benefits
  const addGroup = () => {
    setBenefitGroups((prev) => {
      const newInPatientGroups = [
        ...(prev.inPatient || []),
        { id: `inPatient-${Date.now()}`, benefitType: "inPatient" as const, planName: "", members: { ...DEFAULT_MEMBERS } },
      ];
      
      const newGroups: Record<string, BenefitGroup[]> = { inPatient: newInPatientGroups };
      
      // Sync new row to other selected benefits
      Object.keys(prev).forEach((benefit) => {
        if (benefit !== 'inPatient') {
          newGroups[benefit] = newInPatientGroups.map((ipGroup, index) => ({
            id: prev[benefit]?.[index]?.id || `${benefit}-${Date.now()}-${index}`,
            benefitType: benefit as BenefitGroup['benefitType'],
            planName: prev[benefit]?.[index]?.planName || "",
            members: { ...ipGroup.members },
          }));
        }
      });
      
      return newGroups;
    });
  };

  const removeGroup = (index: number) => {
    setBenefitGroups((prev) => {
      const inPatientGroups = prev.inPatient || [];
      if (inPatientGroups.length <= 1) return prev;
      
      const newGroups: Record<string, BenefitGroup[]> = {};
      
      Object.entries(prev).forEach(([benefit, groups]) => {
        newGroups[benefit] = groups.filter((_, i) => i !== index);
      });
      
      return newGroups;
    });
  };

  const updateGroup = (benefitType: string, id: string, field: keyof BenefitGroup | keyof MemberBreakdown, value: string | number) => {
    setBenefitGroups((prev) => ({
      ...prev,
      [benefitType]: (prev[benefitType] || []).map((g) => {
        if (g.id !== id) return g;
        if (field === 'planName' || field === 'benefitType' || field === 'id') {
          return { ...g, [field]: value };
        }
        // It's a member field
        return { ...g, members: { ...g.members, [field]: value } };
      }),
    }));
  };

  // Helper to get plan number for sorting
  const getPlanNumber = (planName: string): number => {
    const match = planName.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // Helper to check if plans are in ascending order
  const arePlansAscending = (groups: BenefitGroup[]): boolean => {
    const planNumbers = groups.map(g => getPlanNumber(g.planName));
    for (let i = 1; i < planNumbers.length; i++) {
      if (planNumbers[i] <= planNumbers[i - 1]) return false;
    }
    return true;
  };

  // Get total female members for maternity (age 0-59 only)
  const getMaternityEligibleFemales = (): number => {
    return (benefitGroups.maternity || []).reduce((sum, g) => sum + g.members.female0to59, 0);
  };

  const validateGroups = (): boolean => {
    const errors: string[] = [];

    Object.entries(benefitGroups).forEach(([benefitType, groups]) => {
      const planNames = new Set<string>();

      groups.forEach((group, index) => {
        // Check plan name is selected
        if (!group.planName) {
          errors.push(`Plan is required for ${BENEFIT_LABELS[benefitType]} row ${index + 1}`);
        } else {
          // Check for duplicate plan names within the same benefit type
          if (planNames.has(group.planName)) {
            errors.push(`Duplicate plan in ${BENEFIT_LABELS[benefitType]}: ${group.planName}`);
          } else {
            planNames.add(group.planName);
          }
        }

        // Check every row has at least 1 member (no zeros)
        const totalMembers = getGroupTotal(group);
        if (totalMembers === 0) {
          errors.push(`Every row must have at least 1 member - ${BENEFIT_LABELS[benefitType]} ${group.planName || `row ${index + 1}`}`);
        }
      });

      // Check ascending order
      if (groups.length > 1 && groups.every(g => g.planName) && !arePlansAscending(groups)) {
        errors.push(`${BENEFIT_LABELS[benefitType]} plans must be in ascending order`);
      }
    });

    // Maternity validation: minimum 5 females (age 0-59 only)
    if (benefitGroups.maternity && benefitGroups.maternity.length > 0) {
      const maternityFemales = getMaternityEligibleFemales();
      if (maternityFemales < 5) {
        errors.push(`Maternity requires minimum 5 female members (age 0-59). Current: ${maternityFemales}`);
      }
    }

    setGroupErrors(errors);
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

  const toggleInsurer = (insurer: InsuranceCompany) => {
    setSelectedInsurers(prev => 
      prev.includes(insurer) 
        ? prev.filter(i => i !== insurer)
        : [...prev, insurer]
    );
    setInsurerError("");
  };

  const nextStep = async () => {
    let isValid = true;

    if (currentStep === 1) {
      isValid = await form.trigger(["insuredName", "insuredAddress"]);
    } else if (currentStep === 2) {
      isValid = await form.trigger(["startDate", "endDate", "benefitsOption"]);
    } else if (currentStep === 3) {
      isValid = await form.trigger(["inPatient", "outPatient", "dental", "maternity"]);
    } else if (currentStep === 4) {
      isValid = validateInsurers();
    } else if (currentStep === 5) {
      isValid = validateGroups();
    }

    if (isValid && currentStep < 6) {
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
    if (!validateInsurers()) {
      toast.error("Please select at least one insurance company");
      return;
    }

    if (mode === "edit" && initialData) {
      const quotation = {
        ...initialData,
        ...data,
        insuranceCompanies: selectedInsurers,
        benefitGroups,
        updatedAt: new Date(),
        version: initialData.version + 1,
      };
      console.log("Quotation updated:", quotation);
      toast.success("Quotation updated successfully!");
      navigate(`/quotation/${initialData.id}`);
    } else {
      const quotation = {
        ...data,
        insuranceCompanies: selectedInsurers,
        benefitGroups,
        id: `Q-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
        status: "draft" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "John Doe",
        version: 1,
      };
      console.log("Quotation submitted:", quotation);
      toast.success("Quotation created successfully!");
      navigate("/");
    }
  };

  const getGroupTotal = (group: BenefitGroup) => {
    const m = group.members;
    return m.male0to59 + m.female0to59 + m.child0to59 + m.male60to64 + m.female60to64;
  };

  const getTotalMembers = (benefitType: string) => {
    return (benefitGroups[benefitType] || []).reduce((sum, g) => sum + getGroupTotal(g), 0);
  };

  const selectedBenefits = Object.keys(benefitGroups);

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

          {/* Step 2: Policy Period & Benefits Option */}
          {currentStep === 2 && (
            <Card className="form-section">
              <CardHeader>
                <CardTitle className="form-section-title">Policy Period & Benefits Option</CardTitle>
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
                          <Button
                            variant="outline"
                            className="w-full pl-3 text-left font-normal"
                            disabled
                          >
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
                  name="benefitsOption"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Benefits Option *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a benefits option" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-popover">
                          {BENEFITS_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {BENEFITS_OPTIONS_LABELS[option]}
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
                <CardTitle className="form-section-title">Benefits Selection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="inPatient"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-primary bg-primary/5 p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={true} // Always mandatory
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="cursor-pointer">
                            In-Patient <span className="text-xs text-primary font-normal">(Mandatory)</span>
                          </FormLabel>
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

          {/* Step 4: Insurance Companies Selection */}
          {currentStep === 4 && (
            <Card className="form-section">
              <CardHeader>
                <CardTitle className="form-section-title">Insurance Companies</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select the insurance companies to request quotations from
                </p>
                <div className="space-y-3">
                  {INSURANCE_COMPANY_OPTIONS.map((insurer) => (
                    <div
                      key={insurer}
                      className={cn(
                        "flex flex-row items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                        selectedInsurers.includes(insurer) && "border-primary bg-primary/5"
                      )}
                      onClick={() => toggleInsurer(insurer)}
                    >
                      <Checkbox
                        checked={selectedInsurers.includes(insurer)}
                        onCheckedChange={() => toggleInsurer(insurer)}
                      />
                      <div className="space-y-1 leading-none">
                        <span className="font-medium">{INSURANCE_COMPANIES[insurer]}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {insurerError && (
                  <p className="text-sm text-destructive">{insurerError}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 5: Group Structure - In-Patient controls rows, synced to other benefits */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {/* In-Patient Section - Controls rows and member counts */}
              <Card className="form-section">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="form-section-title mb-0 border-b-0 pb-0">
                    {BENEFIT_LABELS.inPatient} Plans
                    <span className="text-xs font-normal text-muted-foreground ml-2">(Controls group structure)</span>
                  </CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addGroup}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Row
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th rowSpan={2} className="align-bottom">Plan Name</th>
                          <th colSpan={3} className="text-center border-b-0">Age 0-59</th>
                          <th colSpan={2} className="text-center border-b-0">Age 60-64</th>
                          <th rowSpan={2} className="align-bottom text-center">Total</th>
                          <th rowSpan={2}></th>
                        </tr>
                        <tr>
                          <th className="text-center">Male</th>
                          <th className="text-center">Female</th>
                          <th className="text-center">Child</th>
                          <th className="text-center">Male</th>
                          <th className="text-center">Female</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(benefitGroups.inPatient || []).map((group, index) => (
                          <tr key={group.id}>
                            <td>
                              <Select
                                value={group.planName}
                                onValueChange={(value) => updateGroup("inPatient", group.id, "planName", value)}
                              >
                                <SelectTrigger className="w-full min-w-[120px]">
                                  <SelectValue placeholder="Select a plan" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover">
                                  {PLAN_OPTIONS.inPatient.map((plan) => (
                                    <SelectItem key={plan} value={plan}>
                                      {plan}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td>
                              <Input
                                type="number"
                                min="0"
                                className="w-16 text-center"
                                value={group.members.male0to59 || ""}
                                onChange={(e) => updateGroup("inPatient", group.id, "male0to59", parseInt(e.target.value) || 0)}
                                placeholder="0"
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                min="0"
                                className="w-16 text-center"
                                value={group.members.female0to59 || ""}
                                onChange={(e) => updateGroup("inPatient", group.id, "female0to59", parseInt(e.target.value) || 0)}
                                placeholder="0"
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                min="0"
                                className="w-16 text-center"
                                value={group.members.child0to59 || ""}
                                onChange={(e) => updateGroup("inPatient", group.id, "child0to59", parseInt(e.target.value) || 0)}
                                placeholder="0"
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                min="0"
                                className="w-16 text-center"
                                value={group.members.male60to64 || ""}
                                onChange={(e) => updateGroup("inPatient", group.id, "male60to64", parseInt(e.target.value) || 0)}
                                placeholder="0"
                              />
                            </td>
                            <td>
                              <Input
                                type="number"
                                min="0"
                                className="w-16 text-center"
                                value={group.members.female60to64 || ""}
                                onChange={(e) => updateGroup("inPatient", group.id, "female60to64", parseInt(e.target.value) || 0)}
                                placeholder="0"
                              />
                            </td>
                            <td className="text-center font-medium">
                              {getGroupTotal(group)}
                            </td>
                            <td>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeGroup(index)}
                                disabled={(benefitGroups.inPatient || []).length === 1}
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
                          <td colSpan={5}></td>
                          <td className="text-center font-medium">{getTotalMembers("inPatient")}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Other Benefits - Plan selection only, members synced from In-Patient */}
              {selectedBenefits.filter(b => b !== 'inPatient').map((benefitType) => (
                <Card key={benefitType} className="form-section">
                  <CardHeader>
                    <CardTitle className="form-section-title mb-0 border-b-0 pb-0">
                      {BENEFIT_LABELS[benefitType]} Plans
                      <span className="text-xs font-normal text-muted-foreground ml-2">(Members synced from In-Patient)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th rowSpan={2} className="align-bottom">Plan Name</th>
                            <th colSpan={3} className="text-center border-b-0">Age 0-59</th>
                            <th colSpan={2} className="text-center border-b-0">Age 60-64</th>
                            <th rowSpan={2} className="align-bottom text-center">Total</th>
                          </tr>
                          <tr>
                            <th className="text-center">Male</th>
                            <th className="text-center">Female</th>
                            <th className="text-center">Child</th>
                            <th className="text-center">Male</th>
                            <th className="text-center">Female</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(benefitGroups[benefitType] || []).map((group) => (
                            <tr key={group.id}>
                              <td>
                                <Select
                                  value={group.planName}
                                  onValueChange={(value) => updateGroup(benefitType, group.id, "planName", value)}
                                >
                                  <SelectTrigger className="w-full min-w-[120px]">
                                    <SelectValue placeholder="Select a plan" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-popover">
                                    {PLAN_OPTIONS[benefitType as keyof typeof PLAN_OPTIONS]?.map((plan) => (
                                      <SelectItem key={plan} value={plan}>
                                        {plan}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="text-center text-muted-foreground">{group.members.male0to59}</td>
                              <td className="text-center text-muted-foreground">{group.members.female0to59}</td>
                              <td className="text-center text-muted-foreground">{group.members.child0to59}</td>
                              <td className="text-center text-muted-foreground">{group.members.male60to64}</td>
                              <td className="text-center text-muted-foreground">{group.members.female60to64}</td>
                              <td className="text-center font-medium">{getGroupTotal(group)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td className="font-medium">Total</td>
                            <td colSpan={5}></td>
                            <td className="text-center font-medium">{getTotalMembers(benefitType)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {groupErrors.length > 0 && (
                <div className="p-4 bg-destructive/10 rounded-lg">
                  {groupErrors.map((error, idx) => (
                    <p key={idx} className="text-sm text-destructive">{error}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 6: Review */}
          {currentStep === 6 && (
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
                    Insurance Companies
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedInsurers.map((insurer) => (
                      <span key={insurer} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                        {INSURANCE_COMPANIES[insurer]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Benefits & Plans
                  </h3>
                  {selectedBenefits.map((benefitType) => (
                    <div key={benefitType} className="space-y-2">
                      <h4 className="font-medium text-foreground">{BENEFIT_LABELS[benefitType]}</h4>
                      <div className="overflow-x-auto">
                        <table className="data-table text-sm">
                          <thead>
                            <tr>
                              <th rowSpan={2} className="align-bottom">Plan</th>
                              <th colSpan={3} className="text-center border-b-0">Age 0-59</th>
                              <th colSpan={2} className="text-center border-b-0">Age 60-64</th>
                              <th rowSpan={2} className="align-bottom text-center">Total</th>
                            </tr>
                            <tr>
                              <th className="text-center">M</th>
                              <th className="text-center">F</th>
                              <th className="text-center">C</th>
                              <th className="text-center">M</th>
                              <th className="text-center">F</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(benefitGroups[benefitType] || []).map((group) => (
                              <tr key={group.id}>
                                <td>{group.planName}</td>
                                <td className="text-center">{group.members.male0to59}</td>
                                <td className="text-center">{group.members.female0to59}</td>
                                <td className="text-center">{group.members.child0to59}</td>
                                <td className="text-center">{group.members.male60to64}</td>
                                <td className="text-center">{group.members.female60to64}</td>
                                <td className="text-center font-medium">{getGroupTotal(group)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td className="font-medium">Total</td>
                              <td colSpan={5}></td>
                              <td className="text-center font-medium">{getTotalMembers(benefitType)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <div className="flex gap-2">
              {onCancel && (
                <Button type="button" variant="ghost" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                Previous
              </Button>
            </div>
            <div className="flex gap-2">
              {currentStep < 6 ? (
                <Button type="button" onClick={nextStep}>
                  Next
                </Button>
              ) : (
                <>
                  <Button type="button" variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    Preview PDF
                  </Button>
                  <Button type="submit">
                    <Save className="w-4 h-4 mr-2" />
                    {mode === "edit" ? "Update Quotation" : "Save Quotation"}
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
