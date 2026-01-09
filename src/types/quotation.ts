export type QuotationStatus = 'draft' | 'review' | 'approved' | 'locked';

export type BenefitType = 'inPatient' | 'outPatient' | 'dental' | 'maternity';

export interface MemberBreakdown {
  male0to59: number;
  female0to59: number;
  child0to59: number;
  male60to64: number;
  female60to64: number;
}

export interface InsuredGroup {
  id: string;
  planName: string;
  members: MemberBreakdown;
}

export type BenefitsOption = 
  | 'inner_limit_all'
  | 'inner_limit_ip_ma_as_charge_op_de'
  | 'semi_as_charge_ip_inner_limit_ma_as_charge_op_de'
  | 'as_charge_ip_op_de_inner_limit_ma';

export const BENEFITS_OPTIONS_LABELS: Record<BenefitsOption, string> = {
  'inner_limit_all': 'Inner Limit For All Benefits',
  'inner_limit_ip_ma_as_charge_op_de': 'Inner Limit for In-Patients and Maternity, Outpatient and Dentals As Charge',
  'semi_as_charge_ip_inner_limit_ma_as_charge_op_de': 'Semi As Charge for In-Patients, Maternity Inner Limit, Outpatient and Dentals As Charge',
  'as_charge_ip_op_de_inner_limit_ma': 'As Charge For In-Patients, Outpatient and Dentals, Maternity Inner Limit',
};

export interface QuotationData {
  id: string;
  // Insured Information
  insuredName: string;
  insuredAddress: string;
  
  // Policy Period
  startDate: Date;
  endDate: Date;

  // Benefits Option
  benefitsOption: BenefitsOption;
  
  // Benefits
  benefits: {
    inPatient: boolean;
    outPatient: boolean;
    dental: boolean;
    maternity: boolean;
  };
  
  // Insured Groups
  insuredGroups: InsuredGroup[];
  
  // Status & Metadata
  status: QuotationStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
}

export interface AuditLogEntry {
  id: string;
  quotationId: string;
  action: 'created' | 'modified' | 'status_changed' | 'pdf_generated' | 'approved';
  description: string;
  performedBy: string;
  performedAt: Date;
  previousValue?: string;
  newValue?: string;
}

export type UserRole = 'sales' | 'placement' | 'supervisor' | 'admin' | 'audit';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
