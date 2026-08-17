import api from '../lib/api';

export const getMarks = async (params) => {
  const response = await api.get('/marks', { params });
  return response.data;
};

export const bulkSaveMarks = async (marks) => {
  const response = await api.post('/marks/bulk', { marks });
  return response.data;
};

export const updateMark = async (id, data) => {
  const response = await api.put(`/marks/${id}`, data);
  return response.data;
};

export const getStudentReport = async (studentId, examId) => {
  const response = await api.get(`/marks/report/student/${studentId}`, { params: { exam_id: examId } });
  return response.data;
};

export const getSectionReport = async (sectionId, examId) => {
  const response = await api.get(`/marks/report/section/${sectionId}`, { params: { exam_id: examId } });
  return response.data;
};
