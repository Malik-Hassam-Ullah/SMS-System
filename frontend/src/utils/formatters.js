export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '';
  return `PKR ${Number(amount).toLocaleString('en-PK')}`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatMonth = (yearMonth) => {
  if (!yearMonth) return '';
  const [year, month] = yearMonth.split('-');
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric'
  });
};

export const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const truncate = (str, n) => {
  if (!str) return '';
  return str.length > n ? str.substr(0, n - 1) + '...' : str;
};

export const getGradeFromPercentage = (pct) => {
  if (pct === null || pct === undefined) return '-';
  const p = Number(pct);
  if (p >= 90) return 'A+';
  if (p >= 80) return 'A';
  if (p >= 70) return 'B';
  if (p >= 60) return 'C';
  if (p >= 50) return 'D';
  return 'F';
};
