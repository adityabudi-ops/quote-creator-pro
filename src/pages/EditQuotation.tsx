import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuotationForm } from "@/components/quotation/QuotationForm";
import type { QuotationData } from "@/types/quotation";

// Default member breakdown helper
const defaultMembers = {
  male0to59: 0,
  female0to59: 0,
  child0to59: 0,
  male60to64: 0,
  female60to64: 0,
};

// Mock data - in real app this would be fetched
const mockQuotations: Record<string, QuotationData> = {
  "Q-2024-001": {
    id: "Q-2024-001",
    insuredName: "PT Maju Bersama",
    insuredAddress: "Jl. Sudirman No. 123, Jakarta",
    startDate: new Date("2024-02-01"),
    endDate: new Date("2025-01-31"),
    benefits: { inPatient: true, outPatient: true, dental: false, maternity: false },
    insuredGroups: [{ id: "1", planName: "IP 500", members: { ...defaultMembers, male0to59: 5, female0to59: 5 } }],
    status: "approved",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
    createdBy: "John Doe",
    version: 1,
  },
  "Q-2024-002": {
    id: "Q-2024-002",
    insuredName: "CV Sentosa Abadi",
    insuredAddress: "Jl. Gatot Subroto No. 45, Bandung",
    startDate: new Date("2024-03-01"),
    endDate: new Date("2025-02-28"),
    benefits: { inPatient: true, outPatient: true, dental: true, maternity: true },
    insuredGroups: [
      { id: "1", planName: "IP 700", members: { ...defaultMembers, male0to59: 3, female0to59: 2 } },
      { id: "2", planName: "IP 500", members: { ...defaultMembers, male0to59: 10, female0to59: 10, child0to59: 5 } },
    ],
    status: "review",
    createdAt: new Date("2024-01-18"),
    updatedAt: new Date("2024-01-18"),
    createdBy: "Jane Smith",
    version: 1,
  },
  "Q-2024-003": {
    id: "Q-2024-003",
    insuredName: "PT Teknologi Nusantara",
    insuredAddress: "Jl. HR Rasuna Said Kav. 5, Jakarta",
    startDate: new Date("2024-04-01"),
    endDate: new Date("2025-03-31"),
    benefits: { inPatient: true, outPatient: false, dental: false, maternity: false },
    insuredGroups: [{ id: "1", planName: "IP 1000", members: { ...defaultMembers, male0to59: 25, female0to59: 20, child0to59: 5 } }],
    status: "draft",
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
    createdBy: "John Doe",
    version: 1,
  },
};

export default function EditQuotation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const quotation = id ? mockQuotations[id] : null;

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold text-foreground mb-2">Quotation Not Found</h1>
        <p className="text-muted-foreground mb-4">The quotation you're looking for doesn't exist.</p>
        <Link to="/quotations">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to All Quotations
          </Button>
        </Link>
      </div>
    );
  }

  const canEdit = quotation.status !== "locked" && quotation.status !== "approved";

  if (!canEdit) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold text-foreground mb-2">Cannot Edit Quotation</h1>
        <p className="text-muted-foreground mb-4">
          This quotation is {quotation.status} and cannot be edited.
        </p>
        <Link to={`/quotation/${quotation.id}`}>
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            View Quotation Details
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`/quotation/${quotation.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Quotation</h1>
          <p className="text-muted-foreground">{quotation.id} - {quotation.insuredName}</p>
        </div>
      </div>

      {/* Form */}
      <QuotationForm 
        mode="edit" 
        initialData={quotation}
        onCancel={() => navigate(`/quotation/${quotation.id}`)}
      />
    </div>
  );
}
