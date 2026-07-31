import axiosClient from './axiosClient';

export const getCentres = async ({ search, status } = {}) => {
  const params = {};
  if (search) params.search = search;
  if (status) params.status = status;
  const { data } = await axiosClient.get('/centres', { params });
  return data.data.centres;
};

export const createCentre = async (payload) => {
  const { data } = await axiosClient.post('/centres', payload);
  return data.data.centre;
};

export const updateCentre = async (id, payload) => {
  const { data } = await axiosClient.put(`/centres/${id}`, payload);
  return data.data.centre;
};

export const updateCentreStatus = async (id, status) => {
  const { data } = await axiosClient.patch(`/centres/${id}/status`, { status });
  return data.data.centre;
};

export const deleteCentre = async (id) => {
  await axiosClient.delete(`/centres/${id}`);
};
