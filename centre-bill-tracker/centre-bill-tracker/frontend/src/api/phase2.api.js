import axiosClient from './axiosClient';

const unwrap = (promise) => promise.then((response) => response.data.data);

export const getBreakdown = (billId) => unwrap(axiosClient.get(`/phase2/bills/${billId}/breakdown`));
export const saveBreakdown = (billId, items) => unwrap(axiosClient.put(`/phase2/bills/${billId}/breakdown`, { items }));
export const getPayments = (billId) => unwrap(axiosClient.get(`/phase2/bills/${billId}/payments`));
export const recordPayment = (billId, payment) => unwrap(axiosClient.post(`/phase2/bills/${billId}/payments`, payment));
export const getAttachments = (billId) => unwrap(axiosClient.get(`/phase2/bills/${billId}/attachments`));
export const uploadAttachment = (billId, file) => {
  const formData = new FormData();
  formData.append('invoice', file);
  return unwrap(axiosClient.post(`/phase2/bills/${billId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }));
};
export const downloadAttachment = (billId, attachmentId) => axiosClient.get(
  `/phase2/bills/${billId}/attachments/${attachmentId}`,
  { responseType: 'blob' },
);

export const getAmortization = (billId) => unwrap(axiosClient.get(`/phase2/bills/${billId}/amortization`));
export const saveAmortization = (billId, months, startMonth) => unwrap(axiosClient.put(`/phase2/bills/${billId}/amortization`, { months, startMonth }));
export const getApproval = (billId) => unwrap(axiosClient.get(`/phase2/bills/${billId}/approval`));
export const requestApproval = (billId, requestNote) => unwrap(axiosClient.post(`/phase2/bills/${billId}/approval`, { requestNote }));
export const reviewApproval = (billId, status, reviewNote) => unwrap(axiosClient.patch(`/phase2/bills/${billId}/approval`, { status, reviewNote }));
export const exportPaymentsCsv = () => axiosClient.get('/phase2/reports/payments.csv', { responseType: 'blob' });

export const exportBillReportCsv = () => axiosClient.get('/phase2/reports/bills.csv', { responseType: 'blob' });
export const getAuditLogs = (billId) => unwrap(axiosClient.get(`/phase2/bills/${billId}/audit`));
