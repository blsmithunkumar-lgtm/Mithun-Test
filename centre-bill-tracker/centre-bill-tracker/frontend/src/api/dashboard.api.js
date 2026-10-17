import axiosClient from './axiosClient';

export const getSummary = async () => {
  const { data } = await axiosClient.get('/dashboard/summary');
  return data.data;
};

export const getLatestBills = async () => {
  const { data } = await axiosClient.get('/dashboard/latest-bills');
  return data.data.bills;
};

export const getFinanceSummary = async () => {
  const { data } = await axiosClient.get('/dashboard/finance-summary');
  return data.data;
};
