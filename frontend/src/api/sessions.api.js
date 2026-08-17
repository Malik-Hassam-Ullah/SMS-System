import api from '../lib/api';

export const getSessions = async () => {
  const response = await api.get('/sessions');
  return response.data;
};

export const createSession = async (data) => {
  const response = await api.post('/sessions', data);
  return response.data;
};

export const updateSession = async (id, data) => {
  const response = await api.put(`/sessions/${id}`, data);
  return response.data;
};
