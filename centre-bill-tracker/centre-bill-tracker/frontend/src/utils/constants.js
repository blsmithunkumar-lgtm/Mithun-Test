export const ROLES = {
  ADMIN: 'Admin',
  OPERATIONS: 'Operations',
};

export const BILL_STATUS = {
  PENDING: 'Pending',
  RECEIVED: 'Received',
  PAID: 'Paid',
};

export const CENTRE_STATUS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

// Order matters here - it mirrors the SRD's enforced status flow
// (Pending -> Received -> Paid) and is used to compute the single
// legal "next status" for a bill.
export const BILL_STATUS_ORDER = [BILL_STATUS.PENDING, BILL_STATUS.RECEIVED, BILL_STATUS.PAID];
