import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface PDFGenerationData {
  quotation: {
    quotation_number: string;
    insured_name: string;
    insured_address: string;
    line_of_business?: string | null;
    start_date: string;
    end_date: string;
    benefits_option: string;
    coverage_rule_code?: string | null;
    insurance_companies: string[];
    benefits: Json;
    creator?: { full_name: string } | null;
    created_at: string;
  };
  packages: any[];
  premiums: {
    details: any[];
    summaries: any[];
    overalls: any[];
  };
  scheduleItems: any[];
  insurersList: { insurer_code: string; insurer_name: string }[];
}

const SECTION_LABELS: Record<string, string> = {
  IP: "In-Patient",
  OP: "Out-Patient",
  DE: "Dental",
  MA: "Maternity",
};

const DEMOGRAPHIC_LABELS: Record<string, string> = {
  M_0_59: "Male 0-59",
  F_0_59: "Female 0-59",
  C_0_59: "Child 0-59",
  M_60_64: "Male 60-64",
  F_60_64: "Female 60-64",
};

const BENEFITS_OPTIONS_LABELS: Record<string, string> = {
  inner_limit_all: "Inner Limit For All Benefits",
  inner_limit_ip_ma_as_charge_op_de: "Inner Limit for IP/MA, OP/DE As Charge",
  semi_as_charge_ip_inner_limit_ma_as_charge_op_de: "Semi As Charge for IP, MA Inner Limit, OP/DE As Charge",
  as_charge_ip_op_de_inner_limit_ma: "As Charge for IP/OP/DE, MA Inner Limit",
};

export function useQuotationPDF() {
  const [isGenerating, setIsGenerating] = useState(false);

  const getInsurerName = (code: string, insurersList: any[]): string => {
    return insurersList?.find((i) => i.insurer_code === code)?.insurer_name || code;
  };

  const formatCurrency = (amount: number): string => {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  };

  const generatePDF = async (data: PDFGenerationData) => {
    setIsGenerating(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Colors
      const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo
      const textColor: [number, number, number] = [31, 41, 55];
      const mutedColor: [number, number, number] = [107, 114, 128];

      // ============================================
      // HEADER
      // ============================================
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 45, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("INSURANCE QUOTATION", margin, 20);

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(data.quotation.quotation_number, margin, 30);

      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`, margin, 38);

      // Company logo area (right side)
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("PREMIRO", pageWidth - margin, 20, { align: "right" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Insurance Broker", pageWidth - margin, 27, { align: "right" });

      yPos = 55;

      // ============================================
      // INSURED INFORMATION
      // ============================================
      doc.setTextColor(...textColor);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Insured Information", margin, yPos);
      yPos += 8;

      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 6;

      const infoData = [
        ["Insured Name", data.quotation.insured_name],
        ["Address", data.quotation.insured_address],
        ["Line of Business", data.quotation.line_of_business || "-"],
        ["Policy Period", `${format(new Date(data.quotation.start_date), "dd MMM yyyy")} - ${format(new Date(data.quotation.end_date), "dd MMM yyyy")}`],
        ["Coverage Rule", BENEFITS_OPTIONS_LABELS[data.quotation.benefits_option] || data.quotation.benefits_option],
        ["Created By", data.quotation.creator?.full_name || "-"],
      ];

      doc.setFontSize(10);
      infoData.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...mutedColor);
        doc.text(label + ":", margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...textColor);
        doc.text(String(value), margin + 45, yPos);
        yPos += 6;
      });

      yPos += 5;

      // ============================================
      // SELECTED BENEFITS
      // ============================================
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      doc.text("Selected Benefits", margin, yPos);
      yPos += 8;

      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 6;

      const benefits = (data.quotation.benefits || {}) as Record<string, boolean>;
      const selectedBenefits = [];
      if (benefits.inPatient) selectedBenefits.push("In-Patient (IP)");
      if (benefits.outPatient) selectedBenefits.push("Out-Patient (OP)");
      if (benefits.dental) selectedBenefits.push("Dental (DE)");
      if (benefits.maternity) selectedBenefits.push("Maternity (MA)");

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(selectedBenefits.join(" • "), margin, yPos);
      yPos += 10;

      // ============================================
      // PACKAGES & CENSUS
      // ============================================
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Packages & Member Census", margin, yPos);
      yPos += 8;

      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 4;

      data.packages.forEach((pkg) => {
        const census = (pkg.census as any[]) || [];
        const packageTableData = census.map((c) => [
          DEMOGRAPHIC_LABELS[c.demographic] || c.demographic,
          String(c.lives || 0),
        ]);

        const totalLives = census.reduce((sum, c) => sum + (c.lives || 0), 0);
        packageTableData.push(["Total", String(totalLives)]);

        autoTable(doc, {
          startY: yPos,
          head: [[pkg.package_name, "Lives"]],
          body: packageTableData,
          theme: "striped",
          headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: "bold",
          },
          styles: {
            fontSize: 9,
            cellPadding: 3,
          },
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 30, halign: "center" },
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      });

      // ============================================
      // TIER MAPPING
      // ============================================
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      doc.text("Tier Mapping by Insurer", margin, yPos);
      yPos += 8;

      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 4;

      data.packages.forEach((pkg) => {
        const offers = (pkg.insurer_offers as any[]) || [];
        const requestedTiers = (pkg.requested_tiers as any[]) || [];
        
        // Get unique section codes
        const sectionCodes = [...new Set(offers.map((o) => o.section_code))];
        const insurerCodes = data.quotation.insurance_companies;

        // Build header row
        const headerRow = ["Benefit", "Requested", ...insurerCodes.map((c) => getInsurerName(c, data.insurersList))];

        // Build body rows
        const bodyRows = sectionCodes.map((sectionCode) => {
          const requested = requestedTiers.find((rt) => rt.section_code === sectionCode)?.requested_tier_code || "-";
          const row = [SECTION_LABELS[sectionCode] || sectionCode, requested];
          
          insurerCodes.forEach((insurerCode) => {
            const offer = offers.find((o) => o.insurer_code === insurerCode && o.section_code === sectionCode);
            if (offer?.status === "QUOTED") {
              row.push(offer.offered_tier_code || "-");
            } else {
              row.push("N/A");
            }
          });
          
          return row;
        });

        autoTable(doc, {
          startY: yPos,
          head: [headerRow],
          body: bodyRows,
          theme: "grid",
          headStyles: {
            fillColor: [99, 102, 241], // Indigo-500
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 8,
          },
          styles: {
            fontSize: 8,
            cellPadding: 2,
          },
          margin: { left: margin, right: margin },
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      });

      // ============================================
      // PREMIUM COMPARISON
      // ============================================
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      doc.text("Annual Premium Comparison", margin, yPos);
      yPos += 8;

      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 4;

      if (data.premiums.overalls && data.premiums.overalls.length > 0) {
        const premiumTableData = data.premiums.overalls.map((overall) => [
          getInsurerName(overall.insurer_code, data.insurersList),
          formatCurrency(overall.gross_total_all_packages || 0),
          formatCurrency((overall.admin_fee || 0) + (overall.stamp_duty || 0)),
          formatCurrency(overall.vat_amount || 0),
          formatCurrency(overall.grand_total || 0),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Insurer", "Gross Premium", "Fees", "VAT", "Grand Total"]],
          body: premiumTableData,
          theme: "striped",
          headStyles: {
            fillColor: [16, 185, 129], // Green
            textColor: [255, 255, 255],
            fontStyle: "bold",
          },
          styles: {
            fontSize: 9,
            cellPadding: 3,
          },
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { halign: "right" },
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right", fontStyle: "bold" },
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // ============================================
      // BENEFIT SCHEDULE (PER INSURER)
      // ============================================
      if (data.scheduleItems && data.scheduleItems.length > 0) {
        // Group schedule items by insurer and section
        const insurerCodes = data.quotation.insurance_companies;

        for (const insurerCode of insurerCodes) {
          if (yPos > pageHeight - 40) {
            doc.addPage();
            yPos = margin;
          }

          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...textColor);
          doc.text(`Benefit Schedule - ${getInsurerName(insurerCode, data.insurersList)}`, margin, yPos);
          yPos += 8;

          doc.line(margin, yPos, pageWidth - margin, yPos);
          yPos += 4;

          // Filter items for this insurer
          const insurerItems = data.scheduleItems.filter((item) => item.insurer_code === insurerCode);

          // Group by section
          const sectionCodes = [...new Set(insurerItems.map((i) => i.section_code))];

          for (const sectionCode of sectionCodes) {
            if (yPos > pageHeight - 40) {
              doc.addPage();
              yPos = margin;
            }

            const sectionItems = insurerItems
              .filter((i) => i.section_code === sectionCode)
              .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

            const scheduleTableData = sectionItems.map((item) => {
              let valueDisplay = "";
              if (item.value_type === "AMOUNT" && item.value_amount) {
                valueDisplay = formatCurrency(item.value_amount);
                if (item.unit_text) valueDisplay += ` ${item.unit_text}`;
              } else if (item.value_type === "TEXT" && item.value_text) {
                valueDisplay = item.value_text;
              } else if (item.value_type === "BOOLEAN") {
                valueDisplay = item.value_text === "true" ? "Covered" : "Not Covered";
              } else {
                valueDisplay = "-";
              }

              return [
                item.is_group_header ? `• ${item.item_name}` : `   ${item.item_name}`,
                valueDisplay,
                item.limit_period || "",
              ];
            });

            autoTable(doc, {
              startY: yPos,
              head: [[SECTION_LABELS[sectionCode] || sectionCode, "Limit", "Period"]],
              body: scheduleTableData,
              theme: "striped",
              headStyles: {
                fillColor: [79, 70, 229],
                textColor: [255, 255, 255],
                fontStyle: "bold",
              },
              styles: {
                fontSize: 8,
                cellPadding: 2,
              },
              margin: { left: margin, right: margin },
              columnStyles: {
                0: { cellWidth: 90 },
                1: { cellWidth: 50, halign: "right" },
                2: { cellWidth: 30, halign: "center" },
              },
              didParseCell: (hookData) => {
                // Bold for group headers
                if (hookData.section === "body" && hookData.column.index === 0) {
                  const cellText = hookData.cell.text[0] || "";
                  if (cellText.startsWith("•")) {
                    hookData.cell.styles.fontStyle = "bold";
                  }
                }
              },
            });

            yPos = (doc as any).lastAutoTable.finalY + 6;
          }

          yPos += 4;
        }
      }

      // ============================================
      // FOOTER
      // ============================================
      const addFooter = () => {
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(...mutedColor);
          doc.text(
            `Page ${i} of ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: "center" }
          );
          doc.text(
            "This quotation is for reference purposes only. Terms and conditions apply.",
            pageWidth / 2,
            pageHeight - 5,
            { align: "center" }
          );
        }
      };

      addFooter();

      // Save PDF
      doc.save(`Quotation-${data.quotation.quotation_number}.pdf`);
    } finally {
      setIsGenerating(false);
    }
  };

  return { generatePDF, isGenerating };
}

export async function fetchQuotationDataForPDF(quotationId: string) {
  const [quotationResult, packagesResult, premiumsResult, scheduleResult, insurersResult] =
    await Promise.all([
      supabase
        .from("quotations")
        .select(`*, creator:profiles!quotations_created_by_fkey(full_name)`)
        .eq("id", quotationId)
        .single(),
      supabase
        .from("quotation_package")
        .select(`*, census:quotation_package_census(*), requested_tiers:quotation_package_requested_tier(*), insurer_offers:quotation_package_insurer_offer(*)`)
        .eq("quotation_id", quotationId),
      Promise.all([
        supabase.from("quotation_premium_detail").select("*").eq("quotation_id", quotationId),
        supabase.from("quotation_premium_summary").select("*").eq("quotation_id", quotationId),
        supabase.from("quotation_premium_overall").select("*").eq("quotation_id", quotationId),
      ]),
      supabase
        .from("quotation_benefit_schedule_item")
        .select("*")
        .eq("quotation_id", quotationId)
        .order("display_order"),
      supabase.from("master_insurer").select("insurer_code, insurer_name").eq("is_active", true),
    ]);

  if (quotationResult.error) throw quotationResult.error;

  return {
    quotation: quotationResult.data,
    packages: packagesResult.data || [],
    premiums: {
      details: premiumsResult[0].data || [],
      summaries: premiumsResult[1].data || [],
      overalls: premiumsResult[2].data || [],
    },
    scheduleItems: scheduleResult.data || [],
    insurersList: insurersResult.data || [],
  };
}
