import api from '../lib/api';

export const getAttendance = async (params) => {
  const response = await api.get('/attendance', { params });
  return response.data;
};

export const markBulkAttendance = async (records) => {
  const response = await api.post('/attendance/bulk', { records });
  return response.data;
};

export const getAttendanceReport = async (params) => {
  const response = await api.get('/attendance/report', { params });
  return response.data;
};
