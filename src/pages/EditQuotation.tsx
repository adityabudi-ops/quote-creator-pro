import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuotationForm } from "@/components/quotation/QuotationForm";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type QuotationStatus = Database["public"]["Enums"]["quotation_status"];

export default function EditQuotation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: quotation, isLoading } = useQuery({
    queryKey: ["quotation", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("quotations")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Loading quotation...</p>
      </div>
    );
  }

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

  // Quotations can only be edited when in draft or rejected status
  // Once in approval workflow (pending_pialang, pending_ahli) or approved/locked, they cannot be edited
  const editableStatuses: QuotationStatus[] = ["draft", "rejected"];
  const canEdit = editableStatuses.includes(quotation.status);

  if (!canEdit) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h1 className="text-2xl font-bold text-foreground mb-2">Cannot Edit Quotation</h1>
        <p className="text-muted-foreground mb-4">
          This quotation is {quotation.status.replace("_", " ")} and cannot be edited.
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

  // Transform database data to form format
  const formData = {
    id: quotation.quotation_number,
    insuredName: quotation.insured_name,
    insuredAddress: quotation.insured_address,
    startDate: new Date(quotation.start_date),
    endDate: new Date(quotation.end_date),
    benefitsOption: quotation.benefits_option as any,
    insuranceCompanies: quotation.insurance_companies as any[],
    benefits: quotation.benefits as any,
    insuredGroups: quotation.insured_groups as any[],
    status: quotation.status as any,
    createdAt: new Date(quotation.created_at),
    updatedAt: new Date(quotation.updated_at),
    createdBy: quotation.created_by,
    version: quotation.version,
  };

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
          <p className="text-muted-foreground">{quotation.quotation_number} - {quotation.insured_name}</p>
        </div>
      </div>

      {/* Form */}
      <QuotationForm 
        mode="edit" 
        initialData={formData}
        onCancel={() => navigate(`/quotation/${quotation.id}`)}
      />
    </div>
  );
}
