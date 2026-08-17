import api from '../lib/api';

export const validateCertificate = async (studentId) => {
  const response = await api.get(`/certificates/validate/${studentId}`);
  return response.data;
};

export const generateCertificate = async (data) => {
  const response = await api.post('/certificates', data);
  return response.data;
};

export const getStudentCertificates = async (studentId) => {
  const response = await api.get(`/certificates/student/${studentId}`);
  return response.data;
};
