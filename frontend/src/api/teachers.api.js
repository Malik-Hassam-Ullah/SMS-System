import api from '../lib/api';

export const getTeachers = async () => {
  const response = await api.get('/teachers');
  return response.data;
};

export const getTeacher = async (id) => {
  const response = await api.get(`/teachers/${id}`);
  return response.data;
};

export const createTeacher = async (data) => {
  const response = await api.post('/teachers', data);
  return response.data;
};

export const updateTeacher = async (id, data) => {
  const response = await api.put(`/teachers/${id}`, data);
  return response.data;
};

export const saveAssignments = async (teacherId, assignments) => {
  const response = await api.post(`/teachers/${teacherId}/assignments`, { assignments });
  return response.data;
};
