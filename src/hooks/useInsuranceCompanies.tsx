import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type InsuranceCompany = Database["public"]["Tables"]["insurance_companies"]["Row"];
type InsertInsuranceCompany = Database["public"]["Tables"]["insurance_companies"]["Insert"];
type UpdateInsuranceCompany = Database["public"]["Tables"]["insurance_companies"]["Update"];

export function useInsuranceCompanies(onlyActive = true) {
  return useQuery({
    queryKey: ["insurance_companies", onlyActive],
    queryFn: async () => {
      let query = supabase.from("insurance_companies").select("*").order("name");
      if (onlyActive) {
        query = query.eq("is_active", true);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as InsuranceCompany[];
    },
  });
}

export function useCreateInsuranceCompany() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (company: InsertInsuranceCompany) => {
      const { data, error } = await supabase
        .from("insurance_companies")
        .insert(company)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance_companies"] });
    },
  });
}

export function useUpdateInsuranceCompany() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateInsuranceCompany & { id: string }) => {
      const { data, error } = await supabase
        .from("insurance_companies")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance_companies"] });
    },
  });
}

export function useDeleteInsuranceCompany() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("insurance_companies")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insurance_companies"] });
    },
  });
}
