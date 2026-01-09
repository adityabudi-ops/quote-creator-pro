import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ApprovalHistoryItem {
  id: string;
  quotation_id: string;
  approval_role: string;
  approved_by: string | null;
  status: string;
  comments: string | null;
  created_at: string;
  approver?: {
    full_name: string;
  } | null;
}

export function useApprovalHistory(quotationId: string | undefined) {
  return useQuery({
    queryKey: ["approval_history", quotationId],
    queryFn: async () => {
      if (!quotationId) return [];
      
      const { data, error } = await supabase
        .from("approval_history")
        .select(`
          *,
          approver:profiles!approval_history_approved_by_fkey(full_name)
        `)
        .eq("quotation_id", quotationId)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as ApprovalHistoryItem[];
    },
    enabled: !!quotationId,
  });
}

export function useQuotationsWithApprovals() {
  return useQuery({
    queryKey: ["quotations_with_approvals"],
    queryFn: async () => {
      // Fetch all quotations
      const { data: quotations, error: quotationsError } = await supabase
        .from("quotations")
        .select(`
          *,
          creator:profiles!quotations_created_by_fkey(full_name)
        `)
        .order("created_at", { ascending: false });
      
      if (quotationsError) throw quotationsError;
      
      // Fetch all approval history
      const { data: approvals, error: approvalsError } = await supabase
        .from("approval_history")
        .select(`
          *,
          approver:profiles!approval_history_approved_by_fkey(full_name)
        `);
      
      if (approvalsError) throw approvalsError;
      
      // Map approvals to quotations
      return quotations.map(quotation => {
        const quotationApprovals = approvals?.filter(
          a => a.quotation_id === quotation.id
        ) || [];
        
        const pialangApproval = quotationApprovals.find(
          a => a.approval_role === "tenaga_pialang" && a.status === "approved"
        );
        const ahliApproval = quotationApprovals.find(
          a => a.approval_role === "tenaga_ahli" && a.status === "approved"
        );
        
        return {
          ...quotation,
          pialangApproval,
          ahliApproval,
        };
      });
    },
  });
}

export function getApprovalByRole(approvals: ApprovalHistoryItem[], role: string) {
  return approvals.find(
    a => a.approval_role === role && a.status === "approved"
  );
}
