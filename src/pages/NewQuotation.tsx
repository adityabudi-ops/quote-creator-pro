import { Navigate } from "react-router-dom";
import { QuotationForm } from "@/components/quotation/QuotationFormWithScenarios";
import { useAuth } from "@/hooks/useAuth";

export default function NewQuotation() {
  const { profile } = useAuth();
  
  // Admin-only users cannot create quotations
  const isAdminOnly = profile?.role === "admin";
  
  if (isAdminOnly) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Quotation</h1>
        <p className="text-muted-foreground">
          Create a new SME Employee Benefits quotation with optional alternative scenarios
        </p>
      </div>

      {/* Form */}
      <QuotationForm />
    </div>
  );
}
