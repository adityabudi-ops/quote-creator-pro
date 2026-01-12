import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Type definitions based on the new tables
export interface BenefitType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_mandatory: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanTier {
  id: string;
  benefit_type_id: string;
  name: string;
  limit_value: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  benefit_type?: BenefitType;
}

export interface BenefitsOption {
  id: string;
  code: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoverageItem {
  id: string;
  plan_tier_id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plan_tier?: PlanTier;
  coverage_values?: CoverageValue[];
}

export interface CoverageValue {
  id: string;
  coverage_item_id: string;
  benefits_option_id: string;
  value: number;
  value_type: 'amount' | 'percentage' | 'as_charged' | 'not_covered';
  notes: string | null;
  created_at: string;
  updated_at: string;
  benefits_option?: BenefitsOption;
}

export interface PlanTierOption {
  id: string;
  plan_tier_id: string;
  benefits_option_id: string;
  created_at: string;
  benefits_option?: BenefitsOption;
}

// Fetch all benefit types
export function useBenefitTypes(activeOnly = true) {
  return useQuery({
    queryKey: ["benefit_types", activeOnly],
    queryFn: async () => {
      let query = supabase
        .from("benefit_types")
        .select("*")
        .order("display_order", { ascending: true });
      
      if (activeOnly) {
        query = query.eq("is_active", true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as BenefitType[];
    },
  });
}

// Fetch plan tiers for a specific benefit type or all
export function usePlanTiers(benefitTypeId?: string, activeOnly = true) {
  return useQuery({
    queryKey: ["plan_tiers", benefitTypeId, activeOnly],
    queryFn: async () => {
      let query = supabase
        .from("plan_tiers")
        .select("*, benefit_type:benefit_types(*)")
        .order("display_order", { ascending: true });
      
      if (benefitTypeId) {
        query = query.eq("benefit_type_id", benefitTypeId);
      }
      
      if (activeOnly) {
        query = query.eq("is_active", true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as PlanTier[];
    },
  });
}

// Fetch all benefits options
export function useBenefitsOptions(activeOnly = true) {
  return useQuery({
    queryKey: ["benefits_options", activeOnly],
    queryFn: async () => {
      let query = supabase
        .from("benefits_options")
        .select("*")
        .order("display_order", { ascending: true });
      
      if (activeOnly) {
        query = query.eq("is_active", true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as BenefitsOption[];
    },
  });
}

// Mutations for Benefit Types
export function useCreateBenefitType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<BenefitType, "id" | "created_at" | "updated_at">) => {
      const { data: result, error } = await supabase
        .from("benefit_types")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["benefit_types"] });
    },
  });
}

export function useUpdateBenefitType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<BenefitType> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("benefit_types")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["benefit_types"] });
    },
  });
}

export function useDeleteBenefitType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("benefit_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["benefit_types"] });
      queryClient.invalidateQueries({ queryKey: ["plan_tiers"] });
    },
  });
}

// Mutations for Plan Tiers
export function useCreatePlanTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<PlanTier, "id" | "created_at" | "updated_at" | "benefit_type">) => {
      const { data: result, error } = await supabase
        .from("plan_tiers")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan_tiers"] });
    },
  });
}

export function useUpdatePlanTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<PlanTier> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("plan_tiers")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan_tiers"] });
    },
  });
}

export function useDeletePlanTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plan_tiers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan_tiers"] });
    },
  });
}

// Mutations for Benefits Options
export function useCreateBenefitsOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<BenefitsOption, "id" | "created_at" | "updated_at">) => {
      const { data: result, error } = await supabase
        .from("benefits_options")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["benefits_options"] });
    },
  });
}

export function useUpdateBenefitsOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<BenefitsOption> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("benefits_options")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["benefits_options"] });
    },
  });
}

export function useDeleteBenefitsOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("benefits_options").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["benefits_options"] });
    },
  });
}

// Fetch coverage items for a plan tier
export function useCoverageItems(planTierId?: string, activeOnly = true) {
  return useQuery({
    queryKey: ["coverage_items", planTierId, activeOnly],
    queryFn: async () => {
      let query = supabase
        .from("coverage_items")
        .select("*, coverage_values(*, benefits_option:benefits_options(*))")
        .order("display_order", { ascending: true });
      
      if (planTierId) {
        query = query.eq("plan_tier_id", planTierId);
      }
      
      if (activeOnly) {
        query = query.eq("is_active", true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CoverageItem[];
    },
  });
}

// Mutations for Coverage Items
export function useCreateCoverageItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<CoverageItem, "id" | "created_at" | "updated_at" | "plan_tier" | "coverage_values">) => {
      const { data: result, error } = await supabase
        .from("coverage_items")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coverage_items"] });
    },
  });
}

export function useUpdateCoverageItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CoverageItem> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("coverage_items")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coverage_items"] });
    },
  });
}

export function useDeleteCoverageItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coverage_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coverage_items"] });
    },
  });
}

// Mutations for Coverage Values
export function useUpsertCoverageValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<CoverageValue, "id" | "created_at" | "updated_at" | "benefits_option">) => {
      const { data: result, error } = await supabase
        .from("coverage_values")
        .upsert(data, { onConflict: "coverage_item_id,benefits_option_id" })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coverage_items"] });
    },
  });
}

export function useDeleteCoverageValue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coverage_values").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coverage_items"] });
    },
  });
}

// Fetch plan tier options (linked benefits options for a plan tier)
export function usePlanTierOptions(planTierId?: string) {
  return useQuery({
    queryKey: ["plan_tier_options", planTierId],
    queryFn: async () => {
      if (!planTierId) return [];
      
      const { data, error } = await supabase
        .from("plan_tier_options")
        .select("*, benefits_option:benefits_options(*)")
        .eq("plan_tier_id", planTierId);
      
      if (error) throw error;
      return data as PlanTierOption[];
    },
    enabled: !!planTierId,
  });
}

// Add a benefits option to a plan tier
export function useAddPlanTierOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { plan_tier_id: string; benefits_option_id: string }) => {
      const { data: result, error } = await supabase
        .from("plan_tier_options")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["plan_tier_options", variables.plan_tier_id] });
    },
  });
}

// Remove a benefits option from a plan tier
export function useRemovePlanTierOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ planTierId, benefitsOptionId }: { planTierId: string; benefitsOptionId: string }) => {
      const { error } = await supabase
        .from("plan_tier_options")
        .delete()
        .eq("plan_tier_id", planTierId)
        .eq("benefits_option_id", benefitsOptionId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["plan_tier_options", variables.planTierId] });
    },
  });
}

// Bulk set plan tier options (replaces all existing options)
export function useSetPlanTierOptions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ planTierId, optionIds }: { planTierId: string; optionIds: string[] }) => {
      // Delete existing options
      const { error: deleteError } = await supabase
        .from("plan_tier_options")
        .delete()
        .eq("plan_tier_id", planTierId);
      
      if (deleteError) throw deleteError;
      
      // Insert new options
      if (optionIds.length > 0) {
        const { error: insertError } = await supabase
          .from("plan_tier_options")
          .insert(optionIds.map(optionId => ({
            plan_tier_id: planTierId,
            benefits_option_id: optionId,
          })));
        
        if (insertError) throw insertError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["plan_tier_options", variables.planTierId] });
    },
  });
}
