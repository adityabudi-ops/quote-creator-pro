// Scenario types for quotation workflow
export type ScenarioStatus = "draft" | "resolved" | "finalized";

export interface Scenario {
  scenarioId: string;
  quotationId: string;
  scenarioNumber: number;
  scenarioName: string;
  isBase: boolean;
  coverageRuleCode: string;
  insuranceCompanies: string[];
  benefits: {
    inPatient: boolean;
    outPatient: boolean;
    dental: boolean;
    maternity: boolean;
  };
  status: ScenarioStatus;
  revision: number;
  parentRevisionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScenarioPackage {
  id: string;
  scenarioId: string;
  packageId: string;
}

export interface ScenarioRequestedTier {
  id: string;
  scenarioId: string;
  packageId: string;
  sectionCode: string;
  requestedTierCode: string | null;
}

export interface ScenarioOffer {
  offerId: string;
  scenarioId: string;
  packageId: string;
  insurerCode: string;
  sectionCode: string;
  offeredTierCode: string | null;
  status: "QUOTED" | "NA" | "ERROR";
  notes?: string;
  templateIdUsed?: string;
  pricingEffectiveDateUsed?: string;
}

export interface ScenarioPremiumDetail {
  id: string;
  scenarioId: string;
  packageId: string;
  insurerCode: string;
  sectionCode: string;
  demographic: string;
  lives: number;
  annualPremiumPerMember: number;
  annualPremiumTotal: number;
}

export interface ScenarioPremiumSummary {
  id: string;
  scenarioId: string;
  packageId: string;
  insurerCode: string;
  grossPremiumPackage: number;
  feesPackage: number;
  taxPackage: number;
}

export interface ScenarioPremiumOverall {
  id: string;
  scenarioId: string;
  insurerCode: string;
  grossTotalAllPackages: number;
  adminFee: number;
  stampDuty: number;
  vatAmount: number;
  grandTotal: number;
}

export interface ScenarioScheduleItem {
  id: string;
  scenarioId: string;
  packageId: string;
  insurerCode: string;
  sectionCode: string;
  itemCode: string;
  itemName: string;
  subLabel?: string;
  isGroupHeader: boolean;
  displayOrder: number;
  valueType: "AMOUNT" | "TEXT" | "BOOLEAN" | "NONE";
  valueAmount?: number;
  valueText?: string;
  currency?: string;
  limitPeriod?: string;
  unitText?: string;
}

export interface QuotationRevision {
  revisionId: string;
  quotationId: string;
  scenarioId: string;
  revisionNumber: number;
  changeDescription?: string;
  changedBy?: string;
  createdAt: Date;
  snapshotData?: any;
}

// Form state for scenario creation/editing
export interface ScenarioFormState {
  scenarioName: string;
  coverageRuleCode: string;
  insuranceCompanies: string[];
  benefits: {
    inPatient: boolean;
    outPatient: boolean;
    dental: boolean;
    maternity: boolean;
  };
  packageRequestedTiers: {
    packageId: string;
    tiers: { sectionCode: string; tierCode: string | null }[];
  }[];
}
