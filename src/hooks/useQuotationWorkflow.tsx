import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { DemographicType, OfferStatus } from "./useMasterData";

// ============================================
// Type Definitions
// ============================================

export interface PackageCensus {
  demographic: DemographicType;
  lives: number;
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  census: Record<DemographicType, number>;
}

export interface RequestedTier {
  sectionCode: string;
  tierCode: string | null;
}

export interface TierOffer {
  packageId: string;
  insurerCode: string;
  sectionCode: string;
  offeredTierCode: string | null;
  status: OfferStatus;
  templateId: string | null;
  pricingEffectiveDate: string | null;
  notes?: string;
}

export interface PremiumDetail {
  packageId: string;
  insurerCode: string;
  sectionCode: string;
  demographic: DemographicType;
  lives: number;
  annualPremiumPerMember: number;
  annualPremiumTotal: number;
}

export interface PremiumSummary {
  packageId: string;
  insurerCode: string;
  grossPremiumPackage: number;
  feesPackage: number;
  taxPackage: number;
}

export interface PremiumOverall {
  insurerCode: string;
  grossTotalAllPackages: number;
  adminFee: number;
  stampDuty: number;
  vatAmount: number;
  grandTotal: number;
}

export type ValueType = "AMOUNT" | "TEXT" | "BOOLEAN" | "NONE";

export interface QuotationGenerationInput {
  quotationId: string;
  coverageRuleCode: string;
  insurerCodes: string[];
  packages: Package[];
  requestedTiers: RequestedTier[];
  benefitSections: string[]; // Selected benefit sections (IP, OP, DE, MA)
  policyStartDate: Date;
}

export interface TierResolutionResult {
  offers: TierOffer[];
  tierMapping: Record<string, Record<string, Record<string, string | null>>>; // [packageId][insurerCode][sectionCode] = tierCode
}

// ============================================
// Tier Resolution Logic
// ============================================

async function checkTemplateAvailability(
  coverageRuleCode: string,
  insurerCode: string,
  sectionCode: string,
  tierCode: string,
  effectiveDate: string
): Promise<{ available: boolean; templateId: string | null }> {
  const { data } = await supabase
    .from("schedule_template_section_header")
    .select("template_id")
    .eq("coverage_rule_code", coverageRuleCode)
    .eq("insurer_code", insurerCode)
    .eq("section_code", sectionCode)
    .eq("tier_code", tierCode)
    .eq("status", "ACTIVE")
    .lte("effective_date", effectiveDate)
    .order("effective_date", { ascending: false })
    .limit(1);

  return {
    available: data && data.length > 0,
    templateId: data?.[0]?.template_id || null,
  };
}

async function checkPricingAvailability(
  coverageRuleCode: string,
  insurerCode: string,
  sectionCode: string,
  tierCode: string,
  effectiveDate: string
): Promise<{ available: boolean; pricingDate: string | null }> {
  const { data } = await supabase
    .from("pricing_section_age")
    .select("effective_date")
    .eq("coverage_rule_code", coverageRuleCode)
    .eq("insurer_code", insurerCode)
    .eq("section_code", sectionCode)
    .eq("tier_code", tierCode)
    .lte("effective_date", effectiveDate)
    .order("effective_date", { ascending: false })
    .limit(1);

  return {
    available: data && data.length > 0,
    pricingDate: data?.[0]?.effective_date || null,
  };
}

async function getAlternativeTier(
  coverageRuleCode: string,
  insurerCode: string,
  sectionCode: string,
  effectiveDate: string
): Promise<{ tierCode: string | null; templateId: string | null; pricingDate: string | null }> {
  // Find any available tier for this insurer/section combination
  const { data: templates } = await supabase
    .from("schedule_template_section_header")
    .select("tier_code, template_id")
    .eq("coverage_rule_code", coverageRuleCode)
    .eq("insurer_code", insurerCode)
    .eq("section_code", sectionCode)
    .eq("status", "ACTIVE")
    .lte("effective_date", effectiveDate)
    .order("effective_date", { ascending: false });

  if (!templates || templates.length === 0) {
    return { tierCode: null, templateId: null, pricingDate: null };
  }

  // Check if any of these tiers have pricing
  for (const template of templates) {
    const pricingCheck = await checkPricingAvailability(
      coverageRuleCode,
      insurerCode,
      sectionCode,
      template.tier_code,
      effectiveDate
    );

    if (pricingCheck.available) {
      return {
        tierCode: template.tier_code,
        templateId: template.template_id,
        pricingDate: pricingCheck.pricingDate,
      };
    }
  }

  return { tierCode: null, templateId: null, pricingDate: null };
}

export async function resolveTiers(
  input: QuotationGenerationInput
): Promise<TierResolutionResult> {
  const offers: TierOffer[] = [];
  const tierMapping: Record<string, Record<string, Record<string, string | null>>> = {};
  const effectiveDate = format(input.policyStartDate, "yyyy-MM-dd");

  for (const pkg of input.packages) {
    tierMapping[pkg.id] = {};

    for (const insurerCode of input.insurerCodes) {
      tierMapping[pkg.id][insurerCode] = {};

      for (const sectionCode of input.benefitSections) {
        // Find requested tier for this section
        const requestedTier = input.requestedTiers.find(t => t.sectionCode === sectionCode);
        let offeredTierCode: string | null = null;
        let templateId: string | null = null;
        let pricingDate: string | null = null;
        let status: OfferStatus = "QUOTED";
        let notes = "";

        if (requestedTier?.tierCode) {
          // Check if requested tier is available
          const [templateCheck, pricingCheck] = await Promise.all([
            checkTemplateAvailability(
              input.coverageRuleCode,
              insurerCode,
              sectionCode,
              requestedTier.tierCode,
              effectiveDate
            ),
            checkPricingAvailability(
              input.coverageRuleCode,
              insurerCode,
              sectionCode,
              requestedTier.tierCode,
              effectiveDate
            ),
          ]);

          if (templateCheck.available && pricingCheck.available) {
            offeredTierCode = requestedTier.tierCode;
            templateId = templateCheck.templateId;
            pricingDate = pricingCheck.pricingDate;
          } else {
            // Try to find alternative tier
            const alternative = await getAlternativeTier(
              input.coverageRuleCode,
              insurerCode,
              sectionCode,
              effectiveDate
            );

            if (alternative.tierCode) {
              offeredTierCode = alternative.tierCode;
              templateId = alternative.templateId;
              pricingDate = alternative.pricingDate;
              notes = `Requested ${requestedTier.tierCode}, offered ${alternative.tierCode}`;
            } else {
              status = "NA";
              notes = `No available tier for ${sectionCode}`;
            }
          }
        } else {
          // No tier requested - try to find any available tier
          const alternative = await getAlternativeTier(
            input.coverageRuleCode,
            insurerCode,
            sectionCode,
            effectiveDate
          );

          if (alternative.tierCode) {
            offeredTierCode = alternative.tierCode;
            templateId = alternative.templateId;
            pricingDate = alternative.pricingDate;
          } else {
            status = "NA";
          }
        }

        tierMapping[pkg.id][insurerCode][sectionCode] = offeredTierCode;

        offers.push({
          packageId: pkg.id,
          insurerCode,
          sectionCode,
          offeredTierCode,
          status,
          templateId,
          pricingEffectiveDate: pricingDate,
          notes,
        });
      }
    }
  }

  return { offers, tierMapping };
}

// ============================================
// Premium Calculation Logic
// ============================================

async function getPricingForTier(
  coverageRuleCode: string,
  insurerCode: string,
  sectionCode: string,
  tierCode: string,
  effectiveDate: string
): Promise<Record<DemographicType, number>> {
  const { data } = await supabase
    .from("pricing_section_age")
    .select("demographic, annual_premium")
    .eq("coverage_rule_code", coverageRuleCode)
    .eq("insurer_code", insurerCode)
    .eq("section_code", sectionCode)
    .eq("tier_code", tierCode)
    .lte("effective_date", effectiveDate)
    .order("effective_date", { ascending: false });

  const pricing: Record<DemographicType, number> = {
    M_0_59: 0,
    F_0_59: 0,
    C_0_59: 0,
    M_60_64: 0,
    F_60_64: 0,
  };

  if (data) {
    // Get the latest pricing for each demographic
    const latestByDemographic: Record<string, number> = {};
    for (const row of data) {
      if (!latestByDemographic[row.demographic]) {
        latestByDemographic[row.demographic] = row.annual_premium;
      }
    }
    Object.assign(pricing, latestByDemographic);
  }

  return pricing;
}

async function getFeesTax(
  insurerCode: string,
  effectiveDate: string
): Promise<{ adminFee: number; stampDuty: number; vatPercent: number }> {
  const { data } = await supabase
    .from("fees_tax")
    .select("admin_fee, stamp_duty, vat_percent")
    .eq("insurer_code", insurerCode)
    .lte("effective_date", effectiveDate)
    .order("effective_date", { ascending: false })
    .limit(1);

  return {
    adminFee: data?.[0]?.admin_fee || 0,
    stampDuty: data?.[0]?.stamp_duty || 0,
    vatPercent: data?.[0]?.vat_percent || 0,
  };
}

export async function calculatePremiums(
  input: QuotationGenerationInput,
  tierResolution: TierResolutionResult
): Promise<{
  details: PremiumDetail[];
  summaries: PremiumSummary[];
  overalls: PremiumOverall[];
}> {
  const details: PremiumDetail[] = [];
  const summaries: PremiumSummary[] = [];
  const overalls: PremiumOverall[] = [];
  const effectiveDate = format(input.policyStartDate, "yyyy-MM-dd");

  const demographics: DemographicType[] = ["M_0_59", "F_0_59", "C_0_59", "M_60_64", "F_60_64"];

  // Calculate per package × insurer
  const packageInsurerTotals: Record<string, Record<string, number>> = {};

  for (const pkg of input.packages) {
    packageInsurerTotals[pkg.id] = {};

    for (const insurerCode of input.insurerCodes) {
      let packageGrossTotal = 0;

      for (const sectionCode of input.benefitSections) {
        const offer = tierResolution.offers.find(
          o => o.packageId === pkg.id && o.insurerCode === insurerCode && o.sectionCode === sectionCode
        );

        if (offer?.status === "QUOTED" && offer.offeredTierCode) {
          const pricing = await getPricingForTier(
            input.coverageRuleCode,
            insurerCode,
            sectionCode,
            offer.offeredTierCode,
            effectiveDate
          );

          for (const demographic of demographics) {
            const lives = pkg.census[demographic] || 0;
            const premiumPerMember = pricing[demographic] || 0;
            const totalPremium = lives * premiumPerMember;

            if (lives > 0) {
              details.push({
                packageId: pkg.id,
                insurerCode,
                sectionCode,
                demographic,
                lives,
                annualPremiumPerMember: premiumPerMember,
                annualPremiumTotal: totalPremium,
              });
            }

            packageGrossTotal += totalPremium;
          }
        }
      }

      packageInsurerTotals[pkg.id][insurerCode] = packageGrossTotal;

      summaries.push({
        packageId: pkg.id,
        insurerCode,
        grossPremiumPackage: packageGrossTotal,
        feesPackage: 0, // Fees applied at overall level
        taxPackage: 0,
      });
    }
  }

  // Calculate overall per insurer
  for (const insurerCode of input.insurerCodes) {
    let grossTotal = 0;
    for (const pkg of input.packages) {
      grossTotal += packageInsurerTotals[pkg.id][insurerCode] || 0;
    }

    const feesTax = await getFeesTax(insurerCode, effectiveDate);
    const vatAmount = grossTotal * (feesTax.vatPercent / 100);
    const grandTotal = grossTotal + feesTax.adminFee + feesTax.stampDuty + vatAmount;

    overalls.push({
      insurerCode,
      grossTotalAllPackages: grossTotal,
      adminFee: feesTax.adminFee,
      stampDuty: feesTax.stampDuty,
      vatAmount,
      grandTotal,
    });
  }

  return { details, summaries, overalls };
}

// ============================================
// Benefit Schedule Capture
// ============================================

export interface ScheduleItem {
  itemCode: string;
  itemName: string;
  sectionCode: string;
  insurerCode: string;
  packageId: string;
  valueType: ValueType;
  valueAmount: number | null;
  valueText: string | null;
  currency: string | null;
  unitText: string | null;
  limitPeriod: string | null;
  subLabel: string | null;
  isGroupHeader: boolean;
  displayOrder: number;
}

export async function captureScheduleItems(
  quotationId: string,
  offers: TierOffer[]
): Promise<ScheduleItem[]> {
  const items: ScheduleItem[] = [];

  for (const offer of offers) {
    if (offer.status !== "QUOTED" || !offer.templateId) continue;

    // Get template items with benefit item details
    const { data: templateItems } = await supabase
      .from("schedule_template_section_item")
      .select(`
        *,
        benefit_item:master_benefit_item(item_name, is_group_header, sub_label)
      `)
      .eq("template_id", offer.templateId)
      .order("display_order");

    if (templateItems) {
      for (const item of templateItems) {
        items.push({
          itemCode: item.item_code,
          itemName: item.benefit_item?.item_name || item.item_code,
          sectionCode: offer.sectionCode,
          insurerCode: offer.insurerCode,
          packageId: offer.packageId,
          valueType: item.value_type,
          valueAmount: item.value_amount,
          valueText: item.value_text,
          currency: item.currency,
          unitText: item.unit_text,
          limitPeriod: item.limit_period,
          subLabel: item.benefit_item?.sub_label || null,
          isGroupHeader: item.benefit_item?.is_group_header || false,
          displayOrder: item.display_order,
        });
      }
    }
  }

  return items;
}

// ============================================
// Save Quotation Workflow
// ============================================

export interface SaveQuotationInput {
  quotationId: string;
  packages: Package[];
  requestedTiers: RequestedTier[];
  tierResolution: TierResolutionResult;
  premiums: {
    details: PremiumDetail[];
    summaries: PremiumSummary[];
    overalls: PremiumOverall[];
  };
  scheduleItems: ScheduleItem[];
}

// Maps client-side package IDs to database UUIDs
type PackageIdMap = Record<string, string>;

export async function saveQuotationData(input: SaveQuotationInput): Promise<void> {
  const packageIdMap: PackageIdMap = {};

  // Save packages and build ID mapping
  for (const pkg of input.packages) {
    // Insert package (let DB generate UUID)
    const { data: savedPackage, error: pkgError } = await supabase
      .from("quotation_package")
      .insert({
        quotation_id: input.quotationId,
        package_name: pkg.name,
        package_description: pkg.description,
      })
      .select()
      .single();

    if (pkgError) throw pkgError;
    
    // Map client-side ID to database UUID
    packageIdMap[pkg.id] = savedPackage.package_id;

    // Insert census using the new database UUID
    const censusRecords = Object.entries(pkg.census)
      .filter(([_, lives]) => lives > 0)
      .map(([demographic, lives]) => ({
        package_id: savedPackage.package_id,
        demographic: demographic as DemographicType,
        lives,
      }));

    if (censusRecords.length > 0) {
      const { error: censusError } = await supabase
        .from("quotation_package_census")
        .insert(censusRecords);
      if (censusError) throw censusError;
    }

    // Insert requested tiers using the new database UUID
    const requestedTierRecords = input.requestedTiers.map(rt => ({
      package_id: savedPackage.package_id,
      section_code: rt.sectionCode,
      requested_tier_code: rt.tierCode,
    }));

    if (requestedTierRecords.length > 0) {
      const { error: rtError } = await supabase
        .from("quotation_package_requested_tier")
        .insert(requestedTierRecords);
      if (rtError) throw rtError;
    }
  }

  // Save insurer offers (map client IDs to database UUIDs)
  const offerRecords = input.tierResolution.offers.map(offer => ({
    package_id: packageIdMap[offer.packageId],
    insurer_code: offer.insurerCode,
    section_code: offer.sectionCode,
    offered_tier_code: offer.offeredTierCode,
    status: offer.status,
    template_id_used: offer.templateId,
    pricing_effective_date_used: offer.pricingEffectiveDate,
    notes: offer.notes,
  }));

  const { error: offerError } = await supabase
    .from("quotation_package_insurer_offer")
    .insert(offerRecords);
  if (offerError) throw offerError;

  // Save premium details (map client IDs to database UUIDs)
  const detailRecords = input.premiums.details.map(d => ({
    quotation_id: input.quotationId,
    package_id: packageIdMap[d.packageId],
    insurer_code: d.insurerCode,
    section_code: d.sectionCode,
    demographic: d.demographic,
    lives: d.lives,
    annual_premium_per_member: d.annualPremiumPerMember,
    annual_premium_total: d.annualPremiumTotal,
  }));

  if (detailRecords.length > 0) {
    const { error: detailError } = await supabase
      .from("quotation_premium_detail")
      .insert(detailRecords);
    if (detailError) throw detailError;
  }

  // Save premium summaries (map client IDs to database UUIDs)
  const summaryRecords = input.premiums.summaries.map(s => ({
    quotation_id: input.quotationId,
    package_id: packageIdMap[s.packageId],
    insurer_code: s.insurerCode,
    gross_premium_package: s.grossPremiumPackage,
    fees_package: s.feesPackage,
    tax_package: s.taxPackage,
  }));

  const { error: summaryError } = await supabase
    .from("quotation_premium_summary")
    .insert(summaryRecords);
  if (summaryError) throw summaryError;

  // Save premium overalls
  const overallRecords = input.premiums.overalls.map(o => ({
    quotation_id: input.quotationId,
    insurer_code: o.insurerCode,
    gross_total_all_packages: o.grossTotalAllPackages,
    admin_fee: o.adminFee,
    stamp_duty: o.stampDuty,
    vat_amount: o.vatAmount,
    grand_total: o.grandTotal,
  }));

  const { error: overallError } = await supabase
    .from("quotation_premium_overall")
    .insert(overallRecords);
  if (overallError) throw overallError;

  // Save schedule items (map client IDs to database UUIDs)
  const scheduleRecords = input.scheduleItems.map(item => ({
    quotation_id: input.quotationId,
    package_id: packageIdMap[item.packageId],
    insurer_code: item.insurerCode,
    section_code: item.sectionCode,
    item_code: item.itemCode,
    item_name: item.itemName,
    value_type: item.valueType,
    value_amount: item.valueAmount,
    value_text: item.valueText,
    currency: item.currency,
    unit_text: item.unitText,
    limit_period: item.limitPeriod,
    sub_label: item.subLabel,
    is_group_header: item.isGroupHeader,
    display_order: item.displayOrder,
  }));

  if (scheduleRecords.length > 0) {
    const { error: scheduleError } = await supabase
      .from("quotation_benefit_schedule_item")
      .insert(scheduleRecords);
    if (scheduleError) throw scheduleError;
  }
}

// ============================================
// React Query Hooks
// ============================================

export function useGenerateQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: QuotationGenerationInput) => {
      // Step 1: Resolve tiers
      const tierResolution = await resolveTiers(input);

      // Step 2: Calculate premiums
      const premiums = await calculatePremiums(input, tierResolution);

      // Step 3: Capture schedule items
      const scheduleItems = await captureScheduleItems(input.quotationId, tierResolution.offers);

      // Step 4: Save all data
      await saveQuotationData({
        quotationId: input.quotationId,
        packages: input.packages,
        requestedTiers: input.requestedTiers,
        tierResolution,
        premiums,
        scheduleItems,
      });

      return {
        tierResolution,
        premiums,
        scheduleItems,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["quotation_packages"] });
    },
  });
}

// Hook to fetch quotation packages
export function useQuotationPackages(quotationId: string) {
  return useQuery({
    queryKey: ["quotation_packages", quotationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotation_package")
        .select(`
          *,
          census:quotation_package_census(*),
          requested_tiers:quotation_package_requested_tier(*),
          insurer_offers:quotation_package_insurer_offer(*)
        `)
        .eq("quotation_id", quotationId);

      if (error) throw error;
      return data;
    },
    enabled: !!quotationId,
  });
}

// Hook to fetch quotation premiums
export function useQuotationPremiums(quotationId: string) {
  return useQuery({
    queryKey: ["quotation_premiums", quotationId],
    queryFn: async () => {
      const [detailsResult, summariesResult, overallsResult] = await Promise.all([
        supabase
          .from("quotation_premium_detail")
          .select("*")
          .eq("quotation_id", quotationId),
        supabase
          .from("quotation_premium_summary")
          .select("*")
          .eq("quotation_id", quotationId),
        supabase
          .from("quotation_premium_overall")
          .select("*")
          .eq("quotation_id", quotationId),
      ]);

      return {
        details: detailsResult.data || [],
        summaries: summariesResult.data || [],
        overalls: overallsResult.data || [],
      };
    },
    enabled: !!quotationId,
  });
}

// Hook to fetch quotation schedule items
export function useQuotationScheduleItems(quotationId: string) {
  return useQuery({
    queryKey: ["quotation_schedule_items", quotationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotation_benefit_schedule_item")
        .select("*")
        .eq("quotation_id", quotationId)
        .order("display_order");

      if (error) throw error;
      return data;
    },
    enabled: !!quotationId,
  });
}
