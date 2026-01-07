export type QuotationStatus = 'draft' | 'review' | 'approved' | 'locked';

export type BenefitType = 'inPatient' | 'outPatient' | 'dental' | 'maternity';

export interface InsuredGroup {
  id: string;
  planName: string;
  numberOfMembers: number;
}

export interface QuotationData {
  id: string;
  // Insured Information
  insuredName: string;
  insuredAddress: string;
  
  // Policy Period
  startDate: Date;
  endDate: Date;
  
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
