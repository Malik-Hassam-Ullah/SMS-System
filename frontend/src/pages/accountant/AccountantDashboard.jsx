import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, Activity, AlertCircle, Loader2, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';

export default function AccountantDashboard() {
  const { user } = useAuthStore();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/dashboard');
        if (response.data && response.data.success) {
          setDashboardData(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  const overview = dashboardData?.overview || {
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalVouchers: 0,
    todayCollection: 0,
    monthCollection: 0,
    totalOutstanding: 0
  };

  const feeStats = dashboardData?.feeStats || {
    paid: 0,
    unpaid: 0,
    partial: 0,
    overdue: 0
  };

  const totalVouchers = overview.totalVouchers || 0;
  const unpaidVouchers = feeStats.unpaid + feeStats.overdue + feeStats.partial;

  // Format monthly chart data
  const collectionTrend = dashboardData?.monthlyChart && dashboardData.monthlyChart.length > 0
    ? dashboardData.monthlyChart.map(item => {
      let name = item.month;
      try {
        const [year, month] = item.month.split('-');
        const date = new Date(year, parseInt(month) - 1, 1);
        name = date.toLocaleString('default', { month: 'short' });
      } catch (e) { }
      return { name, amount: item.amount };
    })
    : [
      { name: 'No Data', amount: 0 }
    ];

  // Format fee status breakdown data
  const feeBreakdownData = [
    { name: 'Paid', count: feeStats.paid },
    { name: 'Unpaid', count: feeStats.unpaid },
    { name: 'Partial', count: feeStats.partial },
    { name: 'Overdue', count: feeStats.overdue }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Accounts Overview
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1 uppercase tracking-wider">Welcome back, {user?.full_name?.split(' ')[0] || 'Accountant'}</p>
        </div>
      </div>

      {/* Vibrant Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card border-0 bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg shadow-emerald-500/30 overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider mb-1">Today's Collection</p>
              <h3 className="text-4xl font-black">{overview.todayCollection.toLocaleString()}</h3>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-100 bg-white/10 w-fit px-2 py-1 rounded-full">
            PKR collected today
          </div>
        </div>

        <div className="card border-0 bg-gradient-to-br from-rose-500 to-red-700 text-white shadow-lg shadow-rose-500/30 overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-rose-100 text-sm font-bold uppercase tracking-wider mb-1">Pending Dues</p>
              <h3 className="text-4xl font-black">{overview.totalOutstanding.toLocaleString()}</h3>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
              <AlertCircle className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-rose-100 bg-white/10 w-fit px-2 py-1 rounded-full">
            Needs attention
          </div>
        </div>

        <div className="card border-0 bg-gradient-to-br from-primary-500 to-accent-600 text-white shadow-lg shadow-primary-500/30 overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm font-bold uppercase tracking-wider mb-1">Active Vouchers</p>
              <h3 className="text-4xl font-black">{totalVouchers}</h3>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
              <FileText className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary-100 bg-white/10 w-fit px-2 py-1 rounded-full">
            Total issued vouchers
          </div>
        </div>

        <div className="card border-0 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-amber-100 text-sm font-bold uppercase tracking-wider mb-1">Unpaid Vouchers</p>
              <h3 className="text-4xl font-black">{unpaidVouchers}</h3>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20">
              <Activity className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-amber-100 bg-white/10 w-fit px-2 py-1 rounded-full">
            {totalVouchers > 0 ? ((unpaidVouchers / totalVouchers) * 100).toFixed(0) : 0}% of total
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-0 overflow-hidden bg-white/80 backdrop-blur-xl border border-white/60 shadow-premium">
          <div className="p-6 border-b border-slate-100/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <Wallet className="text-emerald-500 w-5 h-5" /> Voucher Status Breakdown
            </h3>
          </div>
          <div className="p-6 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feeBreakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="count" name="Vouchers" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-0 overflow-hidden bg-white/80 backdrop-blur-xl border border-white/60 shadow-premium">
          <div className="p-6 border-b border-slate-100/50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <TrendingUp className="text-primary-500 w-5 h-5" /> Monthly Collection Trend
            </h3>
          </div>
          <div className="p-6 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={collectionTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`PKR ${value.toLocaleString()}`, 'Amount']}
                />
                <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={4} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
