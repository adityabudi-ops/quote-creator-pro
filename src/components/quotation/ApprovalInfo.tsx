import { format } from "date-fns";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ApprovalData {
  approver?: { full_name: string } | null;
  created_at: string;
  status: string;
}

interface ApprovalInfoProps {
  pialangApproval?: ApprovalData | null;
  ahliApproval?: ApprovalData | null;
  status?: string;
  compact?: boolean;
}

export function ApprovalInfo({ pialangApproval, ahliApproval, status, compact = false }: ApprovalInfoProps) {
  const isPendingPialang = status === "pending_pialang";
  const isPendingAhli = status === "pending_ahli";
  const isDraft = status === "draft";
  const isRejected = status === "rejected";

  if (compact) {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1">
          {/* Tenaga Pialang Status */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                {pialangApproval ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : isPendingPialang ? (
                  <Clock className="w-4 h-4 text-yellow-600" />
                ) : isRejected ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : isDraft ? (
                  <Clock className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <p className="font-medium">Tenaga Pialang</p>
                {pialangApproval ? (
                  <>
                    <p>{pialangApproval.approver?.full_name || "Unknown"}</p>
                    <p>{format(new Date(pialangApproval.created_at), "PP")}</p>
                  </>
                ) : isPendingPialang ? (
                  <p>Pending approval</p>
                ) : isDraft ? (
                  <p>Not submitted</p>
                ) : (
                  <p>Pending</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>

          <span className="text-muted-foreground">/</span>

          {/* Tenaga Ahli Status */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                {ahliApproval ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : isPendingAhli ? (
                  <Clock className="w-4 h-4 text-yellow-600" />
                ) : isRejected && !pialangApproval ? (
                  <Clock className="w-4 h-4 text-muted-foreground" />
                ) : isRejected ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <p className="font-medium">Tenaga Ahli</p>
                {ahliApproval ? (
                  <>
                    <p>{ahliApproval.approver?.full_name || "Unknown"}</p>
                    <p>{format(new Date(ahliApproval.created_at), "PP")}</p>
                  </>
                ) : isPendingAhli ? (
                  <p>Pending approval</p>
                ) : (
                  <p>Pending</p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-2">
      {/* Tenaga Pialang */}
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center gap-1.5">
          {pialangApproval ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : isPendingPialang ? (
            <Clock className="w-4 h-4 text-yellow-600" />
          ) : isDraft ? (
            <Clock className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Clock className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-muted-foreground">Tenaga Pialang:</span>
        </div>
        {pialangApproval ? (
          <span className="font-medium">
            {pialangApproval.approver?.full_name || "Unknown"}{" "}
            <span className="text-muted-foreground font-normal">
              ({format(new Date(pialangApproval.created_at), "PP")})
            </span>
          </span>
        ) : isPendingPialang ? (
          <span className="text-yellow-600">Pending</span>
        ) : isDraft ? (
          <span className="text-muted-foreground">Not submitted</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>

      {/* Tenaga Ahli */}
      <div className="flex items-center gap-2 text-sm">
        <div className="flex items-center gap-1.5">
          {ahliApproval ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : isPendingAhli ? (
            <Clock className="w-4 h-4 text-yellow-600" />
          ) : (
            <Clock className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-muted-foreground">Tenaga Ahli:</span>
        </div>
        {ahliApproval ? (
          <span className="font-medium">
            {ahliApproval.approver?.full_name || "Unknown"}{" "}
            <span className="text-muted-foreground font-normal">
              ({format(new Date(ahliApproval.created_at), "PP")})
            </span>
          </span>
        ) : isPendingAhli ? (
          <span className="text-yellow-600">Pending</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}
