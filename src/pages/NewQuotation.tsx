import { QuotationForm } from "@/components/quotation/QuotationForm";

export default function NewQuotation() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">New Quotation</h1>
        <p className="text-muted-foreground">
          Create a new SME Employee Benefits quotation
        </p>
      </div>

      {/* Form */}
      <QuotationForm />
    </div>
  );
}
