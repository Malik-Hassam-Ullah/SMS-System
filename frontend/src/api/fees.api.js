import api from '../lib/api';

export const getFeeStructures = async () => {
  const response = await api.get('/fees/structures');
  return response.data;
};

export const createFeeStructure = async (data) => {
  const response = await api.post('/fees/structures', data);
  return response.data;
};

export const getVouchers = async (params) => {
  const response = await api.get('/fees/vouchers', { params });
  return response.data;
};

export const getVoucher = async (id) => {
  const response = await api.get(`/fees/vouchers/${id}`);
  return response.data;
};

export const createVoucher = async (data) => {
  const response = await api.post('/fees/vouchers', data);
  return response.data;
};

export const createBulkVouchers = async (data) => {
  const response = await api.post('/fees/vouchers/bulk', data);
  return response.data;
};

export const deleteVoucher = async (id) => {
  const response = await api.delete(`/fees/vouchers/${id}`);
  return response.data;
};

export const getPayments = async (params) => {
  const response = await api.get('/fees/payments', { params });
  return response.data;
};

export const recordPayment = async (data) => {
  const response = await api.post('/fees/payments', data);
  return response.data;
};

export const getOutstanding = async (params) => {
  const response = await api.get('/fees/outstanding', { params });
  return response.data;
};

export const getDailyReport = async (date) => {
  const response = await api.get(`/fees/reports/daily?date=${date}`);
  return response.data;
};

export const getMonthlySummary = async (year) => {
  const response = await api.get(`/fees/reports/monthly?year=${year}`);
  return response.data;
};
