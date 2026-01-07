import { useState } from "react";
import { format } from "date-fns";
import { Search, Filter, FileText, Edit, CheckCircle, Download, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AuditLogEntry } from "@/types/quotation";

// Sample audit log data
const auditLogs: AuditLogEntry[] = [
  {
    id: "log-1",
    quotationId: "Q-2024-004",
    action: "approved",
    description: "Quotation approved by supervisor",
    performedBy: "Manager Singh",
    performedAt: new Date("2024-01-10T14:30:00"),
    previousValue: "review",
    newValue: "approved",
  },
  {
    id: "log-2",
    quotationId: "Q-2024-004",
    action: "pdf_generated",
    description: "PDF quotation generated and downloaded",
    performedBy: "Jane Smith",
    performedAt: new Date("2024-01-10T10:15:00"),
  },
  {
    id: "log-3",
    quotationId: "Q-2024-004",
    action: "status_changed",
    description: "Status changed from draft to review",
    performedBy: "Jane Smith",
    performedAt: new Date("2024-01-08T16:45:00"),
    previousValue: "draft",
    newValue: "review",
  },
  {
    id: "log-4",
    quotationId: "Q-2024-002",
    action: "modified",
    description: "Benefits updated - added Dental coverage",
    performedBy: "Jane Smith",
    performedAt: new Date("2024-01-18T11:20:00"),
  },
  {
    id: "log-5",
    quotationId: "Q-2024-002",
    action: "created",
    description: "New quotation created for CV Sentosa Abadi",
    performedBy: "Jane Smith",
    performedAt: new Date("2024-01-18T09:00:00"),
  },
  {
    id: "log-6",
    quotationId: "Q-2024-001",
    action: "approved",
    description: "Quotation approved by supervisor",
    performedBy: "Manager Singh",
    performedAt: new Date("2024-01-20T15:00:00"),
    previousValue: "review",
    newValue: "approved",
  },
  {
    id: "log-7",
    quotationId: "Q-2024-003",
    action: "created",
    description: "New quotation created for PT Teknologi Nusantara",
    performedBy: "John Doe",
    performedAt: new Date("2024-01-20T08:30:00"),
  },
  {
    id: "log-8",
    quotationId: "Q-2024-001",
    action: "status_changed",
    description: "Status changed from draft to review",
    performedBy: "John Doe",
    performedAt: new Date("2024-01-17T14:00:00"),
    previousValue: "draft",
    newValue: "review",
  },
];

const actionIcons: Record<AuditLogEntry["action"], React.ReactNode> = {
  created: <FileText className="w-4 h-4" />,
  modified: <Edit className="w-4 h-4" />,
  status_changed: <CheckCircle className="w-4 h-4" />,
  pdf_generated: <Download className="w-4 h-4" />,
  approved: <CheckCircle className="w-4 h-4" />,
};

const actionColors: Record<AuditLogEntry["action"], string> = {
  created: "bg-emerald-100 text-emerald-700",
  modified: "bg-blue-100 text-blue-700",
  status_changed: "bg-amber-100 text-amber-700",
  pdf_generated: "bg-purple-100 text-purple-700",
  approved: "bg-emerald-100 text-emerald-700",
};

export default function AuditLog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<AuditLogEntry["action"] | "all">("all");

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.quotationId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-muted-foreground">
          Complete activity history for all quotations
        </p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border p-4 shadow-card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by quote ID, description, or user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={actionFilter}
            onValueChange={(value) => setActionFilter(value as AuditLogEntry["action"] | "all")}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="modified">Modified</SelectItem>
              <SelectItem value="status_changed">Status Changed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pdf_generated">PDF Generated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Log Entries */}
      <div className="bg-card rounded-lg border shadow-card">
        <div className="p-4 border-b bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Showing {filteredLogs.length} log entries
          </p>
        </div>
        <div className="divide-y">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                    actionColors[log.action]
                  )}
                >
                  {actionIcons[log.action]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-primary">{log.quotationId}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">
                      {format(log.performedAt, "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  <p className="mt-1 text-foreground">{log.description}</p>
                  {log.previousValue && log.newValue && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Changed from{" "}
                      <span className="font-medium">{log.previousValue}</span> to{" "}
                      <span className="font-medium">{log.newValue}</span>
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-3 h-3" />
                    {log.performedBy}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filteredLogs.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <p>No log entries found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
