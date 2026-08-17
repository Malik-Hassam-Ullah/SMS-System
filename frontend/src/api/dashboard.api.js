import api from '../lib/api';

export const getDashboardData = async () => {
  const response = await api.get('/dashboard');
  return response.data;
};
