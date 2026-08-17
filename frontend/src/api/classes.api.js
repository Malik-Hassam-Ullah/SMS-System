import api from '../lib/api';

export const getClasses = async () => {
  const response = await api.get('/classes');
  return response.data;
};

export const createClass = async (data) => {
  const response = await api.post('/classes', data);
  return response.data;
};

export const updateClass = async (id, data) => {
  const response = await api.put(`/classes/${id}`, data);
  return response.data;
};

export const deleteClass = async (id) => {
  const response = await api.delete(`/classes/${id}`);
  return response.data;
};

export const getSections = async () => {
  const response = await api.get('/classes/sections/all');
  return response.data;
};

export const createSection = async (data) => {
  const response = await api.post('/sections', data);
  return response.data;
};

export const deleteSection = async (id) => {
  const response = await api.delete(`/sections/${id}`);
  return response.data;
};
