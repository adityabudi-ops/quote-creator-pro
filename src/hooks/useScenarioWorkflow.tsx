import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { DemographicType, OfferStatus } from "./useMasterData";
import type { Json } from "@/integrations/supabase/types";

// ============================================
// Type Definitions
// ============================================

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

export interface PackageRequestedTiers {
  packageId: string;
  tiers: RequestedTier[];
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

export interface ScenarioInput {
  quotationId: string;
  scenarioName: string;
  isBase: boolean;
  coverageRuleCode: string;
  insurerCodes: string[];
  benefits: {
    inPatient: boolean;
    outPatient: boolean;
    dental: boolean;
    maternity: boolean;
  };
  packages: Package[];
  packageRequestedTiers: PackageRequestedTiers[];
  policyStartDate: Date;
  parentScenarioId?: string; // For alternatives based on existing scenario
}

export interface TierResolutionResult {
  offers: TierOffer[];
  tierMapping: Record<string, Record<string, Record<string, string | null>>>;
}

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

export interface ScenarioData {
  scenarioId: string;
  scenarioNumber: number;
  scenarioName: string;
  isBase: boolean;
  coverageRuleCode: string;
  insuranceCompanies: string[];
  benefits: Record<string, boolean>;
  status: string;
  revision: number;
  packages: any[];
  offers: any[];
  premiumDetails: any[];
  premiumSummaries: any[];
  premiumOveralls: any[];
  scheduleItems: any[];
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

export async function resolveTiersForScenario(
  input: ScenarioInput
): Promise<TierResolutionResult> {
  const offers: TierOffer[] = [];
  const tierMapping: Record<string, Record<string, Record<string, string | null>>> = {};
  const effectiveDate = format(input.policyStartDate, "yyyy-MM-dd");

  const benefitSections: string[] = [];
  if (input.benefits.inPatient) benefitSections.push("IP");
  if (input.benefits.outPatient) benefitSections.push("OP");
  if (input.benefits.dental) benefitSections.push("DE");
  if (input.benefits.maternity) benefitSections.push("MA");

  for (const pkg of input.packages) {
    tierMapping[pkg.id] = {};
    const pkgRequestedTiers = input.packageRequestedTiers.find(p => p.packageId === pkg.id)?.tiers || [];

    for (const insurerCode of input.insurerCodes) {
      tierMapping[pkg.id][insurerCode] = {};

      for (const sectionCode of benefitSections) {
        const requestedTier = pkgRequestedTiers.find(t => t.sectionCode === sectionCode);
        let offeredTierCode: string | null = null;
        let templateId: string | null = null;
        let pricingDate: string | null = null;
        let status: OfferStatus = "QUOTED";
        let notes = "";

        if (requestedTier?.tierCode) {
          const [templateCheck, pricingCheck] = await Promise.all([
            checkTemplateAvailability(input.coverageRuleCode, insurerCode, sectionCode, requestedTier.tierCode, effectiveDate),
            checkPricingAvailability(input.coverageRuleCode, insurerCode, sectionCode, requestedTier.tierCode, effectiveDate),
          ]);

          if (templateCheck.available && pricingCheck.available) {
            offeredTierCode = requestedTier.tierCode;
            templateId = templateCheck.templateId;
            pricingDate = pricingCheck.pricingDate;
          } else {
            const alternative = await getAlternativeTier(input.coverageRuleCode, insurerCode, sectionCode, effectiveDate);
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
          const alternative = await getAlternativeTier(input.coverageRuleCode, insurerCode, sectionCode, effectiveDate);
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

export async function calculatePremiumsForScenario(
  input: ScenarioInput,
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

  const benefitSections: string[] = [];
  if (input.benefits.inPatient) benefitSections.push("IP");
  if (input.benefits.outPatient) benefitSections.push("OP");
  if (input.benefits.dental) benefitSections.push("DE");
  if (input.benefits.maternity) benefitSections.push("MA");

  const demographics: DemographicType[] = ["M_0_59", "F_0_59", "C_0_59", "M_60_64", "F_60_64"];
  const packageInsurerTotals: Record<string, Record<string, number>> = {};

  for (const pkg of input.packages) {
    packageInsurerTotals[pkg.id] = {};

    for (const insurerCode of input.insurerCodes) {
      let packageGrossTotal = 0;

      for (const sectionCode of benefitSections) {
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
        feesPackage: 0,
        taxPackage: 0,
      });
    }
  }

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

export async function captureScheduleItemsForScenario(
  offers: TierOffer[]
): Promise<ScheduleItem[]> {
  const items: ScheduleItem[] = [];

  for (const offer of offers) {
    if (offer.status !== "QUOTED" || !offer.templateId) continue;

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
// Scenario Save Logic
// ============================================

type PackageIdMap = Record<string, string>;

export interface SaveScenarioInput {
  quotationId: string;
  scenarioName: string;
  isBase: boolean;
  coverageRuleCode: string;
  insurerCodes: string[];
  benefits: {
    inPatient: boolean;
    outPatient: boolean;
    dental: boolean;
    maternity: boolean;
  };
  packages: Package[];
  packageRequestedTiers: PackageRequestedTiers[];
  tierResolution: TierResolutionResult;
  premiums: {
    details: PremiumDetail[];
    summaries: PremiumSummary[];
    overalls: PremiumOverall[];
  };
  scheduleItems: ScheduleItem[];
}

export async function saveScenarioData(input: SaveScenarioInput): Promise<string> {
  // 1. Get next scenario number for this quotation
  const { data: existingScenarios } = await supabase
    .from("quotation_scenario")
    .select("scenario_number")
    .eq("quotation_id", input.quotationId)
    .order("scenario_number", { ascending: false })
    .limit(1);

  const nextScenarioNumber = (existingScenarios?.[0]?.scenario_number || 0) + 1;

  // 2. Create scenario record
  const benefitsJson: Json = input.benefits;
  const { data: scenario, error: scenarioError } = await supabase
    .from("quotation_scenario")
    .insert({
      quotation_id: input.quotationId,
      scenario_number: nextScenarioNumber,
      scenario_name: input.scenarioName,
      is_base: input.isBase,
      coverage_rule_code: input.coverageRuleCode,
      insurance_companies: input.insurerCodes,
      benefits: benefitsJson,
      status: "resolved",
      revision: 1,
    })
    .select()
    .single();

  if (scenarioError) throw scenarioError;

  const scenarioId = scenario.scenario_id;
  const packageIdMap: PackageIdMap = {};

  // 3. Link packages to scenario and save per-scenario data
  for (const pkg of input.packages) {
    // First check if package already exists (from base quotation)
    const { data: existingPkg } = await supabase
      .from("quotation_package")
      .select("package_id")
      .eq("quotation_id", input.quotationId)
      .eq("package_name", pkg.name)
      .single();

    let dbPackageId: string;

    if (existingPkg) {
      dbPackageId = existingPkg.package_id;
    } else {
      // Create package if doesn't exist
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
      dbPackageId = savedPackage.package_id;

      // Insert census
      const censusRecords = Object.entries(pkg.census)
        .filter(([_, lives]) => lives > 0)
        .map(([demographic, lives]) => ({
          package_id: dbPackageId,
          demographic: demographic as DemographicType,
          lives,
        }));

      if (censusRecords.length > 0) {
        const { error: censusError } = await supabase
          .from("quotation_package_census")
          .insert(censusRecords);
        if (censusError) throw censusError;
      }
    }

    packageIdMap[pkg.id] = dbPackageId;

    // Link package to scenario
    const { error: linkError } = await supabase
      .from("quotation_scenario_package")
      .insert({
        scenario_id: scenarioId,
        package_id: dbPackageId,
      });
    if (linkError) throw linkError;

    // Save scenario-specific requested tiers
    const pkgRequestedTiers = input.packageRequestedTiers.find(p => p.packageId === pkg.id)?.tiers || [];
    const requestedTierRecords = pkgRequestedTiers.map(rt => ({
      scenario_id: scenarioId,
      package_id: dbPackageId,
      section_code: rt.sectionCode,
      requested_tier_code: rt.tierCode,
    }));

    if (requestedTierRecords.length > 0) {
      const { error: rtError } = await supabase
        .from("quotation_scenario_requested_tier")
        .insert(requestedTierRecords);
      if (rtError) throw rtError;
    }
  }

  // 4. Save scenario offers
  const offerRecords = input.tierResolution.offers.map(offer => ({
    scenario_id: scenarioId,
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
    .from("quotation_scenario_offer")
    .insert(offerRecords);
  if (offerError) throw offerError;

  // 5. Save premium details
  const detailRecords = input.premiums.details.map(d => ({
    scenario_id: scenarioId,
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
      .from("quotation_scenario_premium_detail")
      .insert(detailRecords);
    if (detailError) throw detailError;
  }

  // 6. Save premium summaries
  const summaryRecords = input.premiums.summaries.map(s => ({
    scenario_id: scenarioId,
    package_id: packageIdMap[s.packageId],
    insurer_code: s.insurerCode,
    gross_premium_package: s.grossPremiumPackage,
    fees_package: s.feesPackage,
    tax_package: s.taxPackage,
  }));

  const { error: summaryError } = await supabase
    .from("quotation_scenario_premium_summary")
    .insert(summaryRecords);
  if (summaryError) throw summaryError;

  // 7. Save premium overalls
  const overallRecords = input.premiums.overalls.map(o => ({
    scenario_id: scenarioId,
    insurer_code: o.insurerCode,
    gross_total_all_packages: o.grossTotalAllPackages,
    admin_fee: o.adminFee,
    stamp_duty: o.stampDuty,
    vat_amount: o.vatAmount,
    grand_total: o.grandTotal,
  }));

  const { error: overallError } = await supabase
    .from("quotation_scenario_premium_overall")
    .insert(overallRecords);
  if (overallError) throw overallError;

  // 8. Save schedule items
  const scheduleRecords = input.scheduleItems.map(item => ({
    scenario_id: scenarioId,
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
      .from("quotation_scenario_schedule_item")
      .insert(scheduleRecords);
    if (scheduleError) throw scheduleError;
  }

  // 9. Create revision record
  const { error: revisionError } = await supabase
    .from("quotation_revision")
    .insert({
      quotation_id: input.quotationId,
      scenario_id: scenarioId,
      revision_number: 1,
      change_description: input.isBase ? "Initial base scenario created" : `Alternative scenario "${input.scenarioName}" created`,
    });
  if (revisionError) throw revisionError;

  return scenarioId;
}

// ============================================
// React Query Hooks
// ============================================

export function useGenerateScenario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ScenarioInput) => {
      // Step 1: Resolve tiers
      const tierResolution = await resolveTiersForScenario(input);

      // Step 2: Calculate premiums
      const premiums = await calculatePremiumsForScenario(input, tierResolution);

      // Step 3: Capture schedule items
      const scheduleItems = await captureScheduleItemsForScenario(tierResolution.offers);

      // Step 4: Save scenario data
      const scenarioId = await saveScenarioData({
        quotationId: input.quotationId,
        scenarioName: input.scenarioName,
        isBase: input.isBase,
        coverageRuleCode: input.coverageRuleCode,
        insurerCodes: input.insurerCodes,
        benefits: input.benefits,
        packages: input.packages,
        packageRequestedTiers: input.packageRequestedTiers,
        tierResolution,
        premiums,
        scheduleItems,
      });

      return {
        scenarioId,
        tierResolution,
        premiums,
        scheduleItems,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotation_scenarios"] });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
    },
  });
}

export function useQuotationScenarios(quotationId: string) {
  return useQuery({
    queryKey: ["quotation_scenarios", quotationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotation_scenario")
        .select("*")
        .eq("quotation_id", quotationId)
        .order("scenario_number");

      if (error) throw error;
      return data;
    },
    enabled: !!quotationId,
  });
}

export function useScenarioDetails(scenarioId: string) {
  return useQuery({
    queryKey: ["scenario_details", scenarioId],
    queryFn: async () => {
      const [
        scenarioResult,
        packagesResult,
        offersResult,
        premiumDetailsResult,
        premiumSummariesResult,
        premiumOverallsResult,
        scheduleItemsResult,
      ] = await Promise.all([
        supabase.from("quotation_scenario").select("*").eq("scenario_id", scenarioId).single(),
        supabase.from("quotation_scenario_package").select(`
          *,
          package:quotation_package(*, census:quotation_package_census(*))
        `).eq("scenario_id", scenarioId),
        supabase.from("quotation_scenario_offer").select("*").eq("scenario_id", scenarioId),
        supabase.from("quotation_scenario_premium_detail").select("*").eq("scenario_id", scenarioId),
        supabase.from("quotation_scenario_premium_summary").select("*").eq("scenario_id", scenarioId),
        supabase.from("quotation_scenario_premium_overall").select("*").eq("scenario_id", scenarioId),
        supabase.from("quotation_scenario_schedule_item").select("*").eq("scenario_id", scenarioId).order("display_order"),
      ]);

      if (scenarioResult.error) throw scenarioResult.error;

      return {
        scenario: scenarioResult.data,
        packages: packagesResult.data || [],
        offers: offersResult.data || [],
        premiumDetails: premiumDetailsResult.data || [],
        premiumSummaries: premiumSummariesResult.data || [],
        premiumOveralls: premiumOverallsResult.data || [],
        scheduleItems: scheduleItemsResult.data || [],
      };
    },
    enabled: !!scenarioId,
  });
}

export function useQuotationRevisions(quotationId: string) {
  return useQuery({
    queryKey: ["quotation_revisions", quotationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotation_revision")
        .select(`
          *,
          scenario:quotation_scenario(scenario_name)
        `)
        .eq("quotation_id", quotationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!quotationId,
  });
}
