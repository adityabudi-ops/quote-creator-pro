import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getLineOfBusinessLabel } from "@/types/lineOfBusiness";

interface ScenarioDataForPDF {
  scenarioId: string;
  scenarioNumber: number;
  scenarioName: string;
  isBase: boolean;
  coverageRuleCode: string;
  insuranceCompanies: string[];
  benefits: Record<string, boolean>;
  packages: any[];
  offers: any[];
  premiumOveralls: any[];
  premiumSummaries: any[];
  scheduleItems: any[];
}

interface QuotationPDFData {
  quotation: {
    quotation_number: string;
    insured_name: string;
    insured_address: string;
    line_of_business?: string | null;
    start_date: string;
    end_date: string;
    creator?: { full_name: string } | null;
    created_at: string;
  };
  scenarios: ScenarioDataForPDF[];
  insurersList: { insurer_code: string; insurer_name: string }[];
  coverageRulesList: { coverage_rule_code: string; coverage_rule_name: string }[];
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

export function useScenarioPDF() {
  const [isGenerating, setIsGenerating] = useState(false);

  const getInsurerName = (code: string, insurersList: any[]): string => {
    return insurersList?.find((i) => i.insurer_code === code)?.insurer_name || code;
  };

  const getCoverageRuleName = (code: string, coverageRulesList: any[]): string => {
    return coverageRulesList?.find((r) => r.coverage_rule_code === code)?.coverage_rule_name || code;
  };

  const formatCurrency = (amount: number): string => {
    return `Rp ${amount.toLocaleString("id-ID")}`;
  };

  const generatePDF = async (data: QuotationPDFData) => {
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

      const primaryColor: [number, number, number] = [79, 70, 229];
      const textColor: [number, number, number] = [31, 41, 55];
      const mutedColor: [number, number, number] = [107, 114, 128];
      const alternativeColor: [number, number, number] = [236, 72, 153];

      // ============================================
      // SECTION A: QUOTATION OVERVIEW
      // ============================================
      // Header
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

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("PREMIRO", pageWidth - margin, 20, { align: "right" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Insurance Broker", pageWidth - margin, 27, { align: "right" });

      yPos = 55;

      // Insured Information
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
        ["Line of Business", data.quotation.line_of_business ? getLineOfBusinessLabel(data.quotation.line_of_business) : "-"],
        ["Policy Period", `${format(new Date(data.quotation.start_date), "dd MMM yyyy")} - ${format(new Date(data.quotation.end_date), "dd MMM yyyy")}`],
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

      // Scenario Summary
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...textColor);
      doc.text("Quote Scenarios", margin, yPos);
      yPos += 8;

      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 4;

      const scenarioTableData = data.scenarios.map((s) => [
        s.isBase ? "Base" : `Alternative ${s.scenarioNumber}`,
        s.scenarioName,
        getCoverageRuleName(s.coverageRuleCode, data.coverageRulesList),
        s.insuranceCompanies.map(c => getInsurerName(c, data.insurersList)).join(", "),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Type", "Name", "Coverage Rule", "Insurers"]],
        body: scenarioTableData,
        theme: "striped",
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: margin, right: margin },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // ============================================
      // SECTION B-D: PER SCENARIO DATA
      // ============================================
      for (const scenario of data.scenarios) {
        // Start new page for each scenario
        doc.addPage();
        yPos = margin;

        // Scenario Header
        const headerColor = scenario.isBase ? primaryColor : alternativeColor;
        doc.setFillColor(...headerColor);
        doc.rect(0, 0, pageWidth, 30, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(`${scenario.isBase ? "BASE SCENARIO" : `ALTERNATIVE ${scenario.scenarioNumber}`}: ${scenario.scenarioName}`, margin, 15);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Coverage Rule: ${getCoverageRuleName(scenario.coverageRuleCode, data.coverageRulesList)}`, margin, 24);

        yPos = 40;

        // Packages & Census
        doc.setTextColor(...textColor);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Packages & Member Census", margin, yPos);
        yPos += 6;

        for (const pkgWrapper of scenario.packages) {
          const pkg = pkgWrapper.package;
          if (!pkg) continue;

          const census = pkg.census || [];
          const packageTableData = census.map((c: any) => [
            DEMOGRAPHIC_LABELS[c.demographic] || c.demographic,
            String(c.lives || 0),
          ]);

          const totalLives = census.reduce((sum: number, c: any) => sum + (c.lives || 0), 0);
          packageTableData.push(["Total", String(totalLives)]);

          autoTable(doc, {
            startY: yPos,
            head: [[pkg.package_name, "Lives"]],
            body: packageTableData,
            theme: "striped",
            headStyles: {
              fillColor: headerColor,
              textColor: [255, 255, 255],
              fontStyle: "bold",
            },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: margin, right: margin },
            columnStyles: {
              0: { cellWidth: 80 },
              1: { cellWidth: 30, halign: "center" },
            },
          });

          yPos = (doc as any).lastAutoTable.finalY + 6;
        }

        // Tier Mapping
        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = margin;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textColor);
        doc.text("Tier Mapping by Insurer", margin, yPos);
        yPos += 6;

        for (const pkgWrapper of scenario.packages) {
          const pkg = pkgWrapper.package;
          if (!pkg) continue;

          const pkgOffers = scenario.offers.filter((o: any) => o.package_id === pkg.package_id);
          const sectionCodes = [...new Set(pkgOffers.map((o: any) => o.section_code))];

          const headerRow = ["Benefit", ...scenario.insuranceCompanies.map(c => getInsurerName(c, data.insurersList))];

          const bodyRows = sectionCodes.map((sectionCode) => {
            const row = [SECTION_LABELS[sectionCode as string] || sectionCode];
            scenario.insuranceCompanies.forEach((insurerCode) => {
              const offer = pkgOffers.find((o: any) => o.insurer_code === insurerCode && o.section_code === sectionCode);
              if (offer?.status === "QUOTED") {
                row.push(offer.offered_tier_code || "-");
              } else {
                row.push("N/A");
              }
            });
            return row;
          });

          if (bodyRows.length > 0) {
            autoTable(doc, {
              startY: yPos,
              head: [headerRow],
              body: bodyRows,
              theme: "grid",
              headStyles: {
                fillColor: [99, 102, 241],
                textColor: [255, 255, 255],
                fontStyle: "bold",
                fontSize: 8,
              },
              styles: { fontSize: 8, cellPadding: 2 },
              margin: { left: margin, right: margin },
            });

            yPos = (doc as any).lastAutoTable.finalY + 6;
          }
        }

        // Premium Comparison
        if (yPos > pageHeight - 80) {
          doc.addPage();
          yPos = margin;
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textColor);
        doc.text("Annual Premium Comparison", margin, yPos);
        yPos += 6;

        if (scenario.premiumOveralls && scenario.premiumOveralls.length > 0) {
          const premiumTableData = scenario.premiumOveralls.map((overall: any) => [
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
              fillColor: [16, 185, 129],
              textColor: [255, 255, 255],
              fontStyle: "bold",
            },
            styles: { fontSize: 9, cellPadding: 3 },
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

        // Benefit Schedule
        if (scenario.scheduleItems && scenario.scheduleItems.length > 0) {
          for (const insurerCode of scenario.insuranceCompanies) {
            if (yPos > pageHeight - 40) {
              doc.addPage();
              yPos = margin;
            }

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...textColor);
            doc.text(`Benefit Schedule - ${getInsurerName(insurerCode, data.insurersList)}`, margin, yPos);
            yPos += 6;

            const insurerItems = scenario.scheduleItems.filter((item: any) => item.insurer_code === insurerCode);
            const sectionCodes = [...new Set(insurerItems.map((i: any) => i.section_code))];

            for (const sectionCode of sectionCodes) {
              if (yPos > pageHeight - 40) {
                doc.addPage();
                yPos = margin;
              }

              const sectionItems = insurerItems
                .filter((i: any) => i.section_code === sectionCode)
                .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));

              const scheduleTableData = sectionItems.map((item: any) => {
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
                head: [[SECTION_LABELS[sectionCode as string] || sectionCode, "Limit", "Period"]],
                body: scheduleTableData,
                theme: "striped",
                headStyles: {
                  fillColor: headerColor,
                  textColor: [255, 255, 255],
                  fontStyle: "bold",
                },
                styles: { fontSize: 8, cellPadding: 2 },
                margin: { left: margin, right: margin },
                columnStyles: {
                  0: { cellWidth: 90 },
                  1: { cellWidth: 50, halign: "right" },
                  2: { cellWidth: 30, halign: "center" },
                },
                didParseCell: (hookData) => {
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
      }

      // Footer
      const addFooter = () => {
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(...mutedColor);
          doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
          doc.text(
            "This quotation is for reference purposes only. Terms and conditions apply.",
            pageWidth / 2,
            pageHeight - 5,
            { align: "center" }
          );
        }
      };

      addFooter();

      doc.save(`Quotation-${data.quotation.quotation_number}.pdf`);
    } finally {
      setIsGenerating(false);
    }
  };

  return { generatePDF, isGenerating };
}

export async function fetchQuotationWithScenarios(quotationId: string): Promise<QuotationPDFData> {
  const [quotationResult, scenariosResult, insurersResult, coverageRulesResult] = await Promise.all([
    supabase
      .from("quotations")
      .select(`*, creator:profiles!quotations_created_by_fkey(full_name)`)
      .eq("id", quotationId)
      .single(),
    supabase
      .from("quotation_scenario")
      .select("*")
      .eq("quotation_id", quotationId)
      .order("scenario_number"),
    supabase.from("master_insurer").select("insurer_code, insurer_name").eq("is_active", true),
    supabase.from("master_coverage_rule").select("coverage_rule_code, coverage_rule_name").eq("is_active", true),
  ]);

  if (quotationResult.error) throw quotationResult.error;

  const scenarios: ScenarioDataForPDF[] = [];

  for (const scenario of scenariosResult.data || []) {
    const [packagesResult, offersResult, premiumOverallsResult, premiumSummariesResult, scheduleItemsResult] =
      await Promise.all([
        supabase
          .from("quotation_scenario_package")
          .select(`*, package:quotation_package(*, census:quotation_package_census(*))`)
          .eq("scenario_id", scenario.scenario_id),
        supabase.from("quotation_scenario_offer").select("*").eq("scenario_id", scenario.scenario_id),
        supabase.from("quotation_scenario_premium_overall").select("*").eq("scenario_id", scenario.scenario_id),
        supabase.from("quotation_scenario_premium_summary").select("*").eq("scenario_id", scenario.scenario_id),
        supabase.from("quotation_scenario_schedule_item").select("*").eq("scenario_id", scenario.scenario_id).order("display_order"),
      ]);

    scenarios.push({
      scenarioId: scenario.scenario_id,
      scenarioNumber: scenario.scenario_number,
      scenarioName: scenario.scenario_name,
      isBase: scenario.is_base,
      coverageRuleCode: scenario.coverage_rule_code,
      insuranceCompanies: scenario.insurance_companies || [],
      benefits: (scenario.benefits as Record<string, boolean>) || {},
      packages: packagesResult.data || [],
      offers: offersResult.data || [],
      premiumOveralls: premiumOverallsResult.data || [],
      premiumSummaries: premiumSummariesResult.data || [],
      scheduleItems: scheduleItemsResult.data || [],
    });
  }

  return {
    quotation: quotationResult.data,
    scenarios,
    insurersList: insurersResult.data || [],
    coverageRulesList: coverageRulesResult.data || [],
  };
}
