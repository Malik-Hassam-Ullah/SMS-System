import api from '../lib/api';

export const getStudents = async (params) => {
  const response = await api.get('/students', { params });
  return response.data;
};

export const getStudent = async (id) => {
  const response = await api.get(`/students/${id}`);
  return response.data;
};

export const createStudent = async (data) => {
  const response = await api.post('/students', data);
  return response.data;
};

export const updateStudent = async (id, data) => {
  const response = await api.put(`/students/${id}`, data);
  return response.data;
};

export const deleteStudent = async (id) => {
  const response = await api.delete(`/students/${id}`);
  return response.data;
};

export const getStudentMarks = async (id) => {
  const response = await api.get(`/students/${id}/marks`);
  return response.data;
};

export const getStudentFees = async (id) => {
  const response = await api.get(`/students/${id}/fees`);
  return response.data;
};

export const getStudentAttendance = async (id, params) => {
  const response = await api.get(`/students/${id}/attendance`, { params });
  return response.data;
};

export const importStudents = async (formData, action = 'validate') => {
  const response = await api.post(`/import/students?action=${action}`, formData);
  return response.data;
};
