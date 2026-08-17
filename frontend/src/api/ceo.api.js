import api from '../lib/api';

export const verifyPassword = async (password) => {
  const response = await api.post('/ceo/verify-password', { password });
  return response.data;
};

export const getDashboardStats = async () => {
  const response = await api.get('/ceo/dashboard-stats');
  return response.data;
};

export const getSchool = async () => {
  const response = await api.get('/ceo/school');
  return response.data;
};

export const updateSchool = async (data) => {
  const response = await api.put('/ceo/school', data);
  return response.data;
};

export const getBranches = async () => {
  const response = await api.get('/ceo/branches');
  return response.data;
};

export const createBranch = async (data) => {
  const response = await api.post('/ceo/branches', data);
  return response.data;
};

export const updateBranch = async (id, data) => {
  const response = await api.put(`/ceo/branches/${id}`, data);
  return response.data;
};

export const deleteBranch = async (id) => {
  const response = await api.delete(`/ceo/branches/${id}`);
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get('/ceo/users');
  return response.data;
};

export const createUser = async (data) => {
  const response = await api.post('/ceo/users', data);
  return response.data;
};

export const updateUser = async (id, data) => {
  const response = await api.put(`/ceo/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/ceo/users/${id}`);
  return response.data;
};

export const getBranchClasses = async (id) => {
  const response = await api.get(`/ceo/branches/${id}/classes`);
  return response.data;
};

export const getBranchSubjects = async (id) => {
  const response = await api.get(`/ceo/branches/${id}/subjects`);
  return response.data;
};

export const getBranchSessions = async (id) => {
  const response = await api.get(`/ceo/branches/${id}/sessions`);
  return response.data;
};
