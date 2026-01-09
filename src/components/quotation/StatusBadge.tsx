import { cn } from "@/lib/utils";

// Support both old and new status types
type QuotationStatus = 'draft' | 'review' | 'approved' | 'locked' | 'pending_pialang' | 'pending_ahli' | 'rejected';

interface StatusBadgeProps {
  status: QuotationStatus | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "status-draft" },
  review: { label: "In Review", className: "status-review" },
  pending_pialang: { label: "Pending Pialang", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  pending_ahli: { label: "Pending Ahli", className: "bg-orange-100 text-orange-700 border-orange-200" },
  approved: { label: "Approved", className: "status-approved" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700 border-red-200" },
  locked: { label: "Locked", className: "status-locked" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.draft;
  
  return (
    <span className={cn("status-badge", config.className, className)}>
      {config.label}
    </span>
  );
}
