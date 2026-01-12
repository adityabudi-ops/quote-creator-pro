import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  User, 
  ArrowRight, 
  Search,
  ClipboardCheck,
  FileText,
  Users,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  const getBenefitsSummary = (benefits: any): string[] => {
    if (!benefits) return [];
    const active: string[] = [];
    if (benefits.inPatient) active.push("IP");
    if (benefits.outPatient) active.push("OP");
    if (benefits.dental) active.push("Dental");
    if (benefits.maternity) active.push("Mat.");
    return active;
  };

  // Check if user can approve a specific quotation based on its status
  const canApproveQuotation = (quotationStatus: QuotationStatus) => {
    if (userRole === "admin") return true;
    if (userRole === "tenaga_pialang" && quotationStatus === "pending_pialang") return true;
    if (userRole === "tenaga_ahli" && quotationStatus === "pending_ahli") return true;
    return false;
  };

  const pendingPialangCount = quotations?.filter(q => q.status === "pending_pialang").length || 0;
  const pendingAhliCount = quotations?.filter(q => q.status === "pending_ahli").length || 0;

  const getRoleLabel = () => {
    if (userRole === "tenaga_pialang") return "Tenaga Pialang";
    if (userRole === "tenaga_ahli") return "Tenaga Ahli";
    if (userRole === "admin") return "Administrator";
    return "User";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading approval queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Hero Header with Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[hsl(var(--primary))] via-[hsl(var(--primary)/0.8)] to-[#64D3D8] p-6 md:p-8 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 opacity-80" />
                <span className="text-sm font-medium opacity-90">{getRoleLabel()}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">Approval Queue</h1>
              <p className="text-white/80 text-sm md:text-base">
                Multi-layer approval workflow: Sales → Tenaga Pialang → Tenaga Ahli
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 text-center min-w-[80px]">
                <p className="text-2xl md:text-3xl font-bold">{filteredQuotations.length}</p>
                <p className="text-xs text-white/80">In Queue</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-background">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl md:text-3xl font-bold text-foreground">{pendingPialangCount}</p>
                <p className="text-sm text-muted-foreground truncate">Pending Pialang</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-background">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl md:text-3xl font-bold text-foreground">{pendingAhliCount}</p>
                <p className="text-sm text-muted-foreground truncate">Pending Ahli</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl md:text-3xl font-bold text-foreground">{quotations?.length || 0}</p>
                <p className="text-sm text-muted-foreground truncate">Total Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by quotation number or insured name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11 bg-background border-border/50 focus:border-primary"
        />
      </div>

      {/* Quotations List */}
      <div className="space-y-4">
        {filteredQuotations.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 md:py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">All caught up!</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                No pending quotations to review at the moment. New items will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredQuotations.map((quotation) => (
            <Card 
              key={quotation.id} 
              className="group hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              <CardContent className="p-0">
                {/* Card Header */}
                <div className="p-4 md:p-5 border-b border-border/50 bg-muted/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="hidden sm:flex p-2.5 rounded-xl bg-primary/10 text-primary">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-base md:text-lg truncate">
                          {quotation.insured_name}
                        </h3>
                        <p className="text-sm text-muted-foreground font-mono">
                          {quotation.quotation_number}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={quotation.status} />
                  </div>
                </div>

                {/* Card Body - Info Grid */}
                <div className="p-4 md:p-5 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        Created by
                      </p>
                      <p className="text-sm font-medium text-foreground truncate">
                        {quotation.creator?.full_name || "Unknown"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Submitted
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(quotation.created_at), "dd MMM yyyy")}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        Total Members
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {getTotalMembers(quotation.insured_groups as any[])}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Benefits</p>
                      <div className="flex flex-wrap gap-1">
                        {getBenefitsSummary(quotation.benefits).length > 0 ? (
                          getBenefitsSummary(quotation.benefits).map((benefit) => (
                            <span 
                              key={benefit}
                              className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary"
                            >
                              {benefit}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Approval Progress */}
                  <div className="pt-3 border-t border-border/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Approval Progress:</span>
                        <ApprovalInfo
                          pialangApproval={quotation.pialangApproval}
                          ahliApproval={quotation.ahliApproval}
                          status={quotation.status}
                          compact
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          asChild
                          className="flex-1 sm:flex-none"
                        >
                          <Link to={`/quotation/${quotation.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Link>
                        </Button>
                        {canApproveQuotation(quotation.status) && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-none text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                              onClick={() => openRejectDialog(quotation)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => approveMutation.mutate(quotation)}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="bg-background sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              Reject Quotation
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting quotation{" "}
              <span className="font-mono font-medium">{selectedQuotation?.quotation_number}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
