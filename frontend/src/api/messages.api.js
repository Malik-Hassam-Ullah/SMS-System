import api from '../lib/api';

export const getMessages = async () => {
  const response = await api.get('/messages');
  return response.data;
};

export const createMessage = async (data) => {
  const response = await api.post('/messages', data);
  return response.data;
};

export const sendMessage = async (id) => {
  const response = await api.post(`/messages/${id}/send`);
  return response.data;
};

export const getMessageRecipients = async (id) => {
  const response = await api.get(`/messages/${id}/recipients`);
  return response.data;
};
