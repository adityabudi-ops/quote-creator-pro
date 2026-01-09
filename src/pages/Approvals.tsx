import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle, XCircle, Eye, Clock, User } from "lucide-react";
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

interface PendingQuotation {
  id: string;
  insuredName: string;
  submittedBy: string;
  submittedAt: Date;
  totalMembers: number;
  benefits: string[];
  status: 'pending' | 'approved' | 'rejected';
}

// Mock data for pending approvals
const mockPendingQuotations: PendingQuotation[] = [
  {
    id: "QT-2024-001",
    insuredName: "Tech Solutions Pte Ltd",
    submittedBy: "John Doe",
    submittedAt: new Date(2024, 0, 15),
    totalMembers: 150,
    benefits: ["In-Patient", "Out-Patient", "Dental"],
    status: "pending",
  },
  {
    id: "QT-2024-002",
    insuredName: "Global Traders Inc",
    submittedBy: "Jane Smith",
    submittedAt: new Date(2024, 0, 14),
    totalMembers: 85,
    benefits: ["In-Patient", "Maternity"],
    status: "pending",
  },
  {
    id: "QT-2024-003",
    insuredName: "Manufacturing Co Ltd",
    submittedBy: "Mike Johnson",
    submittedAt: new Date(2024, 0, 13),
    totalMembers: 320,
    benefits: ["In-Patient", "Out-Patient", "Dental", "Maternity"],
    status: "pending",
  },
];

export default function Approvals() {
  const [quotations, setQuotations] = useState<PendingQuotation[]>(mockPendingQuotations);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuotation, setSelectedQuotation] = useState<PendingQuotation | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const filteredQuotations = quotations.filter(
    (q) =>
      q.status === "pending" &&
      (q.insuredName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.submittedBy.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleApprove = (id: string) => {
    setQuotations((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: "approved" as const } : q))
    );
    toast.success(`Quotation ${id} has been approved`);
  };

  const handleReject = () => {
    if (selectedQuotation && rejectReason.trim()) {
      setQuotations((prev) =>
        prev.map((q) =>
          q.id === selectedQuotation.id ? { ...q, status: "rejected" as const } : q
        )
      );
      toast.success(`Quotation ${selectedQuotation.id} has been rejected`);
      setRejectDialogOpen(false);
      setSelectedQuotation(null);
      setRejectReason("");
    }
  };

  const openRejectDialog = (quotation: PendingQuotation) => {
    setSelectedQuotation(quotation);
    setRejectDialogOpen(true);
  };

  const pendingCount = quotations.filter((q) => q.status === "pending").length;
  const approvedCount = quotations.filter((q) => q.status === "approved").length;
  const rejectedCount = quotations.filter((q) => q.status === "rejected").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Approval Queue</h1>
        <p className="text-muted-foreground">
          Review and approve pending quotation requests
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
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
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
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-sm text-muted-foreground">Approved Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 text-red-700">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejectedCount}</p>
                <p className="text-sm text-muted-foreground">Rejected Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <Input
          placeholder="Search by quotation ID, insured name, or submitter..."
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
                    <CardTitle className="text-lg">{quotation.insuredName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{quotation.id}</p>
                  </div>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    Pending Review
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Submitted by:</span>
                    <span>{quotation.submittedBy}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Date:</span>
                    <span>{format(quotation.submittedAt, "PP")}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total Members:</span>{" "}
                    <span className="font-medium">{quotation.totalMembers}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Benefits:</span>{" "}
                    <span>{quotation.benefits.join(", ")}</span>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
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
                    onClick={() => handleApprove(quotation.id)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
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
              Please provide a reason for rejecting quotation {selectedQuotation?.id}
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
              disabled={!rejectReason.trim()}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
