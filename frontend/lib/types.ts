export interface Account {
  id: string;
  customerId: string;
  currentBalance: number;
}

export type ChequeStatus = 'ACTIVE' | 'REDEEMED' | 'VOID' | 'EXPIRED';

export interface Cheque {
  id: string;
  accountId: string;
  value: string;
  issueDate: string;
  expiryDate: string;
  status: ChequeStatus;
  redemptionOrderId: string | null;
  redeemedAt: string | null;
  voidReason: string | null;
}

export interface Transaction {
  id: string;
  accountId: string;
  type: 'PURCHASE' | 'RETURN' | 'REDEMPTION' | 'ADJUSTMENT';
  amount: string;
  description: string | null;
  createdAt: string;
}

export interface Promotion {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  priority: number;
  active: boolean;
}

export interface PointsEngineConfig {
  id: string;
  version: number;
  earnRatio: string;
  chequeThresholdPoints: number;
  chequeValue: string;
  chequeExpiryDays: number;
  exclusions: string[];
}

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
  user?: { email: string; role: string } | null;
}

export interface DashboardStats {
  activeCustomers: number;
  pointsIssued: number;
  chequesIssued: number;
  chequesRedeemed: number;
  redemptionRate: number;
  activePromotions: number;
}
