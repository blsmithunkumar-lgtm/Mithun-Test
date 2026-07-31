import axiosClient from './axiosClient';

export const getBills = async ({ search, status, limit } = {}) => {
  const params = {};
  if (search) params.search = search;
  if (status) params.status = status;
  if (limit) params.limit = limit;
  const { data } = await axiosClient.get('/bills', { params });
  return data.data.bills;
};

export const createBill = async (payload) => {
  const { data } = await axiosClient.post('/bills', payload);
  return data.data.bill;
};

export const updateBill = async (id, payload) => {
  const { data } = await axiosClient.put(`/bills/${id}`, payload);
  return data.data.bill;
};

export const updateBillStatus = async (id, status) => {
  const { data } = await axiosClient.patch(`/bills/${id}/status`, { status });
  return data.data.bill;
};
