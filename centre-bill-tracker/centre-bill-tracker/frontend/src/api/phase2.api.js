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
