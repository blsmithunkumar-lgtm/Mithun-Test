import axiosClient from './axiosClient';

export const login = async (username, password) => {
  const { data } = await axiosClient.post('/auth/login', { username, password });
  return data.data; // { token, user }
};

export const getCurrentUser = async () => {
  const { data } = await axiosClient.get('/auth/me');
  return data.data.user;
};
