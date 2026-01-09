import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CheckCircle, XCircle, Eye, Clock, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StatusBadge } from "@/components/quotation/StatusBadge";
import { ApprovalInfo } from "@/components/quotation/ApprovalInfo";
import { createNotification } from "@/hooks/useNotifications";
import type { Database } from "@/integrations/supabase/types";

type QuotationStatus = Database["public"]["Enums"]["quotation_status"];
type ApprovalRole = Database["public"]["Enums"]["approval_role"];

export default function Approvals() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  const userRole = profile?.role;

  // Determine which status to filter based on user role
  const getFilterStatus = (): QuotationStatus | null => {
    if (userRole === "tenaga_pialang") return "pending_pialang";
    if (userRole === "tenaga_ahli") return "pending_ahli";
    if (userRole === "admin") return null; // Admin can see all pending
    return null;
  };

  const { data: quotations, isLoading } = useQuery({
    queryKey: ["pending_quotations", userRole],
    queryFn: async () => {
      let query = supabase
        .from("quotations")
        .select(`
          *,
          creator:profiles!quotations_created_by_fkey(full_name)
        `)
        .order("created_at", { ascending: false });
      
      const filterStatus = getFilterStatus();
      if (filterStatus) {
        query = query.eq("status", filterStatus);
      } else if (userRole === "admin") {
        query = query.in("status", ["pending_pialang", "pending_ahli"]);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch approval history for these quotations
      const quotationIds = data.map(q => q.id);
      const { data: approvals, error: approvalsError } = await supabase
        .from("approval_history")
        .select(`
          *,
          approver:profiles!approval_history_approved_by_fkey(full_name)
        `)
        .in("quotation_id", quotationIds);
      
      if (approvalsError) throw approvalsError;
      
      // Map approvals to quotations
      return data.map(quotation => {
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

  const approveMutation = useMutation({
    mutationFn: async (quotation: any) => {
      const currentStatus = quotation.status as QuotationStatus;
      let newStatus: QuotationStatus;
      let approvalRole: ApprovalRole;

      if (currentStatus === "pending_pialang") {
        newStatus = "pending_ahli";
        approvalRole = "tenaga_pialang";
      } else if (currentStatus === "pending_ahli") {
        newStatus = "approved";
        approvalRole = "tenaga_ahli";
      } else {
        throw new Error("Invalid status for approval");
      }

      // Update quotation status
      const { error: updateError } = await supabase
        .from("quotations")
        .update({ status: newStatus })
        .eq("id", quotation.id);
      
      if (updateError) throw updateError;

      // Record approval history
      const { error: historyError } = await supabase
        .from("approval_history")
        .insert({
          quotation_id: quotation.id,
          approval_role: approvalRole,
          approved_by: profile?.id,
          status: "approved",
        });
      
      if (historyError) throw historyError;

      // Create notifications based on new status
      if (newStatus === "pending_ahli") {
        // Notify Tenaga Ahli about pending approval
        await createNotification({
          targetRole: "tenaga_ahli",
          type: "pending_approval",
          title: "Quotation Pending Your Approval",
          message: `Quotation ${quotation.quotation_number} for ${quotation.insured_name} has been approved by Tenaga Pialang and requires your review.`,
          quotationId: quotation.id,
        });
      } else if (newStatus === "approved") {
        // Notify the creator that quotation is approved
        await createNotification({
          userId: quotation.created_by,
          type: "quotation_created",
          title: "Quotation Approved",
          message: `Your quotation ${quotation.quotation_number} for ${quotation.insured_name} has been fully approved.`,
          quotationId: quotation.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending_quotations"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Quotation approved");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ quotation, reason }: { quotation: any; reason: string }) => {
      const currentStatus = quotation.status as QuotationStatus;
      let approvalRole: ApprovalRole;

      if (currentStatus === "pending_pialang") {
        approvalRole = "tenaga_pialang";
      } else if (currentStatus === "pending_ahli") {
        approvalRole = "tenaga_ahli";
      } else {
        throw new Error("Invalid status for rejection");
      }

      // Update quotation status
      const { error: updateError } = await supabase
        .from("quotations")
        .update({ status: "rejected" as QuotationStatus })
        .eq("id", quotation.id);
      
      if (updateError) throw updateError;

      // Record approval history
      const { error: historyError } = await supabase
        .from("approval_history")
        .insert({
          quotation_id: quotation.id,
          approval_role: approvalRole,
          approved_by: profile?.id,
          status: "rejected",
          comments: reason,
        });
      
      if (historyError) throw historyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending_quotations"] });
      toast.success("Quotation rejected");
      setRejectDialogOpen(false);
      setRejectReason("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredQuotations = quotations?.filter(
    (q) =>
      q.insured_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const openRejectDialog = (quotation: any) => {
    setSelectedQuotation(quotation);
    setRejectDialogOpen(true);
  };

  const handleReject = () => {
    if (selectedQuotation && rejectReason.trim()) {
      rejectMutation.mutate({ quotation: selectedQuotation, reason: rejectReason });
    }
  };

  const getTotalMembers = (groups: any[]) => {
    if (!groups) return 0;
    return groups.reduce((sum: number, g: any) => {
      const m = g.members || {};
      return sum + (m.male0to59 || 0) + (m.female0to59 || 0) + (m.child0to59 || 0) + (m.male60to64 || 0) + (m.female60to64 || 0);
    }, 0);
  };

  const getBenefitsSummary = (benefits: any): string => {
    if (!benefits) return "";
    const active: string[] = [];
    if (benefits.inPatient) active.push("In-Patient");
    if (benefits.outPatient) active.push("Out-Patient");
    if (benefits.dental) active.push("Dental");
    if (benefits.maternity) active.push("Maternity");
    return active.join(", ");
  };

  const canApprove = userRole === "tenaga_pialang" || userRole === "tenaga_ahli" || userRole === "admin";

  const pendingPialangCount = quotations?.filter(q => q.status === "pending_pialang").length || 0;
  const pendingAhliCount = quotations?.filter(q => q.status === "pending_ahli").length || 0;

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Approval Queue</h1>
        <p className="text-muted-foreground">
          Multi-layer approval: Account Executive → Tenaga Pialang → Tenaga Ahli → Approved
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-700">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingPialangCount}</p>
                <p className="text-sm text-muted-foreground">Pending Pialang</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-700">
                <ArrowRight className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingAhliCount}</p>
                <p className="text-sm text-muted-foreground">Pending Ahli</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-700">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredQuotations.length}</p>
                <p className="text-sm text-muted-foreground">In Your Queue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Search by quotation ID or insured name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Pending Quotations List */}
      <div className="space-y-4">
        {filteredQuotations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium">All caught up!</h3>
              <p className="text-muted-foreground">
                No pending quotations to review at the moment
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredQuotations.map((quotation) => (
            <Card key={quotation.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{quotation.insured_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{quotation.quotation_number}</p>
                  </div>
                  <StatusBadge status={quotation.status} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created by:</span>
                    <span>{quotation.creator?.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Date:</span>
                    <span>{format(new Date(quotation.created_at), "PP")}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total Members:</span>{" "}
                    <span className="font-medium">{getTotalMembers(quotation.insured_groups as any[])}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Benefits:</span>{" "}
                    <span>{getBenefitsSummary(quotation.benefits) || "N/A"}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground mr-2">Approvals:</span>
                    <ApprovalInfo
                      pialangApproval={quotation.pialangApproval}
                      ahliApproval={quotation.ahliApproval}
                      status={quotation.status}
                      compact
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/quotation/${quotation.id}`}>
                      <Eye className="w-4 h-4 mr-2" />
                      View Details
                    </Link>
                  </Button>
                  {canApprove && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => openRejectDialog(quotation)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => approveMutation.mutate(quotation)}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Reject Quotation</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting quotation {selectedQuotation?.quotation_number}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
