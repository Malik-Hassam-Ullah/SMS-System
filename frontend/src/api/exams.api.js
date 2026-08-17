import api from '../lib/api';

export const getExams = async (params) => {
  const response = await api.get('/exams', { params });
  return response.data;
};

export const createExam = async (data) => {
  const response = await api.post('/exams', data);
  return response.data;
};

export const updateExam = async (id, data) => {
  const response = await api.put(`/exams/${id}`, data);
  return response.data;
};

export const deleteExam = async (id) => {
  const response = await api.delete(`/exams/${id}`);
  return response.data;
};
