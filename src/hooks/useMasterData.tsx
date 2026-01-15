import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ============================================
// Type Definitions for New Schema
// ============================================

export interface MasterCoverageRule {
  coverage_rule_code: string;
  coverage_rule_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MasterInsurer {
  insurer_code: string;
  insurer_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MasterBenefitSection {
  section_code: string;
  section_name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MasterTier {
  tier_code: string;
  section_code: string;
  tier_label: string;
  insurer_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  section?: MasterBenefitSection;
  insurer?: MasterInsurer;
}

export interface MasterBenefitItem {
  item_code: string;
  section_code: string;
  item_name: string;
  unit_text: string | null;
  limit_period: string | null;
  display_order: number;
  is_group_header: boolean;
  parent_item_code: string | null;
  sub_label: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  section?: MasterBenefitSection;
}

export type DemographicType = 'M_0_59' | 'F_0_59' | 'C_0_59' | 'M_60_64' | 'F_60_64';
export type ValueType = 'AMOUNT' | 'TEXT' | 'BOOLEAN' | 'NONE';
export type TemplateStatus = 'ACTIVE' | 'INACTIVE';
export type OfferStatus = 'QUOTED' | 'NA' | 'ERROR';

export interface ScheduleTemplateHeader {
  template_id: string;
  coverage_rule_code: string;
  insurer_code: string;
  section_code: string;
  tier_code: string;
  effective_date: string;
  status: TemplateStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  coverage_rule?: MasterCoverageRule;
  insurer?: MasterInsurer;
  section?: MasterBenefitSection;
  tier?: MasterTier;
}

export interface ScheduleTemplateItem {
  template_id: string;
  item_code: string;
  value_type: ValueType;
  value_amount: number | null;
  value_text: string | null;
  currency: string | null;
  unit_text: string | null;
  limit_period: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  benefit_item?: MasterBenefitItem;
}

export interface PricingSectionAge {
  coverage_rule_code: string;
  insurer_code: string;
  section_code: string;
  tier_code: string;
  effective_date: string;
  demographic: DemographicType;
  annual_premium: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface FeesTax {
  id: string;
  insurer_code: string;
  effective_date: string;
  admin_fee: number;
  stamp_duty: number;
  vat_percent: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Coverage Rules Hooks
// ============================================

export function useCoverageRules(activeOnly = true) {
  return useQuery({
    queryKey: ["master_coverage_rule", activeOnly],
    queryFn: async () => {
      let query = supabase
        .from("master_coverage_rule")
        .select("*")
        .order("coverage_rule_code");
      
      if (activeOnly) {
        query = query.eq("is_active", true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as MasterCoverageRule[];
    },
  });
}

export function useCreateCoverageRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<MasterCoverageRule, "created_at" | "updated_at">) => {
      const { data: result, error } = await supabase
        .from("master_coverage_rule")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_coverage_rule"] });
    },
  });
}

export function useUpdateCoverageRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ coverage_rule_code, ...data }: Partial<MasterCoverageRule> & { coverage_rule_code: string }) => {
      const { data: result, error } = await supabase
        .from("master_coverage_rule")
        .update(data)
        .eq("coverage_rule_code", coverage_rule_code)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_coverage_rule"] });
    },
  });
}

export function useDeleteCoverageRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (coverage_rule_code: string) => {
      const { error } = await supabase
        .from("master_coverage_rule")
        .delete()
        .eq("coverage_rule_code", coverage_rule_code);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_coverage_rule"] });
    },
  });
}

// ============================================
// Insurers Hooks
// ============================================

export function useInsurers(activeOnly = true) {
  return useQuery({
    queryKey: ["master_insurer", activeOnly],
    queryFn: async () => {
      let query = supabase
        .from("master_insurer")
        .select("*")
        .order("insurer_name");
      
      if (activeOnly) {
        query = query.eq("is_active", true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as MasterInsurer[];
    },
  });
}

export function useCreateInsurer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<MasterInsurer, "created_at" | "updated_at">) => {
      const { data: result, error } = await supabase
        .from("master_insurer")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_insurer"] });
    },
  });
}

export function useUpdateInsurer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ insurer_code, ...data }: Partial<MasterInsurer> & { insurer_code: string }) => {
      const { data: result, error } = await supabase
        .from("master_insurer")
        .update(data)
        .eq("insurer_code", insurer_code)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_insurer"] });
    },
  });
}

export function useDeleteInsurer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (insurer_code: string) => {
      const { error } = await supabase
        .from("master_insurer")
        .delete()
        .eq("insurer_code", insurer_code);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_insurer"] });
    },
  });
}

// ============================================
// Benefit Sections Hooks
// ============================================

export function useBenefitSections(activeOnly = true) {
  return useQuery({
    queryKey: ["master_benefit_section", activeOnly],
    queryFn: async () => {
      let query = supabase
        .from("master_benefit_section")
        .select("*")
        .order("display_order");
      
      if (activeOnly) {
        query = query.eq("is_active", true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as MasterBenefitSection[];
    },
  });
}

export function useCreateBenefitSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<MasterBenefitSection, "created_at" | "updated_at">) => {
      const { data: result, error } = await supabase
        .from("master_benefit_section")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_benefit_section"] });
    },
  });
}

export function useUpdateBenefitSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ section_code, ...data }: Partial<MasterBenefitSection> & { section_code: string }) => {
      const { data: result, error } = await supabase
        .from("master_benefit_section")
        .update(data)
        .eq("section_code", section_code)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_benefit_section"] });
    },
  });
}

export function useDeleteBenefitSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (section_code: string) => {
      const { error } = await supabase
        .from("master_benefit_section")
        .delete()
        .eq("section_code", section_code);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_benefit_section"] });
    },
  });
}

// ============================================
// Tiers Hooks
// ============================================

export function useTiers(sectionCode?: string, activeOnly = true, insurerCode?: string) {
  return useQuery({
    queryKey: ["master_tier", sectionCode, activeOnly, insurerCode],
    queryFn: async () => {
      let query = supabase
        .from("master_tier")
        .select("*, section:master_benefit_section!master_tier_section_code_fkey(*), insurer:master_insurer!master_tier_insurer_code_fkey(*)")
        .order("insurer_code")
        .order("tier_code");
      
      if (sectionCode) {
        query = query.eq("section_code", sectionCode);
      }
      
      if (insurerCode) {
        query = query.eq("insurer_code", insurerCode);
      }
      
      if (activeOnly) {
        query = query.eq("is_active", true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as MasterTier[];
    },
  });
}

export function useCreateTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<MasterTier, "created_at" | "updated_at" | "section">) => {
      const { data: result, error } = await supabase
        .from("master_tier")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_tier"] });
    },
  });
}

export function useUpdateTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tier_code, ...data }: Partial<MasterTier> & { tier_code: string }) => {
      const { data: result, error } = await supabase
        .from("master_tier")
        .update(data)
        .eq("tier_code", tier_code)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_tier"] });
    },
  });
}

export function useDeleteTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tier_code: string) => {
      const { error } = await supabase
        .from("master_tier")
        .delete()
        .eq("tier_code", tier_code);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_tier"] });
    },
  });
}

// ============================================
// Benefit Items Hooks
// ============================================

export function useBenefitItems(sectionCode?: string, activeOnly = true) {
  return useQuery({
    queryKey: ["master_benefit_item", sectionCode, activeOnly],
    queryFn: async () => {
      let query = supabase
        .from("master_benefit_item")
        .select("*, section:master_benefit_section(*)")
        .order("display_order");
      
      if (sectionCode) {
        query = query.eq("section_code", sectionCode);
      }
      
      if (activeOnly) {
        query = query.eq("is_active", true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as MasterBenefitItem[];
    },
  });
}

export function useCreateBenefitItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<MasterBenefitItem, "created_at" | "updated_at" | "section">) => {
      const { data: result, error } = await supabase
        .from("master_benefit_item")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_benefit_item"] });
    },
  });
}

export function useUpdateBenefitItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ item_code, ...data }: Partial<MasterBenefitItem> & { item_code: string }) => {
      const { data: result, error } = await supabase
        .from("master_benefit_item")
        .update(data)
        .eq("item_code", item_code)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_benefit_item"] });
    },
  });
}

export function useDeleteBenefitItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item_code: string) => {
      const { error } = await supabase
        .from("master_benefit_item")
        .delete()
        .eq("item_code", item_code);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_benefit_item"] });
    },
  });
}

// ============================================
// Schedule Template Hooks
// ============================================

export function useScheduleTemplates(filters?: {
  coverageRuleCode?: string;
  insurerCode?: string;
  sectionCode?: string;
  tierCode?: string;
  status?: TemplateStatus;
}) {
  return useQuery({
    queryKey: ["schedule_template_section_header", filters],
    queryFn: async () => {
      let query = supabase
        .from("schedule_template_section_header")
        .select(`
          *,
          coverage_rule:master_coverage_rule(*),
          insurer:master_insurer(*),
          section:master_benefit_section(*),
          tier:master_tier(*)
        `)
        .order("effective_date", { ascending: false });
      
      if (filters?.coverageRuleCode) {
        query = query.eq("coverage_rule_code", filters.coverageRuleCode);
      }
      if (filters?.insurerCode) {
        query = query.eq("insurer_code", filters.insurerCode);
      }
      if (filters?.sectionCode) {
        query = query.eq("section_code", filters.sectionCode);
      }
      if (filters?.tierCode) {
        query = query.eq("tier_code", filters.tierCode);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ScheduleTemplateHeader[];
    },
  });
}

export function useScheduleTemplateItems(templateId?: string) {
  return useQuery({
    queryKey: ["schedule_template_section_item", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from("schedule_template_section_item")
        .select("*, benefit_item:master_benefit_item(*)")
        .eq("template_id", templateId)
        .order("display_order");
      
      if (error) throw error;
      return data as ScheduleTemplateItem[];
    },
    enabled: !!templateId,
  });
}

export function useCreateScheduleTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<ScheduleTemplateHeader, "template_id" | "created_at" | "updated_at" | "coverage_rule" | "insurer" | "section" | "tier">) => {
      const { data: result, error } = await supabase
        .from("schedule_template_section_header")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule_template_section_header"] });
    },
  });
}

export function useUpdateScheduleTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ template_id, ...data }: Partial<ScheduleTemplateHeader> & { template_id: string }) => {
      const { data: result, error } = await supabase
        .from("schedule_template_section_header")
        .update(data)
        .eq("template_id", template_id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule_template_section_header"] });
    },
  });
}

export function useDeleteScheduleTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (template_id: string) => {
      const { error } = await supabase
        .from("schedule_template_section_header")
        .delete()
        .eq("template_id", template_id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule_template_section_header"] });
    },
  });
}

export function useUpsertScheduleTemplateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<ScheduleTemplateItem, "created_at" | "updated_at" | "benefit_item">) => {
      const { data: result, error } = await supabase
        .from("schedule_template_section_item")
        .upsert(data, { onConflict: "template_id,item_code" })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["schedule_template_section_item", variables.template_id] });
    },
  });
}

export function useDeleteScheduleTemplateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ templateId, itemCode }: { templateId: string; itemCode: string }) => {
      const { error } = await supabase
        .from("schedule_template_section_item")
        .delete()
        .eq("template_id", templateId)
        .eq("item_code", itemCode);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["schedule_template_section_item", variables.templateId] });
    },
  });
}

// ============================================
// Pricing Hooks
// ============================================

export function usePricing(filters?: {
  coverageRuleCode?: string;
  insurerCode?: string;
  sectionCode?: string;
  tierCode?: string;
  effectiveDate?: string;
}) {
  return useQuery({
    queryKey: ["pricing_section_age", filters],
    queryFn: async () => {
      let query = supabase
        .from("pricing_section_age")
        .select("*")
        .order("effective_date", { ascending: false });
      
      if (filters?.coverageRuleCode) {
        query = query.eq("coverage_rule_code", filters.coverageRuleCode);
      }
      if (filters?.insurerCode) {
        query = query.eq("insurer_code", filters.insurerCode);
      }
      if (filters?.sectionCode) {
        query = query.eq("section_code", filters.sectionCode);
      }
      if (filters?.tierCode) {
        query = query.eq("tier_code", filters.tierCode);
      }
      if (filters?.effectiveDate) {
        query = query.eq("effective_date", filters.effectiveDate);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PricingSectionAge[];
    },
  });
}

export function useUpsertPricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<PricingSectionAge, "created_at" | "updated_at">) => {
      const { data: result, error } = await supabase
        .from("pricing_section_age")
        .upsert(data, { 
          onConflict: "coverage_rule_code,insurer_code,section_code,tier_code,effective_date,demographic" 
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing_section_age"] });
    },
  });
}

export function useBulkUpsertPricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<PricingSectionAge, "created_at" | "updated_at">[]) => {
      const { data: result, error } = await supabase
        .from("pricing_section_age")
        .upsert(data, { 
          onConflict: "coverage_rule_code,insurer_code,section_code,tier_code,effective_date,demographic" 
        })
        .select();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricing_section_age"] });
    },
  });
}

// ============================================
// Fees & Tax Hooks
// ============================================

export function useFeesTax(insurerCode?: string) {
  return useQuery({
    queryKey: ["fees_tax", insurerCode],
    queryFn: async () => {
      let query = supabase
        .from("fees_tax")
        .select("*")
        .order("effective_date", { ascending: false });
      
      if (insurerCode) {
        query = query.eq("insurer_code", insurerCode);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as FeesTax[];
    },
  });
}

export function useUpsertFeesTax() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<FeesTax, "id" | "created_at" | "updated_at">) => {
      const { data: result, error } = await supabase
        .from("fees_tax")
        .upsert(data, { onConflict: "insurer_code,effective_date" })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees_tax"] });
    },
  });
}

export function useDeleteFeesTax() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fees_tax")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees_tax"] });
    },
  });
}

// ============================================
// Helper Constants
// ============================================

export const DEMOGRAPHIC_LABELS: Record<DemographicType, string> = {
  M_0_59: "Male 0-59",
  F_0_59: "Female 0-59",
  C_0_59: "Child 0-59",
  M_60_64: "Male 60-64",
  F_60_64: "Female 60-64",
};

export const VALUE_TYPE_LABELS: Record<ValueType, string> = {
  AMOUNT: "Amount",
  TEXT: "Text",
  BOOLEAN: "Yes/No",
  NONE: "N/A",
};

// ============================================
// Bulk Insert Helpers
// ============================================

export function useBulkInsertBenefitItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: Omit<MasterBenefitItem, "created_at" | "updated_at" | "section">[]) => {
      const { data, error } = await supabase
        .from("master_benefit_item")
        .upsert(items, { onConflict: "item_code" })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master_benefit_item"] });
    },
  });
}

export function useBulkUpsertScheduleTemplateItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: Omit<ScheduleTemplateItem, "created_at" | "updated_at" | "benefit_item">[]) => {
      const { data, error } = await supabase
        .from("schedule_template_section_item")
        .upsert(items, { onConflict: "template_id,item_code" })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["schedule_template_section_item", variables[0].template_id] });
      }
      queryClient.invalidateQueries({ queryKey: ["schedule_template_section_item"] });
    },
  });
}
