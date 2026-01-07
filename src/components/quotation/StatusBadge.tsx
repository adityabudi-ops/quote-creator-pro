import { cn } from "@/lib/utils";
import type { QuotationStatus } from "@/types/quotation";

interface StatusBadgeProps {
  status: QuotationStatus;
  className?: string;
}

const statusConfig: Record<QuotationStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "status-draft" },
  review: { label: "In Review", className: "status-review" },
  approved: { label: "Approved", className: "status-approved" },
  locked: { label: "Locked", className: "status-locked" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span className={cn("status-badge", config.className, className)}>
      {config.label}
    </span>
  );
}
